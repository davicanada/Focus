import { NextRequest, NextResponse } from 'next/server';
import { generateSQL, explainResults, getSensitiveDataResponse } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, institutionId } = body;

    if (!question || !institutionId) {
      return NextResponse.json(
        { success: false, error: 'Pergunta e ID da instituicao sao obrigatorios' },
        { status: 400 }
      );
    }

    // Generate SQL from the question (with automatic fallback Gemini -> OpenAI)
    const sqlResult = await generateSQL(question, institutionId);

    // If it's a sensitive data request, return natural response
    if (sqlResult.isSensitiveBlock) {
      return NextResponse.json({
        success: true,
        query: null,
        data: [],
        explanation: getSensitiveDataResponse(),
        isSensitiveBlock: true,
        provider: null,
      });
    }

    // If SQL generation failed
    if (!sqlResult.success || !sqlResult.query) {
      return NextResponse.json(
        {
          success: false,
          error: sqlResult.error || 'Nao foi possivel gerar a consulta',
          provider: sqlResult.provider,
        },
        { status: 400 }
      );
    }

    const query = sqlResult.query;

    // Execute the query using Supabase REST API with raw SQL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_ai_query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ query_text: query }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // If function doesn't exist, return the query for manual execution
      if (errorText.includes('function') || errorText.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          query,
          data: [],
          explanation: 'Execute a migration no Supabase SQL Editor para habilitar consultas AI.',
          needsSetup: true,
          provider: sqlResult.provider,
        });
      }

      console.error('Query execution error:', errorText);
      return NextResponse.json(
        { success: false, error: `Erro ao executar consulta: ${errorText}`, query },
        { status: 500 }
      );
    }

    const data = await response.json();
    const dataArray = Array.isArray(data) ? data : [data];

    // Get AI explanation of results (with automatic fallback)
    const { explanation, provider: explainProvider } = await explainResults(question, dataArray);

    return NextResponse.json({
      success: true,
      query,
      data: dataArray,
      explanation,
      provider: sqlResult.provider,
    });
  } catch (error) {
    console.error('AI Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
