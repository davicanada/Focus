import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/students/bulk-restore - Reativar alunos em massa
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
        { error: 'Apenas administradores podem reativar alunos' },
        { status: 403 }
      );
    }

    // Buscar dados do body
    const body = await request.json().catch(() => ({}));
    const { studentIds } = body as { studentIds?: string[] };

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
          { error: 'Voce so pode reativar alunos da sua instituicao' },
          { status: 403 }
        );
      }
    }

    // Filtrar apenas alunos inativos para reativar
    const inactiveStudentIds = students
      .filter((s) => !s.is_active)
      .map((s) => s.id);

    if (inactiveStudentIds.length === 0) {
      return NextResponse.json(
        { error: 'Todos os alunos selecionados ja estao ativos' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 1. Reativar alunos
    const { error: updateError } = await serviceClient
      .from('students')
      .update({
        is_active: true,
        deleted_at: null,
        updated_at: now
      })
      .in('id', inactiveStudentIds);

    if (updateError) {
      console.error('Erro ao reativar alunos:', updateError);
      return NextResponse.json(
        { error: 'Erro ao reativar alunos' },
        { status: 500 }
      );
    }

    // 2. Reativar matriculas (student_enrollments)
    const { error: enrollmentError } = await serviceClient
      .from('student_enrollments')
      .update({
        status: 'active',
        status_changed_at: now,
        status_changed_by: user.id,
        updated_at: now
      })
      .in('student_id', inactiveStudentIds)
      .eq('status', 'dropped');

    if (enrollmentError) {
      console.error('Erro ao reativar matriculas:', enrollmentError);
    }

    return NextResponse.json({
      success: true,
      restored: inactiveStudentIds.length
    });

  } catch (error) {
    console.error('Erro ao reativar alunos em massa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
