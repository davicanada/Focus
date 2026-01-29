import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AlertRuleFormData } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/alert-rules - Listar regras de alerta da instituicao
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

    // Buscar regras com joins
    const { data: rules, error } = await supabase
      .from('alert_rules')
      .select(`
        *,
        student:students(id, full_name),
        class:classes(id, name),
        occurrence_type:occurrence_types(id, category, severity),
        created_by_user:users!alert_rules_created_by_fkey(id, full_name)
      `)
      .eq('institution_id', userInstitution.institution_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar regras:', error);
      return NextResponse.json({ error: 'Erro ao buscar regras' }, { status: 500 });
    }

    return NextResponse.json(rules || []);
  } catch (error) {
    console.error('Erro no GET /api/alert-rules:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/alert-rules - Criar nova regra de alerta
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

    const body: AlertRuleFormData = await request.json();

    // Validar campos obrigatorios
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 });
    }
    if (!body.scope_type) {
      return NextResponse.json({ error: 'Escopo e obrigatorio' }, { status: 400 });
    }
    if (!body.filter_type) {
      return NextResponse.json({ error: 'Filtro e obrigatorio' }, { status: 400 });
    }
    // Para alertas nao-imediatos, validar threshold
    if (!body.is_immediate) {
      if (!body.threshold_count || body.threshold_count < 1) {
        return NextResponse.json({ error: 'Quantidade minima deve ser pelo menos 1' }, { status: 400 });
      }
      if (!body.threshold_period_days || body.threshold_period_days < 1) {
        return NextResponse.json({ error: 'Periodo deve ser pelo menos 1 dia' }, { status: 400 });
      }
    }

    // Validar escopo especifico
    if (body.scope_type === 'student' && !body.scope_student_id) {
      return NextResponse.json({ error: 'Aluno e obrigatorio para escopo de aluno' }, { status: 400 });
    }
    if (body.scope_type === 'class' && !body.scope_class_id) {
      return NextResponse.json({ error: 'Turma e obrigatoria para escopo de turma' }, { status: 400 });
    }

    // Validar filtro especifico
    if (body.filter_type === 'occurrence_type' && !body.filter_occurrence_type_id) {
      return NextResponse.json({ error: 'Tipo de ocorrencia e obrigatorio' }, { status: 400 });
    }
    if (body.filter_type === 'severity' && !body.filter_severity) {
      return NextResponse.json({ error: 'Severidade e obrigatoria' }, { status: 400 });
    }

    // Criar regra
    const { data: rule, error } = await supabase
      .from('alert_rules')
      .insert({
        institution_id: userInstitution.institution_id,
        created_by: user.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        scope_type: body.scope_type,
        scope_student_id: body.scope_type === 'student' ? body.scope_student_id : null,
        scope_class_id: body.scope_type === 'class' ? body.scope_class_id : null,
        filter_type: body.filter_type,
        filter_occurrence_type_id: body.filter_type === 'occurrence_type' ? body.filter_occurrence_type_id : null,
        filter_severity: body.filter_type === 'severity' ? body.filter_severity : null,
        is_immediate: body.is_immediate || false,
        threshold_count: body.is_immediate ? 1 : body.threshold_count,
        threshold_period_days: body.is_immediate ? null : body.threshold_period_days,
        notify_target: body.notify_target || 'self',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar regra:', error);
      return NextResponse.json({ error: 'Erro ao criar regra' }, { status: 500 });
    }

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Erro no POST /api/alert-rules:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
