import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/users/[id]/reactivate - Reativar usuário desligado
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
        { error: 'Apenas administradores podem reativar usuários' },
        { status: 403 }
      );
    }

    // Buscar dados do body (opcional: institution_id para reativar em instituição específica)
    const body = await request.json().catch(() => ({}));
    const { institution_id: targetInstitutionId } = body;

    // Verificar se o usuário existe
    const { data: targetUser, error: targetError } = await serviceClient
      .from('users')
      .select('id, full_name, email, is_active, is_master, deleted_at, deactivation_reason')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário está desligado
    if (targetUser.is_active) {
      return NextResponse.json(
        { error: 'Este usuário já está ativo' },
        { status: 400 }
      );
    }

    // Não permitir reativar master sem ser master
    if (targetUser.is_master && !isMaster) {
      return NextResponse.json(
        { error: 'Apenas um master pode reativar outro master' },
        { status: 403 }
      );
    }

    // Reativar o usuário
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        is_active: true,
        deleted_at: null,
        deactivation_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao reativar usuário:', updateError);
      return NextResponse.json(
        { error: 'Erro ao reativar usuário' },
        { status: 500 }
      );
    }

    // Determinar qual instituição reativar o vínculo
    const institutionToReactivate = targetInstitutionId || userInstitution?.institution_id;

    if (institutionToReactivate) {
      // Verificar se existe vínculo antigo com essa instituição
      const { data: existingLink } = await serviceClient
        .from('user_institutions')
        .select('id, role')
        .eq('user_id', userId)
        .eq('institution_id', institutionToReactivate)
        .single();

      if (existingLink) {
        // Reativar vínculo existente
        const { error: linkError } = await serviceClient
          .from('user_institutions')
          .update({
            is_active: true,
            deleted_at: null
          })
          .eq('id', existingLink.id);

        if (linkError) {
          console.error('Erro ao reativar vínculo:', linkError);
        }
      } else {
        // Criar novo vínculo como professor (role padrão para reativação)
        const { error: createError } = await serviceClient
          .from('user_institutions')
          .insert({
            user_id: userId,
            institution_id: institutionToReactivate,
            role: 'professor',
            is_active: true
          });

        if (createError) {
          console.error('Erro ao criar vínculo:', createError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Usuário ${targetUser.full_name} foi reativado com sucesso`,
      user: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        email: targetUser.email
      },
      previous_deactivation: {
        deleted_at: targetUser.deleted_at,
        reason: targetUser.deactivation_reason
      }
    });

  } catch (error) {
    console.error('Erro ao reativar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
