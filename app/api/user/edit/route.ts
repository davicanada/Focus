import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, full_name, email } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'ID do usuario nao informado' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuario' },
        { status: 500 }
      );
    }

    // If email changed, update auth email too
    if (email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        user_id,
        { email }
      );

      if (authError) {
        console.error('Error updating auth email:', authError);
        // Don't fail the request, just log it
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in edit user:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
