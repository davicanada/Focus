import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST - Adicionar colunas de soft delete usando RPC exec_sql
export async function POST() {
  try {
    const supabase = createServiceClient();

    // SQL para adicionar colunas
    const sql = `
      -- Adicionar colunas de soft delete em occurrences
      ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

      -- Adicionar coluna deleted_at em alert_rules
      ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

      -- Criar índices para performance
      CREATE INDEX IF NOT EXISTS idx_occurrences_active ON occurrences (institution_id, deleted_at) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_occurrences_student_active ON occurrences (student_id, deleted_at) WHERE deleted_at IS NULL;
    `;

    // Tentar executar via RPC exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Se a função não existe, retornar instruções para executar manualmente
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          message: 'A função exec_sql não existe no Supabase. Execute o SQL manualmente.',
          sqlToRun: sql.trim(),
          instructions: [
            '1. Acesse o Supabase Dashboard: https://supabase.com/dashboard',
            '2. Vá em SQL Editor',
            '3. Cole e execute o SQL acima',
            '4. Ou crie a função exec_sql para permitir execução via API'
          ]
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        message: 'Erro ao executar SQL',
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Colunas de soft delete adicionadas com sucesso!'
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar requisição',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// GET - Verificar se as colunas existem
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Tentar selecionar as colunas para ver se existem
    const { data, error } = await supabase
      .from('occurrences')
      .select('id, deleted_at, deleted_by')
      .limit(1);

    if (error) {
      // Se o erro for sobre coluna não existir
      if (error.message.includes('column') &&
          (error.message.includes('deleted_at') || error.message.includes('deleted_by'))) {
        return NextResponse.json({
          success: true,
          columnsExist: false,
          message: 'Colunas deleted_at/deleted_by NÃO existem em occurrences. Execute POST para adicionar.'
        });
      }

      return NextResponse.json({
        success: false,
        message: 'Erro ao verificar colunas',
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      columnsExist: true,
      message: 'Colunas deleted_at e deleted_by JÁ existem em occurrences.'
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
