import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/occurrence-subcategories - Lista subcategorias (padrao + da instituicao)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const institutionId = request.nextUrl.searchParams.get('institution_id');

    const serviceClient = createServiceClient();

    // Buscar padrao (institution_id IS NULL) + da instituicao
    let query = serviceClient
      .from('occurrence_subcategories')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (institutionId) {
      query = query.or(`institution_id.is.null,institution_id.eq.${institutionId}`);
    } else {
      query = query.is('institution_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar subcategorias:', error);
      return NextResponse.json({ error: 'Erro ao buscar subcategorias' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erro no GET /api/occurrence-subcategories:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/occurrence-subcategories - Criar subcategoria customizada
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, institution_id } = body;

    if (!name || !institution_id) {
      return NextResponse.json({ error: 'Nome e instituicao sao obrigatorios' }, { status: 400 });
    }

    // Verificar que usuario e admin da instituicao
    const { data: userInst } = await supabase
      .from('user_institutions')
      .select('role')
      .eq('user_id', user.id)
      .eq('institution_id', institution_id)
      .eq('is_active', true)
      .single();

    if (!userInst || userInst.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar subcategorias' }, { status: 403 });
    }

    const serviceClient = createServiceClient();

    // Verificar nome duplicado na instituicao
    const { data: existing } = await serviceClient
      .from('occurrence_subcategories')
      .select('id')
      .eq('institution_id', institution_id)
      .ilike('name', name)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Ja existe uma subcategoria com esse nome' }, { status: 409 });
    }

    const { data, error } = await serviceClient
      .from('occurrence_subcategories')
      .insert({
        name,
        description: description || null,
        color: color || '#6B7280',
        institution_id,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar subcategoria:', error);
      return NextResponse.json({ error: 'Erro ao criar subcategoria' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/occurrence-subcategories:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
