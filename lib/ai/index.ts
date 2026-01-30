import { generateSQLWithGemini, explainResultsWithGemini } from './gemini';
import { generateSQLWithGroq, explainResultsWithGroq } from './groq';
import {
  isSensitiveQuestion,
  getSensitiveDataResponse,
  isJudgmentalQuestion,
  getJudgmentalResponse,
  getFallbackExplanation,
  convertTimestampsToBrazilTime,
  AIProvider,
} from './shared';

export { isSensitiveQuestion, getSensitiveDataResponse, isJudgmentalQuestion, getJudgmentalResponse };

// Remove markdown formatting from text (convert to plain text)
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold **text**
    .replace(/__(.*?)__/g, '$1')       // Remove bold __text__
    .replace(/\*(.*?)\*/g, '$1')       // Remove italic *text*
    .replace(/_(.*?)_/g, '$1');        // Remove italic _text_
}

export interface AIAnalyticsResult {
  success: boolean;
  query?: string;
  error?: string;
  provider?: AIProvider;
  isSensitiveBlock?: boolean;
  isJudgmentalBlock?: boolean;
}

export interface ExplanationResult {
  explanation: string;
  provider: AIProvider;
}

/**
 * Generate SQL from a natural language question with automatic fallback
 * Gemini 3 Flash (primary) -> Groq Llama 3.3 70B (fallback)
 */
export async function generateSQL(
  question: string,
  institutionId: string
): Promise<AIAnalyticsResult> {
  // Check for judgmental/prejudicial questions about students (ECA Art. 17)
  if (isJudgmentalQuestion(question)) {
    return {
      success: true,
      isSensitiveBlock: true,
      isJudgmentalBlock: true,
    };
  }

  // Check for sensitive data requests (LGPD)
  if (isSensitiveQuestion(question)) {
    return {
      success: true,
      isSensitiveBlock: true,
    };
  }

  // Try Gemini first
  console.log('[AI] Trying Gemini...');
  const geminiResult = await generateSQLWithGemini(question, institutionId);

  if (geminiResult.query && !geminiResult.error) {
    console.log('[AI] Gemini succeeded');
    return {
      success: true,
      query: geminiResult.query,
      provider: 'gemini',
    };
  }

  // If Gemini failed due to rate limit or unavailability, try Groq
  if (geminiResult.isRateLimited) {
    console.log('[AI] Gemini rate limited, falling back to Groq...');

    try {
      const groqResult = await generateSQLWithGroq(question, institutionId);

      if (groqResult.query && !groqResult.error) {
        console.log('[AI] Groq succeeded');
        return {
          success: true,
          query: groqResult.query,
          provider: 'groq',
        };
      }

      // Groq also failed
      return {
        success: false,
        error: groqResult.error || 'Erro ao processar com Groq.',
        provider: 'groq',
      };
    } catch (error: any) {
      // Groq not configured or other error
      console.error('[AI] Groq fallback failed:', error?.message);

      // If Groq is not configured, return a friendly message
      if (error?.message?.includes('not configured')) {
        return {
          success: false,
          error: 'Limite de requisicoes atingido. Tente novamente em alguns minutos.',
        };
      }

      return {
        success: false,
        error: 'Servico de IA temporariamente indisponivel. Tente novamente em alguns minutos.',
      };
    }
  }

  // Gemini failed for other reasons (not rate limit)
  return {
    success: false,
    error: geminiResult.error || 'Erro ao processar sua pergunta.',
    provider: 'gemini',
  };
}

/**
 * Generate natural language explanation of results with automatic fallback
 * Strips markdown formatting to return plain text
 * Converts timestamps to Brazil time (UTC-3) before sending to AI
 */
export async function explainResults(
  question: string,
  data: any[]
): Promise<ExplanationResult> {
  // Convert timestamps to Brazil time before sending to AI
  // This ensures the AI sees and reports times correctly (UTC-3)
  const dataWithBrazilTime = convertTimestampsToBrazilTime(data);

  // Try Gemini first
  try {
    const explanation = await explainResultsWithGemini(question, dataWithBrazilTime);

    // Check if it's a fallback response (indicates Gemini failed)
    if (explanation === getFallbackExplanation(dataWithBrazilTime)) {
      throw new Error('Gemini returned fallback');
    }

    return {
      explanation: stripMarkdown(explanation),
      provider: 'gemini',
    };
  } catch {
    // Gemini failed, try Groq
    console.log('[AI] Gemini explanation failed, trying Groq...');

    try {
      const explanation = await explainResultsWithGroq(question, dataWithBrazilTime);
      return {
        explanation: stripMarkdown(explanation),
        provider: 'groq',
      };
    } catch {
      // Both failed, return fallback
      return {
        explanation: getFallbackExplanation(dataWithBrazilTime),
        provider: 'gemini',
      };
    }
  }
}
