import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Resumo das devolutivas das ocorrências registradas pelo professor
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todas as ocorrências registradas pelo professor
    const { data: occurrences, error } = await supabase
      .from('occurrences')
      .select(`
        id,
        status,
        occurrence_date,
        student:students!student_id (
          id,
          full_name,
          class:classes!class_id (
            id,
            name
          )
        ),
        occurrence_type:occurrence_types!occurrence_type_id (
          id,
          category
        )
      `)
      .eq('registered_by', user.id)
      .is('deleted_at', null)
      .order('occurrence_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar ocorrências:', error);
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
    }

    // Calcular estatísticas (NULL é tratado como pending)
    const total = occurrences?.length || 0;
    const pending = occurrences?.filter(o => !o.status || o.status === 'pending').length || 0;
    const in_progress = occurrences?.filter(o => o.status === 'in_progress').length || 0;
    const resolved = occurrences?.filter(o => o.status === 'resolved').length || 0;

    // Buscar últimas atualizações (ocorrências que tiveram devolutiva recente)
    const occurrenceIds = occurrences?.map(o => o.id) || [];

    let recentUpdates: Array<{
      occurrence_id: string;
      student_name: string;
      class_name: string;
      occurrence_type: string;
      status: string;
      last_feedback_at: string | null;
      last_feedback_type: string | null;
    }> = [];

    if (occurrenceIds.length > 0) {
      // Buscar feedbacks mais recentes para cada ocorrência
      const { data: feedbacks } = await supabase
        .from('occurrence_feedbacks')
        .select('occurrence_id, action_type, performed_at')
        .in('occurrence_id', occurrenceIds)
        .order('performed_at', { ascending: false });

      // Agrupar por ocorrência (pegar apenas o mais recente)
      const latestFeedbackByOccurrence = new Map<string, { action_type: string; performed_at: string }>();
      feedbacks?.forEach(fb => {
        if (!latestFeedbackByOccurrence.has(fb.occurrence_id)) {
          latestFeedbackByOccurrence.set(fb.occurrence_id, {
            action_type: fb.action_type,
            performed_at: fb.performed_at
          });
        }
      });

      // Montar lista de atualizações recentes (últimas 5)
      const occurrencesWithFeedback = occurrences
        ?.filter(o => latestFeedbackByOccurrence.has(o.id) || o.status !== 'pending')
        .slice(0, 5)
        .map(o => {
          const latestFeedback = latestFeedbackByOccurrence.get(o.id);
          // Cast para unknown primeiro para evitar erro de tipo com joins do Supabase
          const student = o.student as unknown as { full_name: string; class: { name: string } | null } | null;
          const occType = o.occurrence_type as unknown as { category: string } | null;

          return {
            occurrence_id: o.id,
            student_name: student?.full_name || 'Aluno não encontrado',
            class_name: student?.class?.name || '',
            occurrence_type: occType?.category || '',
            status: o.status || 'pending',
            last_feedback_at: latestFeedback?.performed_at || null,
            last_feedback_type: latestFeedback?.action_type || null
          };
        }) || [];

      recentUpdates = occurrencesWithFeedback;
    }

    return NextResponse.json({
      total_occurrences: total,
      pending,
      in_progress,
      resolved,
      recent_updates: recentUpdates
    });

  } catch (error) {
    console.error('Erro na API de feedback-summary:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
