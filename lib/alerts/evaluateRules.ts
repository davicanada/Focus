import { createServiceClient } from '@/lib/supabase/server';
import { sendAlertEmail } from '@/lib/email/sendVerificationEmail';
import type { AlertRule, Occurrence, OccurrenceType } from '@/types';

interface EvaluationContext {
  occurrence: Occurrence & { occurrence_type?: OccurrenceType };
  institutionId: string;
}

interface AlertRuleWithRelations extends Omit<AlertRule, 'created_by_user'> {
  occurrence_type?: OccurrenceType;
  created_by_user?: { email: string; full_name: string };
}

/**
 * Avalia todas as regras de alerta ativas para uma nova ocorrencia
 * Chamada apos cada nova ocorrencia ser registrada
 */
export async function evaluateAlertRules(ctx: EvaluationContext): Promise<void> {
  const supabase = createServiceClient();

  try {
    // 1. Buscar regras ativas da instituicao
    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select(`
        *,
        occurrence_type:occurrence_types(*),
        created_by_user:users!created_by(email, full_name)
      `)
      .eq('institution_id', ctx.institutionId)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching alert rules:', rulesError);
      return;
    }

    if (!rules?.length) return;

    // 2. Buscar informacoes do aluno (para verificar class_id)
    const { data: student } = await supabase
      .from('students')
      .select('id, class_id, full_name')
      .eq('id', ctx.occurrence.student_id)
      .single();

    // 3. Para cada regra, verificar se a ocorrencia se enquadra
    for (const rule of rules as AlertRuleWithRelations[]) {
      if (!matchesRule(rule, ctx.occurrence, student?.class_id)) continue;

      // 4. Se e alerta imediato, criar notificacao direto
      if (rule.is_immediate) {
        await createAlertNotificationIfNeeded(
          supabase,
          rule,
          ctx.occurrence,
          1, // count = 1 para alertas imediatos
          true // isImmediate
        );
        continue;
      }

      // 5. Contar ocorrencias no periodo
      const count = await countOccurrencesForRule(
        supabase,
        rule,
        ctx.institutionId,
        student?.class_id
      );

      // 6. Se atingiu threshold, criar notificacao (se nao existir recente)
      if (count >= rule.threshold_count) {
        await createAlertNotificationIfNeeded(
          supabase,
          rule,
          ctx.occurrence,
          count,
          false
        );
      }
    }
  } catch (error) {
    console.error('Error evaluating alert rules:', error);
  }
}

/**
 * Verifica se uma ocorrencia corresponde aos criterios de uma regra
 */
function matchesRule(
  rule: AlertRuleWithRelations,
  occurrence: EvaluationContext['occurrence'],
  studentClassId?: string
): boolean {
  // Verificar escopo
  if (rule.scope_type === 'student') {
    if (rule.scope_student_id !== occurrence.student_id) {
      return false;
    }
  }

  if (rule.scope_type === 'class') {
    if (rule.scope_class_id !== studentClassId) {
      return false;
    }
  }

  // Verificar filtro de tipo de ocorrencia
  if (rule.filter_type === 'occurrence_type') {
    if (rule.filter_occurrence_type_id !== occurrence.occurrence_type_id) {
      return false;
    }
  }

  // Verificar filtro de severidade
  if (rule.filter_type === 'severity' && rule.filter_severity) {
    const occurrenceSeverity = occurrence.occurrence_type?.severity;
    if (occurrenceSeverity !== rule.filter_severity) {
      return false;
    }
  }

  return true;
}

/**
 * Conta ocorrencias que correspondem a regra no periodo especificado
 */
async function countOccurrencesForRule(
  supabase: ReturnType<typeof createServiceClient>,
  rule: AlertRuleWithRelations,
  institutionId: string,
  studentClassId?: string
): Promise<number> {
  // Se threshold_period_days for null ou 0, retorna 1 (para alertas imediatos)
  if (!rule.threshold_period_days) {
    return 1;
  }

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - rule.threshold_period_days);

  // Query base
  let query = supabase
    .from('occurrences')
    .select('id, occurrence_type_id', { count: 'exact' })
    .eq('institution_id', institutionId)
    .gte('occurrence_date', periodStart.toISOString().split('T')[0]);

  // Aplicar filtros de escopo
  if (rule.scope_type === 'student' && rule.scope_student_id) {
    query = query.eq('student_id', rule.scope_student_id);
  }

  if (rule.scope_type === 'class' && rule.scope_class_id) {
    // Para filtrar por turma, precisamos fazer um JOIN via students
    // Usando uma subquery approach
    const { data: classStudents } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', rule.scope_class_id)
      .eq('is_active', true);

    if (classStudents?.length) {
      const studentIds = classStudents.map(s => s.id);
      query = query.in('student_id', studentIds);
    } else {
      return 0; // Nenhum aluno na turma
    }
  }

  // Aplicar filtros de tipo
  if (rule.filter_type === 'occurrence_type' && rule.filter_occurrence_type_id) {
    query = query.eq('occurrence_type_id', rule.filter_occurrence_type_id);
  }

  if (rule.filter_type === 'severity' && rule.filter_severity) {
    // Buscar todos os tipos de ocorrencia com essa severidade
    const { data: matchingTypes } = await supabase
      .from('occurrence_types')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('severity', rule.filter_severity);

    if (matchingTypes?.length) {
      const typeIds = matchingTypes.map(t => t.id);
      query = query.in('occurrence_type_id', typeIds);
    } else {
      return 0; // Nenhum tipo com essa severidade
    }
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting occurrences:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Cria uma notificacao de alerta se nao houver uma recente (cooldown de 1 hora)
 * Para alertas imediatos, nao aplica cooldown
 */
async function createAlertNotificationIfNeeded(
  supabase: ReturnType<typeof createServiceClient>,
  rule: AlertRuleWithRelations,
  occurrence: Occurrence,
  count: number,
  isImmediate: boolean
): Promise<void> {
  // Para alertas nao-imediatos, verificar cooldown de 1 hora
  if (!isImmediate) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentNotification } = await supabase
      .from('alert_notifications')
      .select('id')
      .eq('alert_rule_id', rule.id)
      .gte('triggered_at', oneHourAgo)
      .limit(1)
      .single();

    if (recentNotification) {
      // Ja existe notificacao recente, nao criar outra
      return;
    }
  }

  // Construir mensagem da notificacao
  const message = buildAlertMessage(rule, count, isImmediate);

  // Criar notificacao
  const { error: insertError } = await supabase
    .from('alert_notifications')
    .insert({
      alert_rule_id: rule.id,
      institution_id: rule.institution_id,
      triggered_by_occurrence_id: occurrence.id,
      rule_name: rule.name,
      message,
      occurrence_count: count,
    });

  if (insertError) {
    console.error('Error creating alert notification:', insertError);
    return;
  }

  // Atualizar estatisticas da regra
  await supabase
    .from('alert_rules')
    .update({
      last_triggered_at: new Date().toISOString(),
      trigger_count: (rule.trigger_count || 0) + 1,
    })
    .eq('id', rule.id);

  console.log(`Alert triggered: ${rule.name} (${count} occurrences)`);

  // Enviar email baseado no notify_target
  await sendAlertEmails(supabase, rule, message);
}

/**
 * Envia emails de alerta baseado no notify_target da regra
 */
async function sendAlertEmails(
  supabase: ReturnType<typeof createServiceClient>,
  rule: AlertRuleWithRelations,
  message: string
): Promise<void> {
  try {
    const recipients: Array<{ email: string; name: string }> = [];

    if (rule.notify_target === 'all_admins') {
      // Buscar todos os admins da instituicao
      const { data: admins } = await supabase
        .from('user_institutions')
        .select(`
          users!inner(email, full_name)
        `)
        .eq('institution_id', rule.institution_id)
        .in('role', ['admin', 'admin_viewer'])
        .eq('is_active', true);

      if (admins) {
        for (const admin of admins) {
          const user = admin.users as unknown as { email: string; full_name: string };
          if (user?.email) {
            recipients.push({ email: user.email, name: user.full_name || 'Admin' });
          }
        }
      }
    } else {
      // notify_target === 'self' - enviar apenas para o criador da regra
      if (rule.created_by_user?.email) {
        recipients.push({
          email: rule.created_by_user.email,
          name: rule.created_by_user.full_name || 'Admin',
        });
      }
    }

    // Enviar email para cada destinatario
    for (const recipient of recipients) {
      try {
        await sendAlertEmail(recipient.email, recipient.name, rule.name, message);
        console.log(`Alert email sent to ${recipient.email}`);
      } catch (emailError) {
        console.error(`Failed to send alert email to ${recipient.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error('Error sending alert emails:', error);
  }
}

/**
 * Constroi a mensagem de alerta baseada na regra
 */
function buildAlertMessage(rule: AlertRuleWithRelations, count: number, isImmediate: boolean): string {
  let scopeText = '';
  if (rule.scope_type === 'student') {
    scopeText = 'do aluno monitorado';
  } else if (rule.scope_type === 'class') {
    scopeText = 'na turma monitorada';
  } else {
    scopeText = 'na instituicao';
  }

  let filterText = '';
  if (rule.filter_type === 'occurrence_type') {
    filterText = 'do tipo configurado';
  } else if (rule.filter_type === 'severity') {
    filterText = `de severidade ${rule.filter_severity}`;
  } else {
    filterText = '';
  }

  if (isImmediate) {
    return `Nova ocorrencia ${filterText} ${scopeText} foi registrada.`.replace('  ', ' ');
  }

  return `${count} ocorrencia(s) ${filterText} ${scopeText} nos ultimos ${rule.threshold_period_days} dias.`.replace('  ', ' ');
}
