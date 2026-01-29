import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/school-years/rollover - Virada de ano letivo
export async function POST(request: NextRequest) {
  try {
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
        { error: 'Apenas administradores podem fazer virada de ano' },
        { status: 403 }
      );
    }

    const institutionId = userInstitution?.institution_id;
    if (!institutionId) {
      return NextResponse.json(
        { error: 'Instituição não encontrada' },
        { status: 400 }
      );
    }

    // Buscar opções do body
    const body = await request.json();
    const {
      from_year,          // Ano atual a ser arquivado
      to_year,            // Novo ano a ser criado/ativado
      archive_current,    // Arquivar ano atual (default: true)
      create_classes,     // Criar turmas para o novo ano (default: true)
      promote_students,   // Promover alunos automaticamente (default: false)
      copy_occurrence_types, // Copiar tipos de ocorrência (já compartilhados, não precisa)
      copy_periods        // Copiar períodos acadêmicos (default: false)
    } = body;

    const currentYear = from_year || new Date().getFullYear();
    const newYear = to_year || currentYear + 1;

    // Buscar ano letivo atual
    const { data: currentSchoolYear } = await serviceClient
      .from('school_years')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('year', currentYear)
      .single();

    if (!currentSchoolYear) {
      return NextResponse.json(
        { error: `Ano letivo ${currentYear} não encontrado` },
        { status: 404 }
      );
    }

    const results = {
      archived_year: null as number | null,
      new_year_created: false,
      classes_created: 0,
      students_promoted: 0,
      periods_copied: 0
    };

    // 1. Arquivar ano atual
    if (archive_current !== false) {
      await serviceClient
        .from('school_years')
        .update({
          is_current: false,
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSchoolYear.id);

      results.archived_year = currentYear;
    }

    // 2. Criar ou ativar novo ano letivo
    let newSchoolYear;
    const { data: existingNewYear } = await serviceClient
      .from('school_years')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('year', newYear)
      .single();

    if (existingNewYear) {
      // Ativar ano existente
      const { data: updated } = await serviceClient
        .from('school_years')
        .update({
          is_current: true,
          is_archived: false,
          archived_at: null,
          archived_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingNewYear.id)
        .select()
        .single();

      newSchoolYear = updated;
    } else {
      // Criar novo ano letivo
      const { data: created } = await serviceClient
        .from('school_years')
        .insert({
          institution_id: institutionId,
          year: newYear,
          name: `Ano Letivo ${newYear}`,
          start_date: `${newYear}-02-01`,
          end_date: `${newYear}-12-15`,
          is_current: true,
          is_archived: false
        })
        .select()
        .single();

      newSchoolYear = created;
      results.new_year_created = true;
    }

    // 3. Criar turmas para o novo ano (baseadas no ano anterior)
    if (create_classes !== false && newSchoolYear) {
      const { data: oldClasses } = await serviceClient
        .from('classes')
        .select('*')
        .eq('school_year_id', currentSchoolYear.id)
        .eq('is_active', true);

      if (oldClasses && oldClasses.length > 0) {
        for (const oldClass of oldClasses) {
          // Verificar se já existe turma equivalente no novo ano
          const { data: existingClass } = await serviceClient
            .from('classes')
            .select('id')
            .eq('school_year_id', newSchoolYear.id)
            .eq('name', oldClass.name)
            .single();

          if (!existingClass) {
            const { error: createError } = await serviceClient
              .from('classes')
              .insert({
                institution_id: institutionId,
                school_year_id: newSchoolYear.id,
                name: oldClass.name,
                education_level: oldClass.education_level,
                grade: oldClass.grade,
                section: oldClass.section,
                shift: oldClass.shift,
                year: newYear,
                is_active: true
              });

            if (!createError) {
              results.classes_created++;
            }
          }
        }
      }
    }

    // 4. Promover alunos automaticamente
    if (promote_students && newSchoolYear) {
      // Buscar alunos ativos do ano anterior
      const { data: enrollments } = await serviceClient
        .from('student_enrollments')
        .select(`
          *,
          student:students(*),
          class:classes(*)
        `)
        .eq('school_year_id', currentSchoolYear.id)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
          // Encontrar turma de destino (próximo ano/série)
          const { data: nextClass } = await serviceClient
            .from('classes')
            .select('id')
            .eq('school_year_id', newSchoolYear.id)
            .eq('education_level', enrollment.class?.education_level)
            .eq('section', enrollment.class?.section)
            .single();

          if (nextClass) {
            // Criar nova matrícula
            const { error: enrollError } = await serviceClient
              .from('student_enrollments')
              .insert({
                student_id: enrollment.student_id,
                class_id: nextClass.id,
                school_year_id: newSchoolYear.id,
                institution_id: institutionId,
                status: 'active',
                notes: `Promovido do ano letivo ${currentYear}`
              });

            if (!enrollError) {
              // Atualizar class_id do aluno
              await serviceClient
                .from('students')
                .update({ class_id: nextClass.id, updated_at: new Date().toISOString() })
                .eq('id', enrollment.student_id);

              // Marcar matrícula antiga como promovida
              await serviceClient
                .from('student_enrollments')
                .update({
                  status: 'promoted',
                  status_changed_at: new Date().toISOString(),
                  status_changed_by: user.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', enrollment.id);

              results.students_promoted++;
            }
          }
        }
      }
    }

    // 5. Copiar períodos acadêmicos
    if (copy_periods && newSchoolYear) {
      const { data: oldPeriods } = await serviceClient
        .from('quarters')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('start_date', `${currentYear}-01-01`)
        .lte('end_date', `${currentYear}-12-31`);

      if (oldPeriods && oldPeriods.length > 0) {
        for (const period of oldPeriods) {
          // Ajustar datas para o novo ano
          const newStartDate = period.start_date.replace(String(currentYear), String(newYear));
          const newEndDate = period.end_date.replace(String(currentYear), String(newYear));
          const newName = period.name.replace(String(currentYear), String(newYear));

          const { error: periodError } = await serviceClient
            .from('quarters')
            .insert({
              institution_id: institutionId,
              name: newName,
              start_date: newStartDate,
              end_date: newEndDate,
              period_type: period.period_type,
              period_number: period.period_number,
              is_active: true
            });

          if (!periodError) {
            results.periods_copied++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Virada de ano concluída: ${currentYear} → ${newYear}`,
      results,
      new_school_year: newSchoolYear
    });

  } catch (error) {
    console.error('Erro na virada de ano:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
