import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Dados do relatório de devolutivas
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin ou viewer
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('role, institution_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('role', ['admin', 'viewer'])
      .single();

    if (!userInstitution) {
      return NextResponse.json(
        { error: 'Apenas administradores e visualizadores podem acessar este relatório' },
        { status: 403 }
      );
    }

    // Pegar ano do query param (default: ano atual)
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    // PASSO 1: Buscar contagens de status usando queries de count (evita limite de 1000)
    const [totalResult, pendingResult, inProgressResult, resolvedResult] = await Promise.all([
      supabase
        .from('occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', userInstitution.institution_id)
        .is('deleted_at', null)
        .gte('occurrence_date', startOfYear)
        .lte('occurrence_date', endOfYear),
      supabase
        .from('occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', userInstitution.institution_id)
        .is('deleted_at', null)
        .gte('occurrence_date', startOfYear)
        .lte('occurrence_date', endOfYear)
        .or('status.is.null,status.eq.pending'),
      supabase
        .from('occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', userInstitution.institution_id)
        .is('deleted_at', null)
        .gte('occurrence_date', startOfYear)
        .lte('occurrence_date', endOfYear)
        .eq('status', 'in_progress'),
      supabase
        .from('occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', userInstitution.institution_id)
        .is('deleted_at', null)
        .gte('occurrence_date', startOfYear)
        .lte('occurrence_date', endOfYear)
        .eq('status', 'resolved'),
    ]);

    const totalOccurrences = totalResult.count || 0;
    const byStatus = {
      pending: pendingResult.count || 0,
      in_progress: inProgressResult.count || 0,
      resolved: resolvedResult.count || 0
    };

    // PASSO 2: Buscar TODOS os feedbacks da instituição no ano (usando serviceClient para bypassar RLS)
    // Primeiro buscar os IDs das ocorrências da instituição no ano
    const { data: allFeedbacks, error: feedbackError } = await serviceClient
      .from('occurrence_feedbacks')
      .select(`
        id,
        occurrence_id,
        action_type,
        description,
        performed_at,
        performed_by
      `)
      .order('performed_at', { ascending: false });

    if (feedbackError) {
      console.error('Erro ao buscar feedbacks:', feedbackError);
    }

    // Agrupar feedbacks por occurrence_id
    const feedbacksByOccurrence = new Map<string, Array<{
      action_type: string;
      description: string | null;
      performed_at: string;
      performed_by: string | null;
    }>>();

    const feedbackCounts = new Map<string, { count: number; last_at: string | null }>();
    const occurrenceIdsWithFeedback = new Set<string>();

    allFeedbacks?.forEach((fb) => {
      occurrenceIdsWithFeedback.add(fb.occurrence_id);

      // Contar feedbacks
      const current = feedbackCounts.get(fb.occurrence_id);
      if (current) {
        feedbackCounts.set(fb.occurrence_id, {
          count: current.count + 1,
          last_at: current.last_at
        });
      } else {
        feedbackCounts.set(fb.occurrence_id, {
          count: 1,
          last_at: fb.performed_at
        });
      }

      // Armazenar detalhes
      const existing = feedbacksByOccurrence.get(fb.occurrence_id) || [];
      existing.push({
        action_type: fb.action_type,
        description: fb.description,
        performed_at: fb.performed_at,
        performed_by: fb.performed_by,
      });
      feedbacksByOccurrence.set(fb.occurrence_id, existing);
    });

    // PASSO 3: Buscar apenas as ocorrências que têm feedbacks (lista pequena)
    const occurrenceIdsArray = Array.from(occurrenceIdsWithFeedback);

    let occurrencesData: Array<{
      id: string;
      occurrence_date: string;
      student_name: string;
      class_name: string;
      occurrence_type: string;
      severity: string;
      status: string;
      registered_by_name: string;
      feedback_count: number;
      last_feedback_at: string | null;
      feedbacks: Array<{
        action_type: string;
        description: string | null;
        performed_at: string;
        performed_by_name: string | null;
      }>;
    }> = [];

    if (occurrenceIdsArray.length > 0) {
      // Buscar detalhes das ocorrências que têm feedbacks
      const { data: occurrences, error: occError } = await supabase
        .from('occurrences')
        .select(`
          id,
          occurrence_date,
          status,
          description,
          institution_id,
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
            category,
            severity
          ),
          registered_by_user:users!registered_by (
            id,
            full_name
          )
        `)
        .in('id', occurrenceIdsArray)
        .eq('institution_id', userInstitution.institution_id)
        .is('deleted_at', null)
        .gte('occurrence_date', startOfYear)
        .lte('occurrence_date', endOfYear)
        .order('occurrence_date', { ascending: false });

      if (occError) {
        console.error('Erro ao buscar ocorrências com feedbacks:', occError);
      }

      // Buscar nomes dos usuários que registraram feedbacks
      const performedByIds = new Set<string>();
      feedbacksByOccurrence.forEach((fbs) => {
        fbs.forEach((fb) => {
          if (fb.performed_by) performedByIds.add(fb.performed_by);
        });
      });

      const userNamesMap = new Map<string, string>();
      if (performedByIds.size > 0) {
        const { data: users } = await serviceClient
          .from('users')
          .select('id, full_name')
          .in('id', Array.from(performedByIds));

        users?.forEach((u) => {
          userNamesMap.set(u.id, u.full_name);
        });
      }

      // Montar dados das ocorrências
      occurrencesData = (occurrences || []).map((o) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const occ = o as any;
        const student = occ.student as { full_name: string; class: { name: string } | null } | null;
        const occType = occ.occurrence_type as { category: string; severity: string } | null;
        const registeredBy = occ.registered_by_user as { full_name: string } | null;
        const feedbackData = feedbackCounts.get(occ.id);
        const feedbacks = feedbacksByOccurrence.get(occ.id) || [];

        return {
          id: occ.id,
          occurrence_date: occ.occurrence_date,
          student_name: student?.full_name || 'Aluno não encontrado',
          class_name: student?.class?.name || '',
          occurrence_type: occType?.category || '',
          severity: occType?.severity || '',
          status: occ.status || 'pending',
          registered_by_name: registeredBy?.full_name || 'Usuário não encontrado',
          feedback_count: feedbackData?.count || 0,
          last_feedback_at: feedbackData?.last_at || null,
          feedbacks: feedbacks.map((fb) => ({
            action_type: fb.action_type,
            description: fb.description,
            performed_at: fb.performed_at,
            performed_by_name: fb.performed_by ? userNamesMap.get(fb.performed_by) || null : null,
          }))
        };
      });
    }

    // Calcular estatísticas de devolutivas
    const withFeedback = occurrencesData.length;
    const withoutFeedback = totalOccurrences - withFeedback;
    const responseRate = totalOccurrences > 0 ? Math.round((withFeedback / totalOccurrences) * 1000) / 10 : 0;

    return NextResponse.json({
      summary: {
        total_occurrences: totalOccurrences,
        with_feedback: withFeedback,
        without_feedback: withoutFeedback,
        response_rate: responseRate,
        by_status: byStatus
      },
      occurrences: occurrencesData,
      year
    });

  } catch (error) {
    console.error('Erro na API de relatório de devolutiva:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
