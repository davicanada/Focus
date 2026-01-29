import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// API para corrigir a constraint de role que impede admin_viewer
// Executar uma vez: GET /api/setup/fix-role-constraint
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Usar RPC para executar SQL direto (se existir função admin)
    // Como não temos função admin, vamos usar uma abordagem diferente

    // Primeiro, tentar inserir um registro de teste para ver se a constraint foi atualizada
    const testResult = await supabase
      .from('user_institutions')
      .select('role')
      .eq('role', 'admin_viewer')
      .limit(1);

    console.log('Test query result:', testResult);

    // A constraint precisa ser atualizada via Supabase Dashboard SQL Editor
    // Retornar instruções
    return NextResponse.json({
      success: false,
      message: 'A constraint precisa ser atualizada manualmente no Supabase Dashboard',
      sql: `
-- Execute este SQL no Supabase Dashboard > SQL Editor:

-- 1. Remover constraint antiga
ALTER TABLE user_institutions DROP CONSTRAINT IF EXISTS user_institutions_role_check;

-- 2. Adicionar nova constraint com admin_viewer
ALTER TABLE user_institutions
ADD CONSTRAINT user_institutions_role_check
CHECK (role IN ('admin', 'professor', 'admin_viewer'));
      `.trim(),
      instructions: [
        '1. Abra o Supabase Dashboard: https://supabase.com/dashboard/project/jtxfqsojicjtabtslqvf',
        '2. Vá em SQL Editor',
        '3. Cole e execute o SQL acima',
        '4. Teste novamente a mudança de função'
      ]
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar constraint', details: String(error) },
      { status: 500 }
    );
  }
}
