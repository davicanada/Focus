import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/school-years/[id] - Buscar ano letivo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar ano letivo
    const { data: schoolYear, error: yearError } = await serviceClient
      .from('school_years')
      .select('*')
      .eq('id', id)
      .single();

    if (yearError || !schoolYear) {
      return NextResponse.json({ error: 'Ano letivo não encontrado' }, { status: 404 });
    }

    return NextResponse.json(schoolYear);

  } catch (error) {
    console.error('Erro ao buscar ano letivo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/school-years/[id] - Atualizar ano letivo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar permissões
    const { data: currentUser } = await serviceClient
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    const { data: userInstitution } = await serviceClient
      .from('user_institutions')
      .select('role, institution_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isAdmin = userInstitution?.role === 'admin';
    const isMaster = currentUser?.is_master === true;

    if (!isAdmin && !isMaster) {
      return NextResponse.json(
        { error: 'Apenas administradores podem editar anos letivos' },
        { status: 403 }
      );
    }

    // Buscar dados do body
    const body = await request.json();
    const { name, start_date, end_date, is_current, is_archived } = body;

    // Verificar se o ano letivo existe
    const { data: existingYear, error: existError } = await serviceClient
      .from('school_years')
      .select('*')
      .eq('id', id)
      .single();

    if (existError || !existingYear) {
      return NextResponse.json({ error: 'Ano letivo não encontrado' }, { status: 404 });
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (is_current !== undefined) updateData.is_current = is_current;
    if (is_archived !== undefined) {
      updateData.is_archived = is_archived;
      if (is_archived) {
        updateData.archived_at = new Date().toISOString();
        updateData.archived_by = user.id;
      } else {
        updateData.archived_at = null;
        updateData.archived_by = null;
      }
    }

    // Atualizar ano letivo
    const { data: updated, error: updateError } = await serviceClient
      .from('school_years')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar ano letivo:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar ano letivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ano letivo atualizado com sucesso',
      school_year: updated
    });

  } catch (error) {
    console.error('Erro ao atualizar ano letivo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/school-years/[id] - Excluir ano letivo (apenas se vazio)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é master
    const { data: currentUser } = await serviceClient
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    if (!currentUser?.is_master) {
      return NextResponse.json(
        { error: 'Apenas master pode excluir anos letivos' },
        { status: 403 }
      );
    }

    // Verificar se o ano letivo existe e tem dados
    const { data: schoolYear } = await serviceClient
      .from('school_years')
      .select('id, year, name')
      .eq('id', id)
      .single();

    if (!schoolYear) {
      return NextResponse.json({ error: 'Ano letivo não encontrado' }, { status: 404 });
    }

    // Verificar se há turmas vinculadas
    const { count: classesCount } = await serviceClient
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('school_year_id', id);

    if (classesCount && classesCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${classesCount} turmas vinculadas a este ano` },
        { status: 400 }
      );
    }

    // Excluir ano letivo
    const { error: deleteError } = await serviceClient
      .from('school_years')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir ano letivo:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir ano letivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Ano letivo ${schoolYear.year} excluído com sucesso`
    });

  } catch (error) {
    console.error('Erro ao excluir ano letivo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
