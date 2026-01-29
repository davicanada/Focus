import Groq from 'groq-sdk';
import {
  SCHEMA_CONTEXT,
  EXPLANATION_PROMPT,
  extractSQL,
  validateSQL,
  getFallbackExplanation,
  SQLGenerationResult,
} from './shared';

// Get Groq client - initialized at runtime to ensure env vars are available
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }
  return new Groq({ apiKey });
}

export async function generateSQLWithGroq(
  question: string,
  institutionId: string
): Promise<SQLGenerationResult> {
  try {
    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: SCHEMA_CONTEXT,
        },
        {
          role: 'user',
          content: `Pergunta do usuario: "${question}"\n\nSQL:`,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    let sqlQuery = extractSQL(content);

    // Replace placeholder with actual institution ID
    sqlQuery = sqlQuery.replace(/\{\{INSTITUTION_ID\}\}/g, institutionId);

    // Validate the query
    const validation = validateSQL(sqlQuery);
    if (!validation.valid) {
      return {
        query: '',
        error: validation.error,
      };
    }

    return { query: sqlQuery };
  } catch (error: any) {
    console.error('[Groq] Error generating SQL:', error?.message || error);
    const errorMsg = error?.message || '';

    // Check for rate limit
    if (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('quota')) {
      return {
        query: '',
        error: 'Limite de requisicoes da API Groq atingido.',
        isRateLimited: true,
      };
    }

    // Return more specific error messages
    if (errorMsg.includes('API_KEY') || errorMsg.includes('not configured') || errorMsg.includes('Invalid API Key')) {
      return {
        query: '',
        error: 'Chave da API Groq nao configurada ou invalida.',
      };
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('ENOTFOUND')) {
      return {
        query: '',
        error: 'Erro de conexao com a API Groq.',
      };
    }

    return {
      query: '',
      error: `Erro ao processar sua pergunta com Groq: ${errorMsg || 'Erro desconhecido'}`,
    };
  }
}

export async function explainResultsWithGroq(
  question: string,
  data: any[]
): Promise<string> {
  try {
    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: EXPLANATION_PROMPT(question, data),
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content?.trim() || getFallbackExplanation(data);
  } catch (error: any) {
    console.error('[Groq] Error explaining results:', error?.message || error);
    return getFallbackExplanation(data);
  }
}
