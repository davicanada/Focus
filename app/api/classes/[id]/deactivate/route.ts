import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// PUT /api/classes/[id]/deactivate - Desligar turma (soft delete)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
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
        { error: 'Apenas administradores podem desligar turmas' },
        { status: 403 }
      );
    }

    // Buscar dados do body
    const body = await request.json().catch(() => ({}));
    const { deactivate_students } = body;

    // Verificar se a turma existe
    const { data: classData, error: classError } = await serviceClient
      .from('classes')
      .select('id, name, institution_id, is_active, year')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
    }

    // Verificar se pertence à mesma instituição (se não for master)
    if (!isMaster && classData.institution_id !== userInstitution?.institution_id) {
      return NextResponse.json(
        { error: 'Você só pode desligar turmas da sua instituição' },
        { status: 403 }
      );
    }

    // Verificar se já está desligada
    if (!classData.is_active) {
      return NextResponse.json(
        { error: 'Esta turma já está desligada' },
        { status: 400 }
      );
    }

    // Contar alunos ativos na turma
    const { count: activeStudents } = await serviceClient
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('is_active', true);

    // Desligar a turma (soft delete)
    const { error: updateError } = await serviceClient
      .from('classes')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', classId);

    if (updateError) {
      console.error('Erro ao desligar turma:', updateError);
      return NextResponse.json(
        { error: 'Erro ao desligar turma' },
        { status: 500 }
      );
    }

    let studentsDeactivated = 0;

    // Opcionalmente desligar alunos da turma também
    if (deactivate_students && activeStudents && activeStudents > 0) {
      const { error: studentsError } = await serviceClient
        .from('students')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          notes: `Desligado junto com a turma ${classData.name}`,
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .eq('is_active', true);

      if (studentsError) {
        console.error('Erro ao desligar alunos da turma:', studentsError);
      } else {
        studentsDeactivated = activeStudents;
      }

      // Atualizar matrículas
      await serviceClient
        .from('student_enrollments')
        .update({
          status: 'dropped',
          status_changed_at: new Date().toISOString(),
          status_changed_by: user.id,
          notes: `Turma ${classData.name} desligada`,
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId)
        .eq('status', 'active');

      // GOVERNANÇA: Desativar regras de alerta dos alunos desligados
      const { data: deactivatedStudents } = await serviceClient
        .from('students')
        .select('id')
        .eq('class_id', classId);

      if (deactivatedStudents && deactivatedStudents.length > 0) {
        const studentIds = deactivatedStudents.map(s => s.id);
        await serviceClient
          .from('alert_rules')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .in('scope_student_id', studentIds)
          .eq('is_active', true);
      }
    }

    // GOVERNANÇA: Desativar regras de alerta que referenciam esta turma
    const { error: alertRulesError } = await serviceClient
      .from('alert_rules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('scope_class_id', classId)
      .eq('is_active', true);

    if (alertRulesError) {
      console.error('Erro ao desativar regras de alerta da turma:', alertRulesError);
    }

    return NextResponse.json({
      success: true,
      message: `Turma ${classData.name} foi desligada com sucesso`,
      class: {
        id: classData.id,
        name: classData.name,
        year: classData.year
      },
      students_affected: activeStudents || 0,
      students_deactivated: studentsDeactivated
    });

  } catch (error) {
    console.error('Erro ao desligar turma:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
