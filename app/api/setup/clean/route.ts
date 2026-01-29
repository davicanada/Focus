import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// API para limpar TODOS os dados do banco (exceto master user)
// CUIDADO: Esta operacao e irreversivel!

export async function POST(request: Request) {
  try {
    // Verificar se foi passado o token de confirmacao
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'LIMPAR_TUDO') {
      return NextResponse.json({
        success: false,
        error: 'Confirmacao necessaria. Envie { "confirm": "LIMPAR_TUDO" } no body.',
      }, { status: 400 });
    }

    const supabase = createServiceClient();
    const report: {
      deleted: { [key: string]: number };
      errors: string[];
    } = {
      deleted: {},
      errors: [],
    };

    // Ordem de delecao respeitando foreign keys
    // (mesmo com CASCADE, e melhor deletar na ordem correta)

    // 1. Deletar ocorrencias
    const { data: occData, error: occError } = await supabase
      .from('occurrences')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (occError) {
      report.errors.push(`Ocorrencias: ${occError.message}`);
    } else {
      report.deleted.occurrences = occData?.length || 0;
    }

    // 2. Deletar alunos
    const { data: studData, error: studError } = await supabase
      .from('students')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (studError) {
      report.errors.push(`Alunos: ${studError.message}`);
    } else {
      report.deleted.students = studData?.length || 0;
    }

    // 3. Deletar turmas
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (classError) {
      report.errors.push(`Turmas: ${classError.message}`);
    } else {
      report.deleted.classes = classData?.length || 0;
    }

    // 4. Deletar tipos de ocorrencia
    const { data: typeData, error: typeError } = await supabase
      .from('occurrence_types')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (typeError) {
      report.errors.push(`Tipos de ocorrencia: ${typeError.message}`);
    } else {
      report.deleted.occurrence_types = typeData?.length || 0;
    }

    // 5. Deletar bimestres
    const { data: quarterData, error: quarterError } = await supabase
      .from('quarters')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (quarterError) {
      report.errors.push(`Bimestres: ${quarterError.message}`);
    } else {
      report.deleted.quarters = quarterData?.length || 0;
    }

    // 6. Deletar vinculos user_institutions (exceto master)
    // Primeiro buscar master user
    const { data: masterUser } = await supabase
      .from('users')
      .select('id')
      .eq('is_master', true)
      .single();

    const { data: uiData, error: uiError } = await supabase
      .from('user_institutions')
      .delete()
      .neq('user_id', masterUser?.id || '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (uiError) {
      report.errors.push(`Vinculos user_institutions: ${uiError.message}`);
    } else {
      report.deleted.user_institutions = uiData?.length || 0;
    }

    // 7. Deletar solicitacoes de acesso
    const { data: arData, error: arError } = await supabase
      .from('access_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (arError) {
      report.errors.push(`Solicitacoes de acesso: ${arError.message}`);
    } else {
      report.deleted.access_requests = arData?.length || 0;
    }

    // 8. Deletar logs do sistema
    const { data: logData, error: logError } = await supabase
      .from('system_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (logError) {
      report.errors.push(`Logs do sistema: ${logError.message}`);
    } else {
      report.deleted.system_logs = logData?.length || 0;
    }

    // 9. Deletar usuarios (exceto master)
    const { data: nonMasterUsers } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_master', false);

    let deletedUsersCount = 0;
    if (nonMasterUsers) {
      for (const user of nonMasterUsers) {
        // Deletar do Auth primeiro
        const { error: authDelError } = await supabase.auth.admin.deleteUser(user.id);
        if (authDelError) {
          report.errors.push(`Auth delete ${user.email}: ${authDelError.message}`);
        }

        // Deletar da tabela users
        const { error: userDelError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);

        if (userDelError) {
          report.errors.push(`User delete ${user.email}: ${userDelError.message}`);
        } else {
          deletedUsersCount++;
        }
      }
    }
    report.deleted.users = deletedUsersCount;

    // 10. Deletar instituicoes
    const { data: instData, error: instError } = await supabase
      .from('institutions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id');

    if (instError) {
      report.errors.push(`Instituicoes: ${instError.message}`);
    } else {
      report.deleted.institutions = instData?.length || 0;
    }

    return NextResponse.json({
      success: report.errors.length === 0,
      message: report.errors.length === 0
        ? 'Banco de dados limpo com sucesso!'
        : 'Limpeza concluida com alguns erros',
      report,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST com { "confirm": "LIMPAR_TUDO" } para limpar o banco de dados',
    warning: 'Esta operacao e IRREVERSIVEL! Todos os dados serao excluidos (exceto master user).',
  });
}
