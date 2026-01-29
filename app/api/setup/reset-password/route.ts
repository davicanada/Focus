import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email e nova senha sao obrigatorios' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Find user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { success: false, error: `Erro ao listar usuarios: ${listError.message}` },
        { status: 500 }
      );
    }

    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: `Usuario com email ${email} nao encontrado` },
        { status: 404 }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Erro ao atualizar senha: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Senha atualizada com sucesso para ${email}`,
      userId: user.id,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST com { email, newPassword } para resetar a senha de um usuario',
  });
}
