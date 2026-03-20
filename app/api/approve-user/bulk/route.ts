import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email/sendVerificationEmail';
import { generateSecurePassword, reactivateUser, findInactiveUserInstitution, findActiveUserInstitution } from '@/lib/reactivate-user';

export const dynamic = 'force-dynamic';

interface ApprovalResult {
  request_id: string;
  success: boolean;
  email?: string;
  reactivated?: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_ids, reviewer_id } = body;

    if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs de solicitacoes e obrigatoria' },
        { status: 400 }
      );
    }

    if (!reviewer_id) {
      return NextResponse.json(
        { error: 'ID do revisor e obrigatorio' },
        { status: 400 }
      );
    }

    // Limite de seguranca: maximo 50 aprovacoes por vez
    if (request_ids.length > 50) {
      return NextResponse.json(
        { error: 'Limite maximo de 50 aprovacoes por vez' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const results: ApprovalResult[] = [];

    // Buscar todas as solicitacoes pendentes
    const { data: accessRequests, error: fetchError } = await supabase
      .from('access_requests')
      .select('*')
      .in('id', request_ids)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching requests:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar solicitacoes' },
        { status: 500 }
      );
    }

    if (!accessRequests || accessRequests.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma solicitacao pendente encontrada' },
        { status: 404 }
      );
    }

    // Processar cada solicitacao
    for (const accessRequest of accessRequests) {
      try {
        let institutionId = accessRequest.institution_id;

        // Criar instituicao se for nova
        if (accessRequest.request_type === 'admin_new') {
          const { data: newInstitution, error: institutionError } = await supabase
            .from('institutions')
            .insert({
              name: accessRequest.institution_name,
              slug: generateSlug(accessRequest.institution_name),
              full_address: accessRequest.institution_full_address,
              street: accessRequest.institution_street,
              number: accessRequest.institution_number,
              neighborhood: accessRequest.institution_neighborhood,
              city: accessRequest.institution_city,
              state: accessRequest.institution_state,
              state_code: accessRequest.institution_state_code,
              postal_code: accessRequest.institution_postal_code,
              country: accessRequest.institution_country,
              latitude: accessRequest.institution_latitude,
              longitude: accessRequest.institution_longitude,
              is_active: true,
            })
            .select()
            .single();

          if (institutionError) {
            console.error('Error creating institution:', institutionError);
            results.push({
              request_id: accessRequest.id,
              success: false,
              email: accessRequest.email,
              error: 'Erro ao criar instituicao',
            });
            continue;
          }

          institutionId = newInstitution.id;
        }

        const role = accessRequest.request_type === 'professor'
          ? 'professor'
          : accessRequest.request_type === 'admin_viewer'
            ? 'admin_viewer'
            : 'admin';

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('email', accessRequest.email)
          .single();

        let userId: string;
        let isNewUser = false;

        if (existingUser) {
          userId = existingUser.id;

          // Check if already actively linked
          const activeLink = await findActiveUserInstitution(supabase, {
            userId: existingUser.id,
            institutionId: institutionId!,
          });

          if (activeLink) {
            // Already active — just update access request
            await supabase.from('access_requests').update({
              status: 'approved',
              reviewed_by: reviewer_id,
              reviewed_at: new Date().toISOString(),
            }).eq('id', accessRequest.id);

            results.push({
              request_id: accessRequest.id,
              success: true,
              email: accessRequest.email,
            });
            continue;
          }

          // Check for inactive link — reactivate
          const inactiveLink = await findInactiveUserInstitution(supabase, {
            userId: existingUser.id,
            institutionId: institutionId!,
          });

          if (inactiveLink) {
            const result = await reactivateUser(supabase, {
              userId: existingUser.id,
              userInstitutionId: inactiveLink.id,
              institutionId: institutionId!,
              newRole: role,
              reactivatedBy: reviewer_id,
              userName: existingUser.full_name,
              userEmail: existingUser.email,
            });

            await supabase.from('access_requests').update({
              status: 'approved',
              reviewed_by: reviewer_id,
              reviewed_at: new Date().toISOString(),
            }).eq('id', accessRequest.id);

            results.push({
              request_id: accessRequest.id,
              success: result.success,
              email: accessRequest.email,
              reactivated: true,
              error: result.error,
            });
            continue;
          }

          // User exists but no link — reactivate user record if needed
          await supabase
            .from('users')
            .update({ is_active: true, deleted_at: null, deactivation_reason: null, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .not('deleted_at', 'is', null);
        } else {
          // New user — create auth + users record
          const tempPassword = generateSecurePassword();

          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: accessRequest.email,
            password: tempPassword,
            email_confirm: true,
          });

          if (authError) {
            console.error('Error creating auth user:', authError);
            results.push({
              request_id: accessRequest.id,
              success: false,
              email: accessRequest.email,
              error: 'Erro ao criar usuario de autenticacao',
            });
            continue;
          }

          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: accessRequest.email,
              full_name: accessRequest.full_name,
              is_active: true,
              is_master: false,
            })
            .select()
            .single();

          if (userError) {
            console.error('Error creating user:', userError);
            await supabase.auth.admin.deleteUser(authData.user.id);
            results.push({
              request_id: accessRequest.id,
              success: false,
              email: accessRequest.email,
              error: 'Erro ao criar usuario',
            });
            continue;
          }

          userId = newUser.id;
          isNewUser = true;

          // Send welcome email for new users
          try {
            await sendWelcomeEmail(accessRequest.email, accessRequest.full_name, tempPassword);
          } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
          }
        }

        // Create user_institutions link (for existing user without link, or new user)
        const { error: relationError } = await supabase
          .from('user_institutions')
          .insert({
            user_id: userId,
            institution_id: institutionId,
            role,
            is_active: true,
          });

        if (relationError) {
          console.error('Error creating user-institution relation:', relationError);
          if (isNewUser) {
            await supabase.from('users').delete().eq('id', userId);
            await supabase.auth.admin.deleteUser(userId);
          }
          results.push({
            request_id: accessRequest.id,
            success: false,
            email: accessRequest.email,
            error: 'Erro ao vincular usuario a instituicao',
          });
          continue;
        }

        // Update access request status
        await supabase
          .from('access_requests')
          .update({
            status: 'approved',
            reviewed_by: reviewer_id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', accessRequest.id);

        results.push({
          request_id: accessRequest.id,
          success: true,
          email: accessRequest.email,
        });

      } catch (error) {
        console.error('Error processing request:', accessRequest.id, error);
        results.push({
          request_id: accessRequest.id,
          success: false,
          email: accessRequest.email,
          error: 'Erro interno ao processar solicitacao',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} aprovado(s), ${failCount} falha(s)`,
      total: results.length,
      successCount,
      failCount,
      results,
    });

  } catch (error) {
    console.error('Error in bulk approve:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
