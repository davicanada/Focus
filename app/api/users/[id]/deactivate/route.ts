import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/users/[id]/deactivate - Desligar usuário (soft delete)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin ou master
    const { data: currentUser } = await serviceClient
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    const { data: userInstitution } = await serviceClient
      .from('user_institutions')
      .select('role, institution_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isAdmin = userInstitution?.role === 'admin';
    const isMaster = currentUser?.is_master === true;

    if (!isAdmin && !isMaster) {
      return NextResponse.json(
        { error: 'Apenas administradores podem desligar usuários' },
        { status: 403 }
      );
    }

    // Buscar dados do body
    const body = await request.json();
    const { reason } = body;

    // Verificar se o usuário existe
    const { data: targetUser, error: targetError } = await serviceClient
      .from('users')
      .select('id, full_name, email, is_active, is_master')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Não permitir desligar a si mesmo
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Você não pode desligar sua própria conta' },
        { status: 400 }
      );
    }

    // Não permitir desligar master (apenas outro master pode)
    if (targetUser.is_master && !isMaster) {
      return NextResponse.json(
        { error: 'Apenas um master pode desligar outro master' },
        { status: 403 }
      );
    }

    // Verificar se o usuário já está desligado
    if (!targetUser.is_active) {
      return NextResponse.json(
        { error: 'Este usuário já está desligado' },
        { status: 400 }
      );
    }

    // Se não é master, verificar se o usuário pertence à mesma instituição
    if (!isMaster && userInstitution) {
      const { data: targetInstitution } = await serviceClient
        .from('user_institutions')
        .select('institution_id')
        .eq('user_id', userId)
        .eq('institution_id', userInstitution.institution_id)
        .single();

      if (!targetInstitution) {
        return NextResponse.json(
          { error: 'Você só pode desligar usuários da sua instituição' },
          { status: 403 }
        );
      }
    }

    // Desligar o usuário (soft delete)
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deactivation_reason: reason || 'Desligado pelo administrador',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao desligar usuário:', updateError);
      return NextResponse.json(
        { error: 'Erro ao desligar usuário' },
        { status: 500 }
      );
    }

    // Desligar vínculos com instituições
    const { error: institutionError } = await serviceClient
      .from('user_institutions')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (institutionError) {
      console.error('Erro ao desligar vínculos:', institutionError);
    }

    return NextResponse.json({
      success: true,
      message: `Usuário ${targetUser.full_name} foi desligado com sucesso`,
      user: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        email: targetUser.email
      }
    });

  } catch (error) {
    console.error('Erro ao desligar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
