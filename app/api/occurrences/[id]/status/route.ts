import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { OccurrenceStatus } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: OccurrenceStatus[] = ['pending', 'in_progress', 'resolved'];

// PATCH /api/occurrences/[id]/status - Atualizar status (apenas admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: occurrenceId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('role, institution_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('role', ['admin', 'admin_viewer'])
      .single();

    if (!userInstitution) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar o status' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body as { status: OccurrenceStatus };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Verificar se a ocorrência pertence à instituição do admin
    const { data: occurrence, error: fetchError } = await supabase
      .from('occurrences')
      .select('id, institution_id')
      .eq('id', occurrenceId)
      .single();

    if (fetchError || !occurrence) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
    }

    if (occurrence.institution_id !== userInstitution.institution_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Atualizar status com service client (bypassa RLS)
    const serviceClient = createServiceClient();
    const { error: updateError } = await serviceClient
      .from('occurrences')
      .update({ status })
      .eq('id', occurrenceId);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Erro no PATCH /api/occurrences/[id]/status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
