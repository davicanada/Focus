import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AlertRuleFormData } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/alert-rules/[id] - Obter regra especifica
export async function GET(
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

    // Buscar regra com joins
    const { data: rule, error } = await supabase
      .from('alert_rules')
      .select(`
        *,
        student:students(id, full_name),
        class:classes(id, name),
        occurrence_type:occurrence_types(id, category, severity),
        created_by_user:users!alert_rules_created_by_fkey(id, full_name)
      `)
      .eq('id', id)
      .eq('institution_id', userInstitution.institution_id)
      .single();

    if (error || !rule) {
      return NextResponse.json({ error: 'Regra nao encontrada' }, { status: 404 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Erro no GET /api/alert-rules/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT /api/alert-rules/[id] - Atualizar regra
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

    // Verificar se regra pertence a instituicao
    const { data: existingRule } = await supabase
      .from('alert_rules')
      .select('id')
      .eq('id', id)
      .eq('institution_id', userInstitution.institution_id)
      .single();

    if (!existingRule) {
      return NextResponse.json({ error: 'Regra nao encontrada' }, { status: 404 });
    }

    const body: Partial<AlertRuleFormData> & { is_active?: boolean; is_immediate?: boolean } = await request.json();

    // Preparar dados para atualizacao
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.scope_type !== undefined) {
      updateData.scope_type = body.scope_type;
      updateData.scope_student_id = body.scope_type === 'student' ? body.scope_student_id : null;
      updateData.scope_class_id = body.scope_type === 'class' ? body.scope_class_id : null;
    }
    if (body.filter_type !== undefined) {
      updateData.filter_type = body.filter_type;
      updateData.filter_occurrence_type_id = body.filter_type === 'occurrence_type' ? body.filter_occurrence_type_id : null;
      updateData.filter_severity = body.filter_type === 'severity' ? body.filter_severity : null;
    }
    if (body.is_immediate !== undefined) {
      updateData.is_immediate = body.is_immediate;
      if (body.is_immediate) {
        updateData.threshold_count = 1;
        updateData.threshold_period_days = null;
      }
    }
    if (!body.is_immediate) {
      if (body.threshold_count !== undefined) updateData.threshold_count = body.threshold_count;
      if (body.threshold_period_days !== undefined) updateData.threshold_period_days = body.threshold_period_days;
    }
    if (body.notify_target !== undefined) updateData.notify_target = body.notify_target;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Atualizar regra
    const { data: rule, error } = await supabase
      .from('alert_rules')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        student:students(id, full_name),
        class:classes(id, name),
        occurrence_type:occurrence_types(id, category, severity),
        created_by_user:users!alert_rules_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar regra:', error);
      return NextResponse.json({ error: 'Erro ao atualizar regra' }, { status: 500 });
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Erro no PUT /api/alert-rules/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/alert-rules/[id] - Excluir regra
export async function DELETE(
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

    // Verificar se regra pertence a instituicao
    const { data: existingRule } = await supabase
      .from('alert_rules')
      .select('id')
      .eq('id', id)
      .eq('institution_id', userInstitution.institution_id)
      .single();

    if (!existingRule) {
      return NextResponse.json({ error: 'Regra nao encontrada' }, { status: 404 });
    }

    // Excluir regra (CASCADE exclui notificacoes relacionadas)
    const { error } = await supabase
      .from('alert_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir regra:', error);
      return NextResponse.json({ error: 'Erro ao excluir regra' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no DELETE /api/alert-rules/[id]:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
