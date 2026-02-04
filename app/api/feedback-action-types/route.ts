import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Listar tipos de ação de devolutiva da instituição
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar instituição do usuário
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('role', ['admin', 'viewer', 'professor'])
      .single();

    if (!userInstitution) {
      return NextResponse.json(
        { error: 'Usuário não pertence a nenhuma instituição' },
        { status: 403 }
      );
    }

    // Buscar tipos de ação
    const serviceClient = createServiceClient();
    const { data: actionTypes, error } = await serviceClient
      .from('feedback_action_types')
      .select('*')
      .eq('institution_id', userInstitution.institution_id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Erro ao buscar tipos de ação:', error);
      return NextResponse.json({ error: 'Erro ao buscar tipos de ação' }, { status: 500 });
    }

    return NextResponse.json({
      data: actionTypes || [],
      count: actionTypes?.length || 0
    });

  } catch (error) {
    console.error('Erro na API de tipos de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Criar novo tipo de ação (apenas admin)
export async function POST(request: NextRequest) {
  try {
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
        { error: 'Apenas administradores podem criar tipos de ação' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // Buscar maior sort_order para colocar no final
    const serviceClient = createServiceClient();
    const { data: lastType } = await serviceClient
      .from('feedback_action_types')
      .select('sort_order')
      .eq('institution_id', userInstitution.institution_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = (lastType?.sort_order || 0) + 1;

    // Criar tipo de ação
    const { data: newType, error } = await serviceClient
      .from('feedback_action_types')
      .insert({
        institution_id: userInstitution.institution_id,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || 'MessageCircle',
        sort_order: newSortOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um tipo de ação com este nome' },
          { status: 400 }
        );
      }
      console.error('Erro ao criar tipo de ação:', error);
      return NextResponse.json({ error: 'Erro ao criar tipo de ação' }, { status: 500 });
    }

    return NextResponse.json({ data: newType }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de tipos de ação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
