import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/sendVerificationEmail';
import { generateSecurePassword, reactivateUser, findInactiveUserInstitution, findActiveUserInstitution } from '@/lib/reactivate-user';

export const dynamic = 'force-dynamic';

// GET - Listar usuários de uma instituição (professores ou todos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get('institution_id');
    const includeAllRoles = searchParams.get('include_all_roles') === 'true';
    const includeInactive = searchParams.get('include_inactive') === 'true';

    if (!institutionId) {
      return NextResponse.json({ error: 'institution_id é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Buscar usuários com dados do usuário
    let query = supabase
      .from('user_institutions')
      .select(`
        id,
        user_id,
        role,
        is_active,
        created_at,
        user:users(*)
      `)
      .eq('institution_id', institutionId);

    if (!includeInactive) {
      query = query.is('deleted_at', null);
    }

    // Se não incluir todos os roles, filtrar apenas professores
    if (!includeAllRoles) {
      query = query.eq('role', 'professor');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/teachers:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    const { full_name, email, institution_id, role, reactivate } = await request.json();
    const validRoles = ['admin', 'professor', 'admin_viewer'];
    const userRole = validRoles.includes(role) ? role : 'professor';

    // Validar dados
    if (!full_name || !email || !institution_id) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();
    if (authError || !caller) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabaseAdmin = createServiceClient();

    // Verificar se email ja existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    let userId: string;
    let tempPassword: string | null = null;

    if (existingUser) {
      // User exists — check if already linked (active) to this institution
      const activeLink = await findActiveUserInstitution(supabaseAdmin, {
        userId: existingUser.id,
        institutionId: institution_id,
      });

      if (activeLink) {
        return NextResponse.json({ error: 'Usuário já está vinculado a esta instituição' }, { status: 409 });
      }

      // Check if there's an inactive (soft-deleted) link
      const inactiveLink = await findInactiveUserInstitution(supabaseAdmin, {
        userId: existingUser.id,
        institutionId: institution_id,
      });

      if (inactiveLink) {
        // If reactivate flag not sent, return inactive_found for frontend to show modal
        if (!reactivate) {
          return NextResponse.json({
            status: 'inactive_found',
            user: {
              id: existingUser.id,
              full_name: full_name,
              email: email,
              old_role: inactiveLink.role,
              deactivated_at: inactiveLink.deleted_at,
            },
          });
        }

        // Admin confirmed reactivation
        const result = await reactivateUser(supabaseAdmin, {
          userId: existingUser.id,
          userInstitutionId: inactiveLink.id,
          institutionId: institution_id,
          newRole: userRole,
          reactivatedBy: caller.id,
          userName: full_name,
          userEmail: email.toLowerCase(),
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          userId: existingUser.id,
          reactivated: true,
          message: 'Usuário reativado com sucesso. Email de boas-vindas enviado.',
        });
      }

      userId = existingUser.id;

      // Reactivate user record if previously deactivated (but no institution link existed)
      await supabaseAdmin
        .from('users')
        .update({ is_active: true, deleted_at: null, deactivation_reason: null, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .not('deleted_at', 'is', null);
    } else {
      // New user — create auth + users record
      tempPassword = generateSecurePassword();

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return NextResponse.json({ error: 'Erro ao criar usuario de autenticacao' }, { status: 500 });
      }

      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase(),
          full_name,
          is_active: true,
          is_master: false,
        });

      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.error('Error creating user:', userError);
        return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 });
      }

      userId = authData.user.id;
    }

    // Inserir em user_institutions
    const { error: uiError } = await supabaseAdmin
      .from('user_institutions')
      .insert({
        user_id: userId,
        institution_id,
        role: userRole,
        is_active: true,
      });

    if (uiError) {
      if (!existingUser) {
        // Rollback only for new users
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      console.error('Error creating user-institution relation:', uiError);
      return NextResponse.json({ error: 'Erro ao vincular usuario a instituicao' }, { status: 500 });
    }

    // Enviar email de boas-vindas (com senha apenas para novos usuarios)
    if (tempPassword) {
      try {
        await sendWelcomeEmail(email.toLowerCase(), full_name, tempPassword);
        console.log('Welcome email sent to:', email);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      isExistingUser: !!existingUser,
      message: existingUser ? 'Usuário vinculado com sucesso' : 'Usuário cadastrado com sucesso'
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
