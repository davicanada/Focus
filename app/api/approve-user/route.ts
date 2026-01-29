import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email/sendVerificationEmail';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_id, action, rejection_reason, reviewer_id } = body;

    if (!request_id || !action || !reviewer_id) {
      return NextResponse.json(
        { error: 'Campos obrigatorios nao preenchidos' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Acao invalida' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get the access request
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', request_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !accessRequest) {
      return NextResponse.json(
        { error: 'Solicitacao nao encontrada ou ja processada' },
        { status: 404 }
      );
    }

    // If rejecting, just update the status
    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewer_id,
          reviewed_at: new Date().toISOString(),
          rejection_reason,
        })
        .eq('id', request_id);

      if (updateError) {
        console.error('Error rejecting request:', updateError);
        return NextResponse.json(
          { error: 'Erro ao rejeitar solicitacao' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    // If approving, create user and institution (if needed)
    let institutionId = accessRequest.institution_id;

    // Create institution if this is a new institution request
    if (accessRequest.request_type === 'admin_new') {
      const { data: newInstitution, error: institutionError } = await supabase
        .from('institutions')
        .insert({
          name: accessRequest.institution_name,
          slug: generateSlug(accessRequest.institution_name),
          // Full address fields from Google Places API
          full_address: accessRequest.institution_full_address,
          street: accessRequest.institution_street,
          number: accessRequest.institution_number,
          neighborhood: accessRequest.institution_neighborhood,
          city: accessRequest.institution_city,
          state: accessRequest.institution_state,
          state_code: accessRequest.institution_state_code,
          postal_code: accessRequest.institution_postal_code,
          country: accessRequest.institution_country,
          latitude: accessRequest.institution_latitude,
          longitude: accessRequest.institution_longitude,
          is_active: true,
        })
        .select()
        .single();

      if (institutionError) {
        console.error('Error creating institution:', institutionError);
        return NextResponse.json(
          { error: 'Erro ao criar instituicao' },
          { status: 500 }
        );
      }

      institutionId = newInstitution.id;
    }

    // Generate a random password for the new user
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: accessRequest.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Erro ao criar usuario de autenticacao' },
        { status: 500 }
      );
    }

    // Create user in users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: accessRequest.email,
        full_name: accessRequest.full_name,
        is_active: true,
        is_master: false,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Erro ao criar usuario' },
        { status: 500 }
      );
    }

    // Create user_institution relationship
    const role = accessRequest.request_type === 'professor'
      ? 'professor'
      : accessRequest.request_type === 'admin_viewer'
        ? 'admin_viewer'
        : 'admin';
    const { error: relationError } = await supabase
      .from('user_institutions')
      .insert({
        user_id: newUser.id,
        institution_id: institutionId,
        role,
        is_active: true,
      });

    if (relationError) {
      console.error('Error creating user-institution relation:', relationError);
      // Rollback
      await supabase.from('users').delete().eq('id', newUser.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Erro ao vincular usuario a instituicao' },
        { status: 500 }
      );
    }

    // Update access request status
    const { error: updateError } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewer_id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Error updating access request:', updateError);
    }

    // Enviar email de boas-vindas com senha temporaria
    try {
      await sendWelcomeEmail(
        accessRequest.email,
        accessRequest.full_name,
        tempPassword
      );
      console.log('Welcome email sent to:', accessRequest.email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Nao falhar a operacao se o email falhar
    }

    return NextResponse.json({
      success: true,
      action: 'approved',
      user: newUser,
      tempPassword, // Em producao, remover este campo e confiar apenas no email
    });
  } catch (error) {
    console.error('Error in approve user:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
