import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { FEEDBACK_ACTION_TYPES, LEGACY_ACTION_TYPES } from '@/lib/constants/feedback';
import { FeedbackActionType } from '@/types';

export const dynamic = 'force-dynamic';

// GET: Listar devolutivas de uma ocorrência
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: occurrenceId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar feedbacks com dados do performer
    const { data: feedbacks, error } = await supabase
      .from('occurrence_feedbacks')
      .select(`
        id,
        occurrence_id,
        action_type,
        description,
        performed_by,
        performed_at,
        created_at,
        performer:users!performed_by (
          id,
          full_name
        )
      `)
      .eq('occurrence_id', occurrenceId)
      .order('performed_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar feedbacks:', error);
      return NextResponse.json({ error: 'Erro ao buscar devolutivas' }, { status: 500 });
    }

    // Adicionar label do tipo de ação
    const feedbacksWithLabels = (feedbacks || []).map(fb => ({
      ...fb,
      action_label: FEEDBACK_ACTION_TYPES[fb.action_type as FeedbackActionType]?.label || LEGACY_ACTION_TYPES[fb.action_type]?.label || fb.action_type
    }));

    return NextResponse.json({ feedbacks: feedbacksWithLabels });

  } catch (error) {
    console.error('Erro na API de feedbacks:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Registrar nova devolutiva
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: occurrenceId } = await params;
    const supabase = await createClient();

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
        { error: 'Apenas administradores e visualizadores podem registrar devolutivas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action_type, description, mark_resolved } = body;

    if (!action_type) {
      return NextResponse.json(
        { error: 'Tipo de ação é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o tipo de ação existe no banco (padrão ou personalizado)
    const { data: validActionType } = await supabase
      .from('feedback_action_types')
      .select('id, name')
      .eq('institution_id', userInstitution.institution_id)
      .eq('name', action_type)
      .eq('is_active', true)
      .single();

    if (!validActionType) {
      return NextResponse.json(
        { error: 'Tipo de ação inválido' },
        { status: 400 }
      );
    }

    // Verificar se a ocorrência existe e pertence à mesma instituição
    const { data: occurrence, error: occError } = await supabase
      .from('occurrences')
      .select('id, institution_id, status')
      .eq('id', occurrenceId)
      .single();

    if (occError || !occurrence) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
    }

    if (occurrence.institution_id !== userInstitution.institution_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Inserir feedback
    const { data: feedback, error: insertError } = await supabase
      .from('occurrence_feedbacks')
      .insert({
        occurrence_id: occurrenceId,
        action_type,
        description: description || null,
        performed_by: user.id,
        performed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir feedback:', insertError);
      return NextResponse.json({ error: 'Erro ao registrar devolutiva' }, { status: 500 });
    }

    // Atualizar status da ocorrência
    let newStatus = occurrence.status;
    if (mark_resolved) {
      newStatus = 'resolved';
    } else if (occurrence.status === 'pending') {
      newStatus = 'in_progress';
    }

    if (newStatus !== occurrence.status) {
      // Usar service client para bypassa RLS no update de status
      const serviceClient = createServiceClient();
      const { error: updateError } = await serviceClient
        .from('occurrences')
        .update({ status: newStatus })
        .eq('id', occurrenceId);

      if (updateError) {
        console.error('Erro ao atualizar status da ocorrência:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      feedback: {
        ...feedback,
        action_label: FEEDBACK_ACTION_TYPES[action_type as FeedbackActionType]?.label || LEGACY_ACTION_TYPES[action_type]?.label
      },
      new_status: newStatus
    });

  } catch (error) {
    console.error('Erro na API de feedbacks:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
