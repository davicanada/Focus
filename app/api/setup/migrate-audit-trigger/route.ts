import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

// POST - Executar migration do trigger de auditoria
export async function POST() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Criar função de auditoria
    await client.query(`
      CREATE OR REPLACE FUNCTION audit_occurrence_changes()
      RETURNS TRIGGER AS $$
      DECLARE
        v_action TEXT;
        v_details JSONB;
        v_user_id UUID;
      BEGIN
        -- Determinar ação e usuário
        IF TG_OP = 'INSERT' THEN
          v_action := 'occurrence_create';
          v_user_id := NEW.registered_by;
          v_details := jsonb_build_object(
            'student_id', NEW.student_id,
            'occurrence_type_id', NEW.occurrence_type_id,
            'occurrence_date', NEW.occurrence_date,
            'description', COALESCE(NEW.description, ''),
            'class_id_at_occurrence', NEW.class_id_at_occurrence
          );

          INSERT INTO system_logs (user_id, institution_id, action, entity_type, entity_id, details, created_at)
          VALUES (v_user_id, NEW.institution_id, v_action, 'occurrence', NEW.id, v_details, NOW());

          RETURN NEW;

        ELSIF TG_OP = 'UPDATE' THEN
          -- Verificar se é soft delete
          IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            v_action := 'occurrence_delete';
            v_user_id := COALESCE(NEW.deleted_by, NEW.registered_by);
            v_details := jsonb_build_object(
              'student_id', OLD.student_id,
              'occurrence_type_id', OLD.occurrence_type_id,
              'occurrence_date', OLD.occurrence_date,
              'deleted_by', NEW.deleted_by,
              'reason', 'soft_delete'
            );
          ELSE
            -- É uma edição normal
            v_action := 'occurrence_update';
            v_user_id := NEW.registered_by;

            -- Construir objeto de mudanças (apenas campos que mudaram)
            v_details := jsonb_build_object(
              'student_id', OLD.student_id,
              'changes', (
                SELECT jsonb_strip_nulls(jsonb_build_object(
                  'occurrence_type_id', CASE
                    WHEN OLD.occurrence_type_id IS DISTINCT FROM NEW.occurrence_type_id
                    THEN jsonb_build_object('old', OLD.occurrence_type_id, 'new', NEW.occurrence_type_id)
                    ELSE NULL
                  END,
                  'occurrence_date', CASE
                    WHEN OLD.occurrence_date IS DISTINCT FROM NEW.occurrence_date
                    THEN jsonb_build_object('old', OLD.occurrence_date, 'new', NEW.occurrence_date)
                    ELSE NULL
                  END,
                  'description', CASE
                    WHEN OLD.description IS DISTINCT FROM NEW.description
                    THEN jsonb_build_object('old', COALESCE(OLD.description, ''), 'new', COALESCE(NEW.description, ''))
                    ELSE NULL
                  END
                ))
              )
            );
          END IF;

          INSERT INTO system_logs (user_id, institution_id, action, entity_type, entity_id, details, created_at)
          VALUES (v_user_id, NEW.institution_id, v_action, 'occurrence', NEW.id, v_details, NOW());

          RETURN NEW;
        END IF;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✓ Função audit_occurrence_changes criada');

    // 2. Remover trigger existente se houver
    await client.query(`DROP TRIGGER IF EXISTS occurrence_audit_trigger ON occurrences;`);
    console.log('✓ Trigger antigo removido (se existia)');

    // 3. Criar trigger
    await client.query(`
      CREATE TRIGGER occurrence_audit_trigger
      AFTER INSERT OR UPDATE ON occurrences
      FOR EACH ROW EXECUTE FUNCTION audit_occurrence_changes();
    `);
    console.log('✓ Trigger occurrence_audit_trigger criado');

    // 4. Adicionar índices para melhorar performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_entity_type ON system_logs(entity_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_institution_id ON system_logs(institution_id);`);
    console.log('✓ Índices criados');

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Migration do trigger de auditoria executada com sucesso',
      details: [
        'Função audit_occurrence_changes criada',
        'Trigger occurrence_audit_trigger criado',
        'Índices de performance criados'
      ]
    });
  } catch (error) {
    console.error('Erro na migration:', error);
    await client.end();
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
