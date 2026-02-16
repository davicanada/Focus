// AI-based PDF parser for non-SEDU-ES formats
// Uses Gemini (primary) / Groq (fallback) to interpret free-text PDF content

import type { ParseResult, ParsedClass, ParsedStudent } from './types';

const AI_PARSE_PROMPT = `Você é um assistente especializado em interpretar documentos escolares brasileiros.
Analise o texto extraído de um PDF e identifique turmas e alunos.

Para cada turma encontrada, extraia:
- turmaRaw: nome original da turma no PDF
- grade: número da série/ano (ex: "1", "2", "9")
- section: código da seção se houver (ex: "A", "B", "01")
- shift: turno ("matutino", "vespertino", "noturno" ou "integral")
- educationLevel: nível de ensino ("infantil", "fundamental_i" para 1º-5º, "fundamental_ii" para 6º-9º, "medio")
- name: nome formatado da turma (ex: "1º A", "9º B")

Para cada aluno, extraia:
- name: nome completo em MAIÚSCULAS
- registration: número de matrícula, ID ou código do aluno (se disponível, senão deixe vazio)

Responda APENAS com JSON válido no formato:
{
  "classes": [
    {
      "turmaRaw": "...",
      "grade": "...",
      "section": "...",
      "shift": "...",
      "educationLevel": "...",
      "name": "...",
      "students": [
        { "name": "...", "registration": "..." }
      ]
    }
  ],
  "warnings": ["..."]
}

Texto do PDF:
`;

interface AIResponse {
  classes: ParsedClass[];
  warnings?: string[];
}

async function callGemini(text: string): Promise<AIResponse> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // Truncate text to avoid token limits (keep first ~30k chars)
  const truncated = text.length > 30000 ? text.substring(0, 30000) + '\n...[truncado]' : text;

  const result = await model.generateContent(AI_PARSE_PROMPT + truncated);
  const response = await result.response;
  const responseText = response.text();

  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
  const jsonStr = jsonMatch[1]?.trim() || responseText.trim();

  return JSON.parse(jsonStr);
}

async function callGroq(text: string): Promise<AIResponse> {
  const Groq = (await import('groq-sdk')).default;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const groq = new Groq({ apiKey });

  const truncated = text.length > 30000 ? text.substring(0, 30000) + '\n...[truncado]' : text;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Você extrai dados estruturados de PDFs escolares. Responda APENAS com JSON válido.' },
      { role: 'user', content: AI_PARSE_PROMPT + truncated },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0]?.message?.content || '';
  return JSON.parse(responseText);
}

/**
 * Parse PDF text using AI (Gemini primary, Groq fallback).
 * This is a server-side function - call via API route.
 */
export async function parseWithAI(pages: string[]): Promise<ParseResult> {
  const fullText = pages.join('\n\n--- Página ---\n\n');
  const warnings: string[] = [];

  let aiResponse: AIResponse;

  try {
    aiResponse = await callGemini(fullText);
  } catch (geminiError) {
    console.warn('Gemini parse failed, trying Groq:', geminiError);
    warnings.push('Parser Gemini indisponível, usando Groq como fallback.');
    try {
      aiResponse = await callGroq(fullText);
    } catch (groqError) {
      console.error('Both AI parsers failed:', groqError);
      return {
        classes: [],
        totalStudents: 0,
        format: 'ai',
        warnings: ['Erro: ambos os parsers de IA falharam. Tente novamente ou use o formato SEDU-ES.'],
      };
    }
  }

  // Validate and normalize the response
  const classes: ParsedClass[] = (aiResponse.classes || []).map((c) => ({
    turmaRaw: c.turmaRaw || c.name || '',
    grade: c.grade || '',
    section: c.section || '',
    shift: c.shift || 'matutino',
    educationLevel: c.educationLevel || 'fundamental_i',
    name: c.name || `${c.grade}º ${c.section}`.trim(),
    students: (c.students || []).map((s) => ({
      name: (s.name || '').toUpperCase().trim(),
      registration: (s.registration || '').trim(),
    })).filter((s) => s.name.length > 0),
  }));

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

  return {
    classes,
    totalStudents,
    format: 'ai',
    warnings: [...warnings, ...(aiResponse.warnings || [])],
  };
}
