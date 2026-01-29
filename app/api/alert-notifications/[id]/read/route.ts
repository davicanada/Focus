import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/alert-notifications/[id]/read - Marcar notificacao como lida
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verificar autenticacao
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    // Buscar institution_id do usuario
    const { data: userInstitution } = await supabase
      .from('user_institutions')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (!userInstitution) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se notificacao pertence a instituicao
    const { data: notification } = await supabase
      .from('alert_notifications')
      .select('id')
      .eq('id', id)
      .eq('institution_id', userInstitution.institution_id)
      .single();

    if (!notification) {
      return NextResponse.json({ error: 'Notificacao nao encontrada' }, { status: 404 });
    }

    // Marcar como lida
    const { data: updated, error } = await supabase
      .from('alert_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao marcar notificacao como lida:', error);
      return NextResponse.json({ error: 'Erro ao atualizar notificacao' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro no PUT /api/alert-notifications/[id]/read:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
