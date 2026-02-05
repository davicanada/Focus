import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

// Migration para criar tabela feedback_action_types
// Permite que admins configurem os tipos de ação disponíveis para devolutivas

export async function POST() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Criar tabela feedback_action_types
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback_action_types (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          icon VARCHAR(50) DEFAULT 'MessageCircle',
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(institution_id, name)
      );
    `);

    // 2. Criar índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_action_types_institution
      ON feedback_action_types(institution_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_action_types_active
      ON feedback_action_types(institution_id, is_active);
    `);

    // 3. Habilitar RLS
    await client.query(`
      ALTER TABLE feedback_action_types ENABLE ROW LEVEL SECURITY;
    `);

    // 4. Criar policies (drop se existir para evitar erro de duplicata)
    await client.query(`
      DROP POLICY IF EXISTS "Users can read own institution feedback action types" ON feedback_action_types;
      CREATE POLICY "Users can read own institution feedback action types"
      ON feedback_action_types FOR SELECT
      USING (
          institution_id IN (
              SELECT institution_id FROM user_institutions
              WHERE user_id = auth.uid() AND deleted_at IS NULL
          )
      );
    `);

    await client.query(`
      DROP POLICY IF EXISTS "Admins can insert feedback action types" ON feedback_action_types;
      CREATE POLICY "Admins can insert feedback action types"
      ON feedback_action_types FOR INSERT
      WITH CHECK (
          institution_id IN (
              SELECT institution_id FROM user_institutions
              WHERE user_id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
          )
      );
    `);

    await client.query(`
      DROP POLICY IF EXISTS "Admins can update feedback action types" ON feedback_action_types;
      CREATE POLICY "Admins can update feedback action types"
      ON feedback_action_types FOR UPDATE
      USING (
          institution_id IN (
              SELECT institution_id FROM user_institutions
              WHERE user_id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
          )
      );
    `);

    await client.query(`
      DROP POLICY IF EXISTS "Admins can delete feedback action types" ON feedback_action_types;
      CREATE POLICY "Admins can delete feedback action types"
      ON feedback_action_types FOR DELETE
      USING (
          institution_id IN (
              SELECT institution_id FROM user_institutions
              WHERE user_id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
          )
      );
    `);

    // 5. Inserir tipos padrão para instituições existentes
    const defaultTypes = [
      { name: 'Conversa com aluno', description: 'Conversa direta com o aluno sobre o ocorrido', icon: 'MessageCircle', sort_order: 1 },
      { name: 'Contato com responsável', description: 'Ligação ou mensagem para os pais/responsáveis', icon: 'Phone', sort_order: 2 },
      { name: 'Advertência verbal', description: 'Advertência verbal ao aluno', icon: 'AlertTriangle', sort_order: 3 },
      { name: 'Advertência escrita', description: 'Advertência formalizada por escrito', icon: 'FileText', sort_order: 4 },
      { name: 'Encaminhamento à coordenação', description: 'Caso encaminhado para a coordenação pedagógica', icon: 'ArrowRight', sort_order: 5 },
      { name: 'Encaminhamento à direção', description: 'Caso encaminhado para a direção da escola', icon: 'Building', sort_order: 6 },
      { name: 'Encaminhamento ao psicólogo', description: 'Encaminhamento para acompanhamento psicológico', icon: 'Heart', sort_order: 7 },
      { name: 'Suspensão', description: 'Aplicação de suspensão disciplinar', icon: 'UserX', sort_order: 8 },
      { name: 'Mediação de conflito', description: 'Mediação entre as partes envolvidas', icon: 'Users', sort_order: 9 },
      { name: 'Observação/Acompanhamento', description: 'Manter em observação e acompanhamento', icon: 'Eye', sort_order: 10 },
      { name: 'Caso resolvido', description: 'Situação considerada resolvida', icon: 'CheckCircle', sort_order: 11 },
      { name: 'Outra ação', description: 'Ação não listada acima', icon: 'MoreHorizontal', sort_order: 12 },
    ];

    // Buscar todas as instituições
    const { rows: institutions } = await client.query('SELECT id FROM institutions');

    let insertedCount = 0;
    for (const inst of institutions) {
      for (const type of defaultTypes) {
        try {
          await client.query(`
            INSERT INTO feedback_action_types (institution_id, name, description, icon, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (institution_id, name) DO NOTHING
          `, [inst.id, type.name, type.description, type.icon, type.sort_order]);
          insertedCount++;
        } catch {
          // Ignora erros de duplicata
        }
      }
    }

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Migration de feedback_action_types concluída com sucesso',
      details: {
        institutionsProcessed: institutions.length,
        typesInserted: insertedCount,
      }
    });

  } catch (error) {
    await client.end();
    console.error('Erro na migration:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao executar migration',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

// GET - Verificar status da migration
export async function GET() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Verificar se a tabela existe
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'feedback_action_types'
      ) as exists
    `);

    const tableExists = rows[0]?.exists;

    let typeCount = 0;
    if (tableExists) {
      const { rows: countRows } = await client.query('SELECT COUNT(*) as count FROM feedback_action_types');
      typeCount = parseInt(countRows[0]?.count || '0');
    }

    await client.end();

    return NextResponse.json({
      success: true,
      tableExists,
      typeCount,
      message: tableExists
        ? `Tabela existe com ${typeCount} tipos de ação cadastrados`
        : 'Tabela não existe. Execute POST para criar.',
    });

  } catch (error) {
    await client.end();
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
