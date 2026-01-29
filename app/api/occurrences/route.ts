import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateAlertRules } from '@/lib/alerts/evaluateRules';

export const dynamic = 'force-dynamic';

interface OccurrenceInput {
  institution_id: string;
  student_id: string;
  occurrence_type_id: string;
  registered_by: string;
  occurrence_date: string;
  description?: string | null;
}

// POST /api/occurrences - Registrar uma ou mais ocorrencias
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticacao
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const occurrences: OccurrenceInput[] = Array.isArray(body) ? body : [body];

    if (occurrences.length === 0) {
      return NextResponse.json({ error: 'Nenhuma ocorrencia fornecida' }, { status: 400 });
    }

    // Validar que o usuario tem permissao na instituicao
    const institutionId = occurrences[0].institution_id;
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .single();

    if (!userInstitution) {
      return NextResponse.json({ error: 'Acesso negado a esta instituicao' }, { status: 403 });
    }

    // Garantir que registered_by seja o usuario autenticado
    const sanitizedOccurrences = occurrences.map(occ => ({
      ...occ,
      registered_by: user.id,
    }));

    // Inserir ocorrencias
    const { data: insertedOccurrences, error: insertError } = await supabase
      .from('occurrences')
      .insert(sanitizedOccurrences)
      .select(`
        *,
        occurrence_type:occurrence_types(*)
      `);

    if (insertError) {
      console.error('Erro ao inserir ocorrencias:', insertError);
      return NextResponse.json({ error: 'Erro ao registrar ocorrencias' }, { status: 500 });
    }

    // Avaliar regras de alerta para cada ocorrencia criada
    // Fazemos isso em background para nao atrasar a resposta
    if (insertedOccurrences && insertedOccurrences.length > 0) {
      // Processar avaliacoes em paralelo, mas sem bloquear a resposta
      Promise.all(
        insertedOccurrences.map(occurrence =>
          evaluateAlertRules({
            occurrence,
            institutionId,
          }).catch(err => {
            console.error('Erro ao avaliar regras de alerta:', err);
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      count: insertedOccurrences?.length || 0,
      occurrences: insertedOccurrences,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/occurrences:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
