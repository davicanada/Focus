import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/alert-notifications - Listar notificacoes de alerta
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
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Parametros de filtro
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Buscar notificacoes com joins
    let query = supabase
      .from('alert_notifications')
      .select(`
        *,
        alert_rule:alert_rules(id, name, scope_type, filter_type),
        occurrence:occurrences(id, occurrence_date, student:students(id, full_name))
      `)
      .eq('institution_id', userInstitution.institution_id)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Erro ao buscar notificacoes:', error);
      return NextResponse.json({ error: 'Erro ao buscar notificacoes' }, { status: 500 });
    }

    return NextResponse.json(notifications || []);
  } catch (error) {
    console.error('Erro no GET /api/alert-notifications:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/alert-notifications - Marcar todas como lidas
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'mark_all_read') {
      // Marcar todas como lidas
      const { error } = await supabase
        .from('alert_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id,
        })
        .eq('institution_id', userInstitution.institution_id)
        .eq('is_read', false);

      if (error) {
        console.error('Erro ao marcar notificacoes como lidas:', error);
        return NextResponse.json({ error: 'Erro ao marcar notificacoes' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 });
  } catch (error) {
    console.error('Erro no POST /api/alert-notifications:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
