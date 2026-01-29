import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ChangeableRole = 'admin' | 'professor' | 'admin_viewer';

interface RoleChangeRequest {
  institution_id: string;
  new_role: ChangeableRole;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const body: RoleChangeRequest = await request.json();
    const { institution_id, new_role } = body;

    // Validar campos obrigatórios
    if (!institution_id || !new_role) {
      return NextResponse.json(
        { error: 'institution_id e new_role são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar new_role
    const validRoles: ChangeableRole[] = ['admin', 'professor', 'admin_viewer'];
    if (!validRoles.includes(new_role)) {
      return NextResponse.json(
        { error: 'Role inválido. Use: admin, professor ou admin_viewer' },
        { status: 400 }
      );
    }

    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const serviceClient = createServiceClient();

    // Verificar se o solicitante é master ou admin da instituição
    const { data: currentUser } = await serviceClient
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    const isMaster = currentUser?.is_master === true;

    // Se não for master, verificar se é admin da instituição
    if (!isMaster) {
      const { data: requesterInstitution } = await serviceClient
        .from('user_institutions')
        .select('role')
        .eq('user_id', user.id)
        .eq('institution_id', institution_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (requesterInstitution?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Apenas administradores podem alterar funções de usuários' },
          { status: 403 }
        );
      }
    }

    // Buscar o vínculo atual do usuário alvo
    const { data: targetUserInstitution, error: targetError } = await serviceClient
      .from('user_institutions')
      .select('id, role')
      .eq('user_id', targetUserId)
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (targetError || !targetUserInstitution) {
      return NextResponse.json(
        { error: 'Usuário não encontrado nesta instituição' },
        { status: 404 }
      );
    }

    const oldRole = targetUserInstitution.role;

    // Se a role já é a mesma, não fazer nada
    if (oldRole === new_role) {
      return NextResponse.json(
        { error: 'O usuário já possui esta função' },
        { status: 400 }
      );
    }

    // CONSTRAINT: Se está saindo de admin, verificar se há outros admins
    if (oldRole === 'admin' && new_role !== 'admin') {
      const { count: adminCount } = await serviceClient
        .from('user_institutions')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institution_id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .is('deleted_at', null);

      if ((adminCount || 0) <= 1) {
        return NextResponse.json(
          { error: 'Não é possível alterar. A instituição precisa de pelo menos 1 administrador.' },
          { status: 400 }
        );
      }
    }

    // Atualizar a role
    const { error: updateError } = await serviceClient
      .from('user_institutions')
      .update({ role: new_role })
      .eq('id', targetUserInstitution.id);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar função do usuário' },
        { status: 500 }
      );
    }

    // Registrar no system_logs
    await serviceClient.from('system_logs').insert({
      user_id: user.id,
      institution_id: institution_id,
      action: 'role_change',
      entity_type: 'user_institution',
      entity_id: targetUserInstitution.id,
      details: {
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: new_role,
        changed_by: user.id,
        timestamp: new Date().toISOString(),
      },
    });

    // Buscar nome do usuário para retorno
    const { data: targetUser } = await serviceClient
      .from('users')
      .select('full_name, email')
      .eq('id', targetUserId)
      .single();

    return NextResponse.json({
      success: true,
      message: `Função alterada de ${oldRole} para ${new_role}`,
      user: {
        id: targetUserId,
        full_name: targetUser?.full_name,
        email: targetUser?.email,
        old_role: oldRole,
        new_role: new_role,
      },
    });
  } catch (error) {
    console.error('Error in role change:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
