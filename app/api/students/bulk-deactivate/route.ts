import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/students/bulk-deactivate - Desligar alunos em massa (soft delete)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticacao
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    // Verificar se e admin ou master
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
        { error: 'Apenas administradores podem desligar alunos' },
        { status: 403 }
      );
    }

    // Buscar dados do body
    const body = await request.json().catch(() => ({}));
    const { studentIds, reason } = body as { studentIds?: string[]; reason?: string };

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'studentIds deve ser um array com pelo menos um ID' },
        { status: 400 }
      );
    }

    // Buscar todos os alunos com os IDs fornecidos
    const { data: students, error: studentsError } = await serviceClient
      .from('students')
      .select('id, full_name, institution_id, is_active')
      .in('id', studentIds);

    if (studentsError) {
      console.error('Erro ao buscar alunos:', studentsError);
      return NextResponse.json(
        { error: 'Erro ao buscar alunos' },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum aluno encontrado com os IDs fornecidos' },
        { status: 404 }
      );
    }

    // Verificar seguranca multi-tenant: todos devem pertencer a mesma instituicao do admin
    if (!isMaster) {
      const adminInstitutionId = userInstitution?.institution_id;
      const outsideInstitution = students.some(
        (s) => s.institution_id !== adminInstitutionId
      );
      if (outsideInstitution) {
        return NextResponse.json(
          { error: 'Voce so pode desligar alunos da sua instituicao' },
          { status: 403 }
        );
      }
    }

    // Filtrar apenas alunos ativos para desligar
    const activeStudentIds = students
      .filter((s) => s.is_active)
      .map((s) => s.id);

    if (activeStudentIds.length === 0) {
      return NextResponse.json(
        { error: 'Todos os alunos selecionados ja estao desligados' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const deactivateReason = reason || 'Desligado pelo administrador (em massa)';

    // 1. Desligar alunos (soft delete)
    const { error: updateError } = await serviceClient
      .from('students')
      .update({
        is_active: false,
        deleted_at: now,
        notes: deactivateReason,
        updated_at: now
      })
      .in('id', activeStudentIds);

    if (updateError) {
      console.error('Erro ao desligar alunos:', updateError);
      return NextResponse.json(
        { error: 'Erro ao desligar alunos' },
        { status: 500 }
      );
    }

    // 2. Atualizar matriculas (student_enrollments)
    const { error: enrollmentError } = await serviceClient
      .from('student_enrollments')
      .update({
        status: 'dropped',
        status_changed_at: now,
        status_changed_by: user.id,
        notes: deactivateReason,
        updated_at: now
      })
      .in('student_id', activeStudentIds)
      .eq('status', 'active');

    if (enrollmentError) {
      console.error('Erro ao atualizar matriculas:', enrollmentError);
    }

    // 3. Desativar regras de alerta referenciando esses alunos
    const { error: alertRulesError } = await serviceClient
      .from('alert_rules')
      .update({
        is_active: false,
        updated_at: now
      })
      .in('scope_student_id', activeStudentIds)
      .eq('is_active', true);

    if (alertRulesError) {
      console.error('Erro ao desativar regras de alerta:', alertRulesError);
    }

    return NextResponse.json({
      success: true,
      deactivated: activeStudentIds.length
    });

  } catch (error) {
    console.error('Erro ao desligar alunos em massa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
