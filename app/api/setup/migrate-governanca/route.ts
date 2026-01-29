import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Migration de Governança de Dados - 25/01/2026
// Adiciona soft delete em occurrences e corrige dados inconsistentes

export async function POST() {
  const results: { step: string; success: boolean; error?: string; affected?: number }[] = [];

  try {
    const supabase = createServiceClient();

    // 1. Verificar se coluna deleted_at já existe em occurrences
    const { data: checkColumn } = await supabase
      .from('occurrences')
      .select('id')
      .limit(1);

    // Tentar adicionar coluna deleted_at (vai falhar silenciosamente se já existir)
    // Usamos uma abordagem alternativa: verificar via query e então fazer update condicional

    // 2. Preencher class_id_at_occurrence em ocorrências antigas que estão NULL
    const { data: orphanOccurrences, error: orphanError } = await supabase
      .from('occurrences')
      .select('id, student_id')
      .is('class_id_at_occurrence', null);

    if (orphanError) {
      results.push({ step: 'Buscar ocorrências órfãs', success: false, error: orphanError.message });
    } else if (orphanOccurrences && orphanOccurrences.length > 0) {
      let updated = 0;
      for (const occ of orphanOccurrences) {
        // Buscar class_id do aluno
        const { data: student } = await supabase
          .from('students')
          .select('class_id')
          .eq('id', occ.student_id)
          .single();

        if (student?.class_id) {
          const { error: updateError } = await supabase
            .from('occurrences')
            .update({ class_id_at_occurrence: student.class_id })
            .eq('id', occ.id);

          if (!updateError) updated++;
        }
      }
      results.push({
        step: 'Preencher class_id_at_occurrence',
        success: true,
        affected: updated
      });
    } else {
      results.push({
        step: 'Preencher class_id_at_occurrence',
        success: true,
        affected: 0
      });
    }

    // 3. Desativar alert_rules que referenciam alunos inativos
    const { data: inactiveStudentRules } = await supabase
      .from('alert_rules')
      .select('id, scope_student_id')
      .eq('is_active', true)
      .not('scope_student_id', 'is', null);

    if (inactiveStudentRules && inactiveStudentRules.length > 0) {
      let deactivated = 0;
      for (const rule of inactiveStudentRules) {
        const { data: student } = await supabase
          .from('students')
          .select('is_active, deleted_at')
          .eq('id', rule.scope_student_id)
          .single();

        if (student && (!student.is_active || student.deleted_at)) {
          const { error } = await supabase
            .from('alert_rules')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', rule.id);

          if (!error) deactivated++;
        }
      }
      results.push({
        step: 'Desativar alert_rules de alunos inativos',
        success: true,
        affected: deactivated
      });
    } else {
      results.push({
        step: 'Desativar alert_rules de alunos inativos',
        success: true,
        affected: 0
      });
    }

    // 4. Desativar alert_rules que referenciam turmas inativas
    const { data: inactiveClassRules } = await supabase
      .from('alert_rules')
      .select('id, scope_class_id')
      .eq('is_active', true)
      .not('scope_class_id', 'is', null);

    if (inactiveClassRules && inactiveClassRules.length > 0) {
      let deactivated = 0;
      for (const rule of inactiveClassRules) {
        const { data: classData } = await supabase
          .from('classes')
          .select('is_active, deleted_at')
          .eq('id', rule.scope_class_id)
          .single();

        if (classData && (!classData.is_active || classData.deleted_at)) {
          const { error } = await supabase
            .from('alert_rules')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', rule.id);

          if (!error) deactivated++;
        }
      }
      results.push({
        step: 'Desativar alert_rules de turmas inativas',
        success: true,
        affected: deactivated
      });
    } else {
      results.push({
        step: 'Desativar alert_rules de turmas inativas',
        success: true,
        affected: 0
      });
    }

    // 5. Desativar alert_rules que referenciam tipos de ocorrência inativos
    const { data: inactiveTypeRules } = await supabase
      .from('alert_rules')
      .select('id, filter_occurrence_type_id')
      .eq('is_active', true)
      .not('filter_occurrence_type_id', 'is', null);

    if (inactiveTypeRules && inactiveTypeRules.length > 0) {
      let deactivated = 0;
      for (const rule of inactiveTypeRules) {
        const { data: occType } = await supabase
          .from('occurrence_types')
          .select('is_active, deleted_at')
          .eq('id', rule.filter_occurrence_type_id)
          .single();

        if (occType && (!occType.is_active || occType.deleted_at)) {
          const { error } = await supabase
            .from('alert_rules')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', rule.id);

          if (!error) deactivated++;
        }
      }
      results.push({
        step: 'Desativar alert_rules de tipos inativos',
        success: true,
        affected: deactivated
      });
    } else {
      results.push({
        step: 'Desativar alert_rules de tipos inativos',
        success: true,
        affected: 0
      });
    }

    // 6. Criar anos letivos para turmas órfãs (sem school_year_id)
    const { data: orphanClasses } = await supabase
      .from('classes')
      .select('id, institution_id, year')
      .is('school_year_id', null)
      .is('deleted_at', null);

    if (orphanClasses && orphanClasses.length > 0) {
      // Agrupar por institution_id e year
      const groups: Record<string, { institution_id: string; year: number; classIds: string[] }> = {};

      for (const cls of orphanClasses) {
        const key = `${cls.institution_id}-${cls.year}`;
        if (!groups[key]) {
          groups[key] = { institution_id: cls.institution_id, year: cls.year, classIds: [] };
        }
        groups[key].classIds.push(cls.id);
      }

      let created = 0;
      const currentYear = new Date().getFullYear();

      for (const group of Object.values(groups)) {
        // Verificar se já existe um school_year para essa instituição/ano
        const { data: existingYear } = await supabase
          .from('school_years')
          .select('id')
          .eq('institution_id', group.institution_id)
          .eq('year', group.year)
          .single();

        let schoolYearId: string;

        if (existingYear) {
          schoolYearId = existingYear.id;
        } else {
          // Criar novo school_year
          const { data: newYear, error: createError } = await supabase
            .from('school_years')
            .insert({
              institution_id: group.institution_id,
              year: group.year,
              name: `Ano Letivo ${group.year}`,
              is_current: group.year === currentYear,
              is_archived: group.year < currentYear,
            })
            .select('id')
            .single();

          if (createError || !newYear) continue;
          schoolYearId = newYear.id;
          created++;
        }

        // Vincular turmas ao ano letivo
        await supabase
          .from('classes')
          .update({ school_year_id: schoolYearId })
          .in('id', group.classIds);
      }

      results.push({
        step: 'Criar/vincular anos letivos para turmas órfãs',
        success: true,
        affected: created
      });
    } else {
      results.push({
        step: 'Criar/vincular anos letivos para turmas órfãs',
        success: true,
        affected: 0
      });
    }

    // Resumo final
    const allSuccess = results.every(r => r.success);
    const totalAffected = results.reduce((sum, r) => sum + (r.affected || 0), 0);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? `Migration de governança concluída. ${totalAffected} registros atualizados.`
        : 'Migration concluída com alguns erros.',
      results,
      note: 'IMPORTANTE: Execute também o SQL no Supabase para adicionar as colunas deleted_at e deleted_by em occurrences e alert_rules.',
      sqlToRun: `
-- Execute este SQL no Supabase SQL Editor:
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_occurrences_active ON occurrences (institution_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_occurrences_student_active ON occurrences (student_id, deleted_at) WHERE deleted_at IS NULL;
      `.trim()
    });

  } catch (error) {
    console.error('Erro na migration de governança:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao executar migration',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        results
      },
      { status: 500 }
    );
  }
}

// GET - Verificar status da migration
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Verificar ocorrências sem class_id_at_occurrence
    const { count: orphanOccurrences } = await supabase
      .from('occurrences')
      .select('id', { count: 'exact', head: true })
      .is('class_id_at_occurrence', null);

    // Verificar turmas sem school_year_id
    const { count: orphanClasses } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .is('school_year_id', null)
      .is('deleted_at', null);

    // Verificar alert_rules potencialmente inválidas
    const { data: potentiallyInvalidRules } = await supabase
      .from('alert_rules')
      .select('id, scope_student_id, scope_class_id, filter_occurrence_type_id')
      .eq('is_active', true);

    let invalidRulesCount = 0;
    if (potentiallyInvalidRules) {
      for (const rule of potentiallyInvalidRules) {
        if (rule.scope_student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('is_active, deleted_at')
            .eq('id', rule.scope_student_id)
            .single();
          if (student && (!student.is_active || student.deleted_at)) invalidRulesCount++;
        }
        if (rule.scope_class_id) {
          const { data: cls } = await supabase
            .from('classes')
            .select('is_active, deleted_at')
            .eq('id', rule.scope_class_id)
            .single();
          if (cls && (!cls.is_active || cls.deleted_at)) invalidRulesCount++;
        }
      }
    }

    const needsMigration = (orphanOccurrences || 0) > 0 || (orphanClasses || 0) > 0 || invalidRulesCount > 0;

    return NextResponse.json({
      success: true,
      needsMigration,
      status: {
        orphanOccurrences: orphanOccurrences || 0,
        orphanClasses: orphanClasses || 0,
        invalidAlertRules: invalidRulesCount,
      },
      message: needsMigration
        ? 'Migration necessária. Execute POST /api/setup/migrate-governanca'
        : 'Banco de dados está consistente.',
    });

  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao verificar status',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
