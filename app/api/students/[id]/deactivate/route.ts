import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/students/[id]/deactivate - Desligar aluno (soft delete)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin ou master
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
    const { reason, enrollment_status } = body;

    // Verificar se o aluno existe
    const { data: student, error: studentError } = await serviceClient
      .from('students')
      .select('id, full_name, enrollment_number, institution_id, class_id, is_active')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    // Verificar se pertence à mesma instituição (se não for master)
    if (!isMaster && student.institution_id !== userInstitution?.institution_id) {
      return NextResponse.json(
        { error: 'Você só pode desligar alunos da sua instituição' },
        { status: 403 }
      );
    }

    // Verificar se já está desligado
    if (!student.is_active) {
      return NextResponse.json(
        { error: 'Este aluno já está desligado' },
        { status: 400 }
      );
    }

    // Desligar o aluno (soft delete)
    const { error: updateError } = await serviceClient
      .from('students')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        notes: reason || 'Desligado pelo administrador',
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('Erro ao desligar aluno:', updateError);
      return NextResponse.json(
        { error: 'Erro ao desligar aluno' },
        { status: 500 }
      );
    }

    // Atualizar status na matrícula (student_enrollments)
    const { error: enrollmentError } = await serviceClient
      .from('student_enrollments')
      .update({
        status: enrollment_status || 'dropped',
        status_changed_at: new Date().toISOString(),
        status_changed_by: user.id,
        notes: reason || 'Desligado pelo administrador',
        updated_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('status', 'active');

    if (enrollmentError) {
      console.error('Erro ao atualizar matrícula:', enrollmentError);
    }

    // GOVERNANÇA: Desativar regras de alerta que referenciam este aluno
    const { error: alertRulesError } = await serviceClient
      .from('alert_rules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('scope_student_id', studentId)
      .eq('is_active', true);

    if (alertRulesError) {
      console.error('Erro ao desativar regras de alerta do aluno:', alertRulesError);
    }

    return NextResponse.json({
      success: true,
      message: `Aluno ${student.full_name} foi desligado com sucesso`,
      student: {
        id: student.id,
        full_name: student.full_name,
        enrollment_number: student.enrollment_number
      }
    });

  } catch (error) {
    console.error('Erro ao desligar aluno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
