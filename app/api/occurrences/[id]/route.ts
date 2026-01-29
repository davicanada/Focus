import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
