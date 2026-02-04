import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Buscar tipo de ação específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: actionType, error } = await serviceClient
      .from('feedback_action_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !actionType) {
      return NextResponse.json({ error: 'Tipo de ação não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: actionType });

  } catch (error) {
    console.error('Erro ao buscar tipo de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT: Atualizar tipo de ação (apenas admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('role', 'admin')
      .single();

    if (!userInstitution) {
      return NextResponse.json(
        { error: 'Apenas administradores podem editar tipos de ação' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, icon, is_active, sort_order } = body;

    // Verificar se o tipo existe e pertence à instituição
    const serviceClient = createServiceClient();
    const { data: existingType } = await serviceClient
      .from('feedback_action_types')
      .select('*')
      .eq('id', id)
      .eq('institution_id', userInstitution.institution_id)
      .single();

    if (!existingType) {
      return NextResponse.json({ error: 'Tipo de ação não encontrado' }, { status: 404 });
    }

    // Atualizar
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (icon !== undefined) updateData.icon = icon;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data: updatedType, error } = await serviceClient
      .from('feedback_action_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um tipo de ação com este nome' },
          { status: 400 }
        );
      }
      console.error('Erro ao atualizar tipo de ação:', error);
      return NextResponse.json({ error: 'Erro ao atualizar tipo de ação' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedType });

  } catch (error) {
    console.error('Erro ao atualizar tipo de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Excluir tipo de ação (apenas admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('role', 'admin')
      .single();

    if (!userInstitution) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir tipos de ação' },
        { status: 403 }
      );
    }

    // Verificar se o tipo existe e pertence à instituição
    const serviceClient = createServiceClient();
    const { data: existingType } = await serviceClient
      .from('feedback_action_types')
      .select('*')
      .eq('id', id)
      .eq('institution_id', userInstitution.institution_id)
      .single();

    if (!existingType) {
      return NextResponse.json({ error: 'Tipo de ação não encontrado' }, { status: 404 });
    }

    // Verificar se existem feedbacks usando este tipo
    const { count: feedbackCount } = await serviceClient
      .from('occurrence_feedbacks')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', existingType.name);

    if (feedbackCount && feedbackCount > 0) {
      // Em vez de excluir, desativar
      const { error: updateError } = await serviceClient
        .from('feedback_action_types')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao desativar tipo de ação:', updateError);
        return NextResponse.json({ error: 'Erro ao desativar tipo de ação' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Tipo de ação desativado pois existem devolutivas usando-o',
        deactivated: true,
        feedbackCount
      });
    }

    // Excluir se não há dependências
    const { error } = await serviceClient
      .from('feedback_action_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir tipo de ação:', error);
      return NextResponse.json({ error: 'Erro ao excluir tipo de ação' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tipo de ação excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir tipo de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
