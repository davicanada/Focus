import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/occurrences/pending-graves/count - Contar ocorrencias graves pendentes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticacao
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    // Buscar institution_id e role do usuario via service client
    const serviceClient = createServiceClient();
    const { data: userInstitution } = await serviceClient
      .from('user_institutions')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'admin_viewer'])
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (!userInstitution) {
      return NextResponse.json({ count: 0 });
    }

    // Contar ocorrencias graves pendentes
    const { count, error } = await serviceClient
      .from('occurrences')
      .select('id, occurrence_type:occurrence_types!inner(severity)', { count: 'exact', head: true })
      .eq('institution_id', userInstitution.institution_id)
      .eq('occurrence_type.severity', 'grave')
      .eq('status', 'pending')
      .is('deleted_at', null);

    if (error) {
      console.error('Erro ao contar ocorrencias graves pendentes:', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Erro no GET /api/occurrences/pending-graves/count:', error);
    return NextResponse.json({ count: 0 });
  }
}
