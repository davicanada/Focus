import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Interface pública - apenas campos necessários para o select
interface PublicInstitution {
  id: string;
  name: string;
  city: string;
  state_code: string;
}

/**
 * GET /api/institutions/public
 *
 * Retorna lista de instituições ativas para exibição no dropdown
 * de solicitação de acesso. Esta é uma API pública (não requer autenticação)
 * pois é usada por usuários que ainda não têm conta.
 *
 * Segurança:
 * - Usa serviceClient para bypassa RLS
 * - Retorna apenas campos públicos (sem endereço completo, coordenadas, etc.)
 * - Filtra apenas instituições ativas
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, city, state_code')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching institutions:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar instituições' },
        { status: 500 }
      );
    }

    // Mapear para garantir que apenas campos públicos são retornados
    const publicInstitutions: PublicInstitution[] = (data || []).map((inst) => ({
      id: inst.id,
      name: inst.name,
      city: inst.city || '',
      state_code: inst.state_code || '',
    }));

    return NextResponse.json({
      success: true,
      data: publicInstitutions,
    });
  } catch (error) {
    console.error('Error in public institutions API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
