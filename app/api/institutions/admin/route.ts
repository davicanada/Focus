import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/institutions/admin
 *
 * Retorna TODAS as instituições para o painel master.
 * Esta API é protegida e requer autenticação como master.
 *
 * Segurança:
 * - Verifica autenticação (401 se não logado)
 * - Verifica se usuário é master (403 se não for)
 * - Usa serviceClient para bypassa RLS
 */
export async function GET() {
  try {
    // 1. Verificar autenticação
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Verificar se é master
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 3. Buscar TODAS as instituições (bypassando RLS)
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching institutions:', error);
      return NextResponse.json({ error: 'Erro ao buscar instituições' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in admin institutions API:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
