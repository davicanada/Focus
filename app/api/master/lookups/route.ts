import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/lookups
 * Retorna lookups de students e occurrence_types para exibir nomes nos logs
 * Requer autenticacao como master
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar autenticacao
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    // Verificar se e master
    const { data: userData } = await supabase
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    if (!userData?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Usar service client para bypassa RLS
    const serviceClient = createServiceClient();

    // Buscar todos os students e occurrence_types
    const [studentsResult, typesResult] = await Promise.all([
      serviceClient
        .from('students')
        .select('id, full_name'),
      serviceClient
        .from('occurrence_types')
        .select('id, category'),
    ]);

    return NextResponse.json({
      students: studentsResult.data || [],
      occurrenceTypes: typesResult.data || [],
    });
  } catch (error) {
    console.error('Error fetching lookups:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}
