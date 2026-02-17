import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/occurrence-subcategories/[id] - Editar subcategoria customizada
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verificar que subcategoria existe e nao e padrao
    const { data: subcategory } = await serviceClient
      .from('occurrence_subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategoria nao encontrada' }, { status: 404 });
    }

    if (subcategory.is_default) {
      return NextResponse.json({ error: 'Subcategorias padrao nao podem ser editadas' }, { status: 403 });
    }

    // Verificar que usuario e admin da instituicao
    const { data: userInst } = await supabase
      .from('user_institutions')
      .select('role')
      .eq('user_id', user.id)
      .eq('institution_id', subcategory.institution_id)
      .eq('is_active', true)
      .single();

    if (!userInst || userInst.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem editar subcategorias' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    const { data, error } = await serviceClient
      .from('occurrence_subcategories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar subcategoria:', error);
      return NextResponse.json({ error: 'Erro ao atualizar subcategoria' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro no PUT /api/occurrence-subcategories/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/occurrence-subcategories/[id] - Soft delete subcategoria customizada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verificar que subcategoria existe e nao e padrao
    const { data: subcategory } = await serviceClient
      .from('occurrence_subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategoria nao encontrada' }, { status: 404 });
    }

    if (subcategory.is_default) {
      return NextResponse.json({ error: 'Subcategorias padrao nao podem ser excluidas' }, { status: 403 });
    }

    // Verificar que usuario e admin da instituicao
    const { data: userInst } = await supabase
      .from('user_institutions')
      .select('role')
      .eq('user_id', user.id)
      .eq('institution_id', subcategory.institution_id)
      .eq('is_active', true)
      .single();

    if (!userInst || userInst.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem excluir subcategorias' }, { status: 403 });
    }

    // Soft delete
    const { error } = await serviceClient
      .from('occurrence_subcategories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir subcategoria:', error);
      return NextResponse.json({ error: 'Erro ao excluir subcategoria' }, { status: 500 });
    }

    // Limpar referencia nos tipos de ocorrencia
    await serviceClient
      .from('occurrence_types')
      .update({ subcategory_id: null })
      .eq('subcategory_id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no DELETE /api/occurrence-subcategories/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
