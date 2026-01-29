import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, is_active } = body;

    if (!user_id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'Campos obrigatorios nao preenchidos' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Update user status
    const { data, error } = await supabase
      .from('users')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user status:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar status do usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in toggle user status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
