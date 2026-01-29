import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/alert-notifications/count - Contar notificacoes nao lidas
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ count: 0 });
    }

    // Contar notificacoes nao lidas
    const { count, error } = await supabase
      .from('alert_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', userInstitution.institution_id)
      .eq('is_read', false);

    if (error) {
      console.error('Erro ao contar notificacoes:', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Erro no GET /api/alert-notifications/count:', error);
    return NextResponse.json({ count: 0 });
  }
}
