import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/email/sendVerificationEmail';

export function generateSecurePassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

interface ReactivateUserParams {
  userId: string;
  userInstitutionId: string;
  institutionId: string;
  newRole: string;
  reactivatedBy: string;
  userName: string;
  userEmail: string;
}

/**
 * Reativa um usuario inativo: atualiza user_institutions e users,
 * gera nova senha, reseta no Auth, e envia email de boas-vindas.
 */
export async function reactivateUser(
  serviceClient: SupabaseClient,
  params: ReactivateUserParams
): Promise<{ success: boolean; error?: string }> {
  const { userId, userInstitutionId, institutionId, newRole, reactivatedBy, userName, userEmail } = params;

  try {
    const tempPassword = generateSecurePassword();

    // 1. Reativar user_institutions (SEMPRE setar ambos is_active + deleted_at)
    const { error: uiError } = await serviceClient
      .from('user_institutions')
      .update({
        is_active: true,
        deleted_at: null,
        role: newRole,
      })
      .eq('id', userInstitutionId);

    if (uiError) {
      console.error('Erro ao reativar user_institutions:', uiError);
      return { success: false, error: 'Erro ao reativar vínculo do usuário' };
    }

    // 2. Reativar users (SEMPRE setar ambos is_active + deleted_at)
    const { error: usersError } = await serviceClient
      .from('users')
      .update({
        is_active: true,
        deleted_at: null,
        deactivation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (usersError) {
      console.error('Erro ao reativar users:', usersError);
      return { success: false, error: 'Erro ao reativar registro do usuário' };
    }

    // 3. Resetar senha no Supabase Auth
    const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (authError) {
      console.error('Erro ao resetar senha no Auth:', authError);
      return { success: false, error: 'Erro ao resetar senha do usuário' };
    }

    // 4. Enviar email de boas-vindas com nova senha
    try {
      await sendWelcomeEmail(userEmail, userName, tempPassword);
      console.log('Email de boas-vindas enviado para:', userEmail);
    } catch (emailError) {
      console.error('Erro ao enviar email de boas-vindas:', emailError);
      // Não falhar a reativação por causa do email
    }

    // 5. Registrar em system_logs
    await serviceClient.from('system_logs').insert({
      user_id: reactivatedBy,
      institution_id: institutionId,
      action: 'user_reactivated',
      entity_type: 'user_institution',
      entity_id: userInstitutionId,
      details: {
        target_user_id: userId,
        new_role: newRole,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Erro na reativação do usuário:', error);
    return { success: false, error: 'Erro interno na reativação' };
  }
}

/**
 * Verifica se existe um vinculo inativo (soft-deleted) para um usuario em uma instituicao.
 * Retorna o registro inativo encontrado ou null.
 */
export async function findInactiveUserInstitution(
  serviceClient: SupabaseClient,
  params: { userId: string; institutionId: string }
) {
  const { data } = await serviceClient
    .from('user_institutions')
    .select('id, role, deleted_at, user_id')
    .eq('user_id', params.userId)
    .eq('institution_id', params.institutionId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Verifica se existe um vinculo ativo para um usuario em uma instituicao.
 */
export async function findActiveUserInstitution(
  serviceClient: SupabaseClient,
  params: { userId: string; institutionId: string }
) {
  const { data } = await serviceClient
    .from('user_institutions')
    .select('id, role')
    .eq('user_id', params.userId)
    .eq('institution_id', params.institutionId)
    .is('deleted_at', null)
    .maybeSingle();

  return data;
}
