import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendRequestConfirmationEmail, sendAccessRequestNotification } from '@/lib/email/sendVerificationEmail';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/verify-email?status=error&message=Token não fornecido`);
  }

  const supabase = createServiceClient();

  // Find the access request by token
  const { data: accessRequest, error: findError } = await supabase
    .from('access_requests')
    .select('*')
    .eq('verification_token', token)
    .single();

  if (findError || !accessRequest) {
    console.error('Token not found:', token);
    return NextResponse.redirect(`${appUrl}/verify-email?status=error&message=Token inválido ou expirado`);
  }

  // Check if already verified
  if (accessRequest.email_verified) {
    return NextResponse.redirect(`${appUrl}/verify-email?status=already_verified`);
  }

  // Check if request was already processed (approved/rejected)
  if (accessRequest.status === 'approved' || accessRequest.status === 'rejected') {
    return NextResponse.redirect(`${appUrl}/verify-email?status=already_processed`);
  }

  // Update the request to mark email as verified
  const { error: updateError } = await supabase
    .from('access_requests')
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      status: 'pending',
    })
    .eq('id', accessRequest.id);

  if (updateError) {
    console.error('Error updating access request:', updateError);
    return NextResponse.redirect(`${appUrl}/verify-email?status=error&message=Erro ao verificar email`);
  }

  console.log('Email verified for:', accessRequest.email);

  // Now send notifications to reviewers
  try {
    // Get institution name for the confirmation email
    let institutionName: string | undefined;
    if (accessRequest.request_type === 'admin_new') {
      institutionName = accessRequest.institution_name;
    } else if (accessRequest.institution_id) {
      const { data: instData } = await supabase
        .from('institutions')
        .select('name')
        .eq('id', accessRequest.institution_id)
        .single();
      institutionName = instData?.name;
    }

    // 1. Send confirmation email to requester
    await sendRequestConfirmationEmail(
      accessRequest.email,
      accessRequest.full_name,
      accessRequest.request_type,
      institutionName
    );
    console.log('Confirmation email sent to requester:', accessRequest.email);

    // 2. Send notifications to reviewers (admins and/or master)
    if (accessRequest.request_type === 'admin_new') {
      // For new institution requests, notify only the master
      const { data: masterUsers } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('is_master', true)
        .eq('is_active', true);

      if (masterUsers && masterUsers.length > 0) {
        for (const master of masterUsers) {
          await sendAccessRequestNotification(master.email, accessRequest.full_name, accessRequest.request_type);
          console.log('Notification email sent to master:', master.email);
        }
      }
    } else {
      // For professor/admin_existing, notify admins of the institution + master
      const { data: adminRelations } = await supabase
        .from('user_institutions')
        .select('user_id')
        .eq('institution_id', accessRequest.institution_id)
        .eq('role', 'admin');

      const adminUserIds = adminRelations?.map(r => r.user_id) || [];

      let institutionAdmins: { email: string; full_name: string }[] = [];
      if (adminUserIds.length > 0) {
        const { data: admins } = await supabase
          .from('users')
          .select('email, full_name')
          .in('id', adminUserIds)
          .eq('is_active', true);
        institutionAdmins = admins || [];
      }

      // Also notify master for visibility
      const { data: masterUsers } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('is_master', true)
        .eq('is_active', true);

      const allReviewers = [...institutionAdmins, ...(masterUsers || [])];
      const uniqueEmails = new Set<string>();

      for (const reviewer of allReviewers) {
        if (!uniqueEmails.has(reviewer.email)) {
          uniqueEmails.add(reviewer.email);
          await sendAccessRequestNotification(reviewer.email, accessRequest.full_name, accessRequest.request_type);
          console.log('Notification email sent to reviewer:', reviewer.email);
        }
      }
    }
  } catch (emailError) {
    // Log but don't fail - email was already verified
    console.error('Error sending notification emails:', emailError);
  }

  // Redirect to success page
  return NextResponse.redirect(`${appUrl}/verify-email?status=success&name=${encodeURIComponent(accessRequest.full_name)}`);
}
