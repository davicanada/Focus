import { NextResponse } from 'next/server';
import { parseWithAI } from '@/lib/pdf/ai-parser';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pages } = body;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'Nenhuma página fornecida' }, { status: 400 });
    }

    const result = await parseWithAI(pages);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI parse error:', error);
    return NextResponse.json(
      { error: 'Erro ao analisar PDF com IA' },
      { status: 500 }
    );
  }
}
