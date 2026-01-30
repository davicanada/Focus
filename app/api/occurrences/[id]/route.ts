import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DELETION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 horas

// PUT - Atualizar ocorrência (apenas o professor que registrou)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { occurrence_type_id, occurrence_date, description } = await request.json();
    const { id: occurrenceId } = await params;

    // Validação de campos obrigatórios
    if (!occurrence_type_id) {
      return NextResponse.json({ error: 'Tipo de ocorrência obrigatório' }, { status: 400 });
    }
    if (!occurrence_date) {
      return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar ocorrência e verificar ownership
    const { data: occurrence, error: fetchError } = await supabase
      .from('occurrences')
      .select('id, registered_by')
      .eq('id', occurrenceId)
      .single();

    if (fetchError || !occurrence) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário é o dono da ocorrência
    if (occurrence.registered_by !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para editar esta ocorrência' }, { status: 403 });
    }

    // Verificar se o tipo de ocorrência existe
    const { data: occurrenceType, error: typeError } = await supabase
      .from('occurrence_types')
      .select('id')
      .eq('id', occurrence_type_id)
      .eq('is_active', true)
      .single();

    if (typeError || !occurrenceType) {
      return NextResponse.json({ error: 'Tipo de ocorrência inválido' }, { status: 400 });
    }

    // Atualizar ocorrência (RLS também protege este update)
    const { error: updateError } = await supabase
      .from('occurrences')
      .update({
        occurrence_type_id,
        occurrence_date,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', occurrenceId);

    if (updateError) {
      console.error('Error updating occurrence:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar ocorrência' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating occurrence:', error);
    return NextResponse.json({ error: 'Erro ao atualizar ocorrência' }, { status: 500 });
  }
}

// DELETE - Soft delete de ocorrência (professor, dentro de 48h)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: occurrenceId } = await params;
    const supabase = await createClient();

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar ocorrência com service client (bypassa RLS)
    const serviceClient = createServiceClient();
    const { data: occurrence, error: fetchError } = await serviceClient
      .from('occurrences')
      .select('id, registered_by, created_at, deleted_at')
      .eq('id', occurrenceId)
      .single();

    if (fetchError || !occurrence) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
    }

    // Verificar se já foi excluída
    if (occurrence.deleted_at) {
      return NextResponse.json({ error: 'Ocorrência já foi excluída' }, { status: 400 });
    }

    // Verificar ownership
    if (occurrence.registered_by !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta ocorrência' }, { status: 403 });
    }

    // Verificar janela de 48h
    const createdAt = new Date(occurrence.created_at).getTime();
    const now = Date.now();
    if (now - createdAt > DELETION_WINDOW_MS) {
      return NextResponse.json({ error: 'Prazo de 48 horas para exclusão expirado' }, { status: 403 });
    }

    // Soft delete via service client
    const { error: deleteError } = await serviceClient
      .from('occurrences')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', occurrenceId);

    if (deleteError) {
      console.error('Error deleting occurrence:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir ocorrência' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting occurrence:', error);
    return NextResponse.json({ error: 'Erro ao excluir ocorrência' }, { status: 500 });
  }
}
