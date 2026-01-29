import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/sendVerificationEmail';

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

// POST - Criar novo professor
export async function POST(request: NextRequest) {
  try {
    const { full_name, email, institution_id } = await request.json();

    // Validar dados
    if (!full_name || !email || !institution_id) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    // Verificar se email ja existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email ja cadastrado no sistema' }, { status: 409 });
    }

    // Gerar senha temporaria
    const tempPassword = Math.random().toString(36).slice(-8) +
                         Math.random().toString(36).slice(-8).toUpperCase();

    // Criar usuario no Auth
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

    // Inserir em users
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
      // Rollback: deletar do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error creating user:', userError);
      return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 });
    }

    // Inserir em user_institutions
    const { error: uiError } = await supabaseAdmin
      .from('user_institutions')
      .insert({
        user_id: authData.user.id,
        institution_id,
        role: 'professor',
        is_active: true,
      });

    if (uiError) {
      // Rollback
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error creating user-institution relation:', uiError);
      return NextResponse.json({ error: 'Erro ao vincular usuario a instituicao' }, { status: 500 });
    }

    // Enviar email de boas-vindas
    try {
      await sendWelcomeEmail(email.toLowerCase(), full_name, tempPassword);
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Nao falhar a operacao se o email falhar
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'Professor cadastrado com sucesso'
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
