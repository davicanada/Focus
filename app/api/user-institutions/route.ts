import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Retorna vínculos do usuário logado (com dados da instituição)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('user_institutions')
      .select(`
        id,
        user_id,
        institution_id,
        role,
        is_active,
        deleted_at,
        hidden_at,
        created_at,
        institution:institutions(id, name, city, state_code)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user institutions:', error);
      return NextResponse.json({ error: 'Erro ao buscar vínculos' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/user-institutions:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH - Atualiza hidden_at de um vínculo (ocultar/mostrar instituição)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id, hidden } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID do vínculo é obrigatório' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Verify ownership
    const { data: link } = await serviceClient
      .from('user_institutions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!link || link.user_id !== user.id) {
      return NextResponse.json({ error: 'Vínculo não encontrado' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('user_institutions')
      .update({ hidden_at: hidden ? new Date().toISOString() : null })
      .eq('id', id);

    if (error) {
      console.error('Error updating hidden_at:', error);
      return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/user-institutions:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
