import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET - Validate reset token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token não fornecido' });
  }

  const supabase = createServiceClient();

  // Find user with this reset token
  const { data: user, error } = await supabase
    .from('users')
    .select('id, reset_token_expires')
    .eq('reset_token', token)
    .single();

  if (error || !user) {
    return NextResponse.json({ valid: false, error: 'Token inválido' });
  }

  // Check if token is expired
  if (user.reset_token_expires) {
    const expiresAt = new Date(user.reset_token_expires);
    if (expiresAt < new Date()) {
      return NextResponse.json({ valid: false, expired: true, error: 'Token expirado' });
    }
  }

  return NextResponse.json({ valid: true });
}

// POST - Reset password
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Find user with this reset token
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (user.reset_token_expires) {
      const expiresAt = new Date(user.reset_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Token expirado. Por favor, solicite um novo link.' },
          { status: 400 }
        );
      }
    }

    // Update password in Supabase Auth
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateAuthError) {
      console.error('Error updating auth password:', updateAuthError);
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      );
    }

    // Clear the reset token
    const { error: clearTokenError } = await supabase
      .from('users')
      .update({
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    if (clearTokenError) {
      console.error('Error clearing reset token:', clearTokenError);
      // Don't fail the request, password was already updated
    }

    console.log('Password reset successful for user:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
