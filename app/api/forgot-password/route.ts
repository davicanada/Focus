import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email/sendVerificationEmail';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if user exists in our database
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, is_active')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists and is active
    if (user && user.is_active) {
      // Generate a password reset token
      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the reset token in the user's record
      // First, let's update the user with the reset token
      const { error: updateError } = await supabase
        .from('users')
        .update({
          reset_token: resetToken,
          reset_token_expires: expiresAt.toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error storing reset token:', updateError);
        // Don't expose this error to the user
      } else {
        // Send the password reset email
        try {
          await sendPasswordResetEmail(email, user.full_name, resetToken);
          console.log('Password reset email sent to:', email);
        } catch (emailError) {
          console.error('Error sending reset email:', emailError);
        }
      }
    } else {
      // Log for debugging but don't expose to user
      console.log('Password reset requested for non-existent or inactive user:', email);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'Se o email existir em nossa base, você receberá um link de recuperação.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
