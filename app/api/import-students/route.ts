import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { ImportRequest, ImportResult } from '@/lib/pdf/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body: ImportRequest = await request.json();
    const { classes, institutionId, schoolYearId, year } = body;

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma turma para importar' }, { status: 400 });
    }

    if (!institutionId) {
      return NextResponse.json({ error: 'ID da instituição é obrigatório' }, { status: 400 });
    }

    if (!year) {
      return NextResponse.json({ error: 'Ano letivo é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const result: ImportResult = {
      classesCreated: 0,
      classesExisting: 0,
      studentsCreated: 0,
      studentsDuplicate: 0,
      errors: [],
    };

    for (const parsedClass of classes) {
      try {
        // Check if class already exists by name
        const { data: existingClass } = await supabase
          .from('classes')
          .select('id')
          .eq('institution_id', institutionId)
          .eq('name', parsedClass.name)
          .eq('year', year)
          .is('deleted_at', null)
          .single();

        let classId: string;

        if (existingClass) {
          classId = existingClass.id;
          result.classesExisting++;
        } else {
          // Create class
          const classData: Record<string, unknown> = {
            name: parsedClass.name,
            education_level: parsedClass.educationLevel,
            grade: parsedClass.grade,
            section: parsedClass.section,
            shift: parsedClass.shift,
            year,
            institution_id: institutionId,
            is_active: true,
          };
          if (schoolYearId) {
            classData.school_year_id = schoolYearId;
          }

          const { data: newClass, error: classError } = await supabase
            .from('classes')
            .insert(classData)
            .select('id')
            .single();

          if (classError) {
            result.errors.push(`Erro ao criar turma ${parsedClass.name}: ${classError.message}`);
            continue;
          }
          classId = newClass.id;
          result.classesCreated++;
        }

        // Insert students for this class
        for (const student of parsedClass.students) {
          try {
            // Check for duplicate by enrollment_number within institution
            if (student.registration) {
              const { data: existingStudent } = await supabase
                .from('students')
                .select('id')
                .eq('institution_id', institutionId)
                .eq('enrollment_number', student.registration)
                .is('deleted_at', null)
                .single();

              if (existingStudent) {
                result.studentsDuplicate++;
                continue;
              }
            }

            const { error: studentError } = await supabase
              .from('students')
              .insert({
                full_name: student.name,
                enrollment_number: student.registration || null,
                class_id: classId,
                institution_id: institutionId,
                is_active: true,
              });

            if (studentError) {
              result.errors.push(`Erro ao criar aluno ${student.name}: ${studentError.message}`);
            } else {
              result.studentsCreated++;
            }
          } catch (studentErr) {
            result.errors.push(`Erro ao processar aluno ${student.name}: ${String(studentErr)}`);
          }
        }
      } catch (classErr) {
        result.errors.push(`Erro ao processar turma ${parsedClass.name}: ${String(classErr)}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import students error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao importar alunos' },
      { status: 500 }
    );
  }
}
