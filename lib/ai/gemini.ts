import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  SCHEMA_CONTEXT,
  EXPLANATION_PROMPT,
  extractSQL,
  validateSQL,
  getFallbackExplanation,
  SQLGenerationResult,
} from './shared';

// Get Gemini client - initialized at runtime to ensure env vars are available
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateSQLWithGemini(
  question: string,
  institutionId: string
): Promise<SQLGenerationResult> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `${SCHEMA_CONTEXT}

Pergunta do usuario: "${question}"

SQL:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlQuery = extractSQL(response.text());

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
    console.error('[Gemini] Error generating SQL:', error?.message || error);
    const errorMsg = error?.message || '';

    // Check for rate limit
    if (errorMsg.includes('quota') || errorMsg.includes('rate') || errorMsg.includes('429')) {
      return {
        query: '',
        error: 'Limite de requisicoes da API Gemini atingido.',
        isRateLimited: true,
      };
    }

    // Return more specific error messages
    if (errorMsg.includes('API_KEY') || errorMsg.includes('not configured')) {
      return {
        query: '',
        error: 'Chave da API Gemini nao configurada.',
      };
    }
    if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
      return {
        query: '',
        error: 'Modelo Gemini nao disponivel.',
        isRateLimited: true, // Treat as rate limited to trigger fallback
      };
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('ENOTFOUND')) {
      return {
        query: '',
        error: 'Erro de conexao com a API Gemini.',
        isRateLimited: true, // Treat as rate limited to trigger fallback
      };
    }
    if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('invalid')) {
      return {
        query: '',
        error: 'Chave da API Gemini invalida.',
      };
    }

    return {
      query: '',
      error: `Erro ao processar sua pergunta: ${errorMsg || 'Erro desconhecido'}`,
    };
  }
}

export async function explainResultsWithGemini(
  question: string,
  data: any[]
): Promise<string> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = EXPLANATION_PROMPT(question, data);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('[Gemini] Error explaining results:', error?.message || error);
    return getFallbackExplanation(data);
  }
}
