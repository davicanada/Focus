import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// PUT - Atualizar nome do professor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { full_name } = await request.json();
    const { id: userId } = await params;

    if (!full_name) {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    const { error } = await supabaseAdmin
      .from('users')
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating teacher:', error);
      return NextResponse.json({ error: 'Erro ao atualizar professor' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: 'Erro ao atualizar professor' }, { status: 500 });
  }
}
