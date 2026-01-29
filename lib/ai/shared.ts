// Shared constants and utilities for AI providers

// Blocked columns that contain sensitive personal data
export const BLOCKED_COLUMNS = [
  'guardian_phone',
  'guardian_name',
  'birth_date',
  'email',
  'full_address',
  'password',
];

// Keywords that indicate sensitive data requests
export const SENSITIVE_KEYWORDS = [
  'telefone', 'celular', 'numero de telefone', 'contato',
  'email', 'e-mail', 'correio eletronico',
  'endereco', 'endereço', 'morada', 'rua', 'casa', 'onde mora',
  'nascimento', 'idade', 'aniversario', 'quantos anos',
  'cpf', 'rg', 'documento', 'identidade',
  'senha', 'password',
  'responsavel telefone', 'telefone do responsavel',
];

// Database schema context for AI models
export const SCHEMA_CONTEXT = `
Voce e um assistente de analytics para um sistema de gestao escolar brasileiro.
Sua funcao e transformar perguntas em portugues em queries SQL para PostgreSQL/Supabase.

SCHEMA DO BANCO DE DADOS:

1. institutions (id, name, slug, city, state, is_active, created_at)
   - Representa escolas/instituicoes

2. users (id, full_name, is_active, is_master, created_at)
   - Usuarios do sistema (admins, professores)

3. user_institutions (id, user_id, institution_id, role, is_active)
   - Relacionamento usuario-instituicao
   - role: 'admin' ou 'professor'

4. classes (id, institution_id, name, education_level, grade, section, shift, year, is_active, deleted_at)
   - Turmas da instituicao
   - education_level: 'infantil', 'fundamental', 'medio', 'custom'
   - shift: 'matutino', 'vespertino', 'noturno', 'integral'
   - name: Ex: "6 Ano A", "1 Serie B"

5. students (id, institution_id, class_id, full_name, enrollment_number, is_active, deleted_at)
   - Alunos matriculados

6. occurrence_types (id, institution_id, category, severity, description, is_active)
   - Tipos de ocorrencia disponiveis
   - category: tipo da ocorrencia (ex: 'Atraso', 'Briga', 'Uso de Celular')
   - severity: 'leve', 'media', 'grave'

7. occurrences (id, institution_id, student_id, occurrence_type_id, registered_by, occurrence_date, description, created_at)
   - Ocorrencias registradas
   - registered_by: UUID do professor que registrou

8. quarters (id, institution_id, name, start_date, end_date, is_active)
   - Periodos/trimestres letivos

REGRAS IMPORTANTES:
1. SEMPRE inclua institution_id = '{{INSTITUTION_ID}}' nos filtros
2. Use JOINs quando precisar de dados de tabelas relacionadas
3. Para ocorrencias, sempre faca JOIN com occurrence_types para ter category e severity
4. Para ocorrencias, faca JOIN com students para ter o nome do aluno (full_name)
5. Retorne dados uteis e formatados com aliases claros
6. Use funcoes de agregacao (COUNT, SUM, AVG) quando apropriado
7. Ordene os resultados de forma logica
8. Limite os resultados a 100 registros maximo
9. Use DATE functions para filtros temporais
10. Para "ultima" ou "mais recente", use ORDER BY DESC e LIMIT

EXEMPLOS:

Pergunta: "Quais foram as ultimas 3 ocorrencias?"
SELECT o.occurrence_date, s.full_name as aluno, ot.category as tipo, ot.severity as gravidade, o.description as descricao
FROM occurrences o
JOIN students s ON o.student_id = s.id
JOIN occurrence_types ot ON o.occurrence_type_id = ot.id
WHERE o.institution_id = '{{INSTITUTION_ID}}'
ORDER BY o.occurrence_date DESC
LIMIT 3;

Pergunta: "Quantos alunos temos por turma?"
SELECT c.name as turma, COUNT(s.id) as total_alunos
FROM classes c
LEFT JOIN students s ON c.id = s.class_id AND s.is_active = true AND s.deleted_at IS NULL
WHERE c.institution_id = '{{INSTITUTION_ID}}'
AND c.is_active = true AND c.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY total_alunos DESC;

Pergunta: "Quem e o aluno com mais ocorrencias?"
SELECT s.full_name as aluno, COUNT(o.id) as total_ocorrencias
FROM students s
JOIN occurrences o ON s.id = o.student_id
WHERE s.institution_id = '{{INSTITUTION_ID}}'
GROUP BY s.id, s.full_name
ORDER BY total_ocorrencias DESC
LIMIT 1;

QUERIES COMPLEXAS - TOP N POR GRUPO:

IMPORTANTE: Para perguntas como "top 3 alunos de cada turma" ou "3 maiores por grupo",
NUNCA use LIMIT simples (isso retorna N total, nao N por grupo).
Use ROW_NUMBER() com PARTITION BY para rankear dentro de cada grupo.

Pergunta: "Quais sao os top 3 alunos com mais ocorrencias de cada turma?"
WITH ranked AS (
  SELECT
    c.name as turma,
    s.full_name as aluno,
    COUNT(o.id) as total_ocorrencias,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COUNT(o.id) DESC) as posicao
  FROM classes c
  JOIN students s ON c.id = s.class_id AND s.is_active = true
  JOIN occurrences o ON s.id = o.student_id
  WHERE c.institution_id = '{{INSTITUTION_ID}}'
  AND c.is_active = true AND c.deleted_at IS NULL
  GROUP BY c.id, c.name, s.id, s.full_name
)
SELECT turma, aluno, total_ocorrencias, posicao
FROM ranked
WHERE posicao <= 3
ORDER BY turma, posicao;

Pergunta: "Qual a ocorrencia mais recente de cada turma?"
WITH ranked AS (
  SELECT
    c.name as turma,
    s.full_name as aluno,
    ot.category as tipo,
    o.occurrence_date,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.occurrence_date DESC) as posicao
  FROM classes c
  JOIN students s ON c.id = s.class_id
  JOIN occurrences o ON s.id = o.student_id
  JOIN occurrence_types ot ON o.occurrence_type_id = ot.id
  WHERE c.institution_id = '{{INSTITUTION_ID}}'
)
SELECT turma, aluno, tipo, occurrence_date
FROM ranked
WHERE posicao = 1
ORDER BY turma;

FORMATO DA RESPOSTA:
- Responda APENAS com a query SQL
- NAO inclua explicacoes, comentarios ou markdown
- NAO use blocos de codigo
- A query deve comecar com WITH (para CTEs) ou SELECT
- Para queries com ROW_NUMBER, SEMPRE use CTE iniciando com WITH
`;

// Explanation prompt for natural language responses
export const EXPLANATION_PROMPT = (question: string, data: any[]) => `
Voce e um analista de dados escolar experiente e amigavel.
O usuario fez a seguinte pergunta: "${question}"

Dados encontrados (${data.length} registro${data.length !== 1 ? 's' : ''}):
${JSON.stringify(data.slice(0, 50), null, 2)}
${data.length > 50 ? `\n... e mais ${data.length - 50} registros` : ''}

INSTRUCOES IMPORTANTES:
1. Responda de forma natural e profissional em portugues brasileiro
2. CRUCIAL: Se os dados contem grupos (ex: por turma, por categoria), MENCIONE TODOS OS GRUPOS
3. Para rankings por grupo (ex: "top 3 por turma"), liste CADA GRUPO com seus respectivos resultados
4. Use formatacao clara: separe cada grupo por linha ou paragrafo
5. Destaque os numeros e nomes importantes
6. Se nao houver dados, explique que nao foram encontrados resultados
7. NAO mencione SQL, JSON, banco de dados, queries ou termos tecnicos
8. Use um tom profissional mas acolhedor

EXEMPLO DE RESPOSTA PARA RANKING POR GRUPO:
Se a pergunta for "top 3 alunos por turma" e houver 4 turmas, a resposta DEVE mencionar TODAS as 4 turmas:
"No 1o Ano A, os alunos com mais ocorrencias sao: Fulano (10), Ciclano (8) e Beltrano (5).
No 1o Ano B, temos: Aluno1 (12), Aluno2 (9) e Aluno3 (7).
No 2o Ano A, os destaques sao: ..."
E assim por diante para TODAS as turmas.

Responda agora:`;

// Extract clean SQL from model response
export function extractSQL(response: string): string {
  let sql = response.trim();

  // Remove markdown code blocks
  sql = sql.replace(/```sql\n?/gi, '');
  sql = sql.replace(/```\n?/gi, '');

  // Try to find WITH (CTE) or SELECT statement if response has extra text
  // First try to match WITH ... SELECT (CTE pattern)
  const withMatch = sql.match(/WITH[\s\S]+?(?:;|$)/i);
  if (withMatch) {
    sql = withMatch[0];
  } else {
    // Fallback to just SELECT
    const selectMatch = sql.match(/SELECT[\s\S]+?(?:;|$)/i);
    if (selectMatch) {
      sql = selectMatch[0];
    }
  }

  // Remove trailing semicolon (Supabase doesn't like it)
  sql = sql.replace(/;\s*$/, '');

  return sql.trim();
}

// Check if query contains sensitive columns
export function containsSensitiveColumns(query: string): boolean {
  const upperQuery = query.toUpperCase();
  for (const col of BLOCKED_COLUMNS) {
    if (upperQuery.includes(col.toUpperCase())) {
      return true;
    }
  }
  return false;
}

// Check if question is asking for sensitive data
export function isSensitiveQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lower.includes(keyword));
}

// Get natural response for sensitive data requests
export function getSensitiveDataResponse(): string {
  return `Desculpe, nao posso fornecer informacoes pessoais como telefones, emails, enderecos ou datas de nascimento. Essas informacoes sao protegidas pela Lei Geral de Protecao de Dados (LGPD).

Posso ajudar com outras informacoes, como:
- Quantidade de alunos e turmas
- Estatisticas de ocorrencias
- Rankings e comparativos
- Historico de eventos

Como posso ajudar?`;
}

// Validate SQL query for safety
export function validateSQL(sqlQuery: string): { valid: boolean; error?: string } {
  const upperQuery = sqlQuery.toUpperCase().trim();

  // Basic validation - must be a SELECT query or CTE (WITH ... SELECT)
  if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
    return {
      valid: false,
      error: 'Apenas consultas SELECT sao permitidas por seguranca.',
    };
  }

  // Block dangerous keywords (as whole words)
  const dangerousKeywords = ['DELETE', 'DROP', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(upperQuery)) {
      return {
        valid: false,
        error: `Operacoes ${keyword} nao sao permitidas.`,
      };
    }
  }

  // Block queries that try to access sensitive data
  if (containsSensitiveColumns(sqlQuery)) {
    return {
      valid: false,
      error: 'Esta consulta tenta acessar dados pessoais protegidos (LGPD).',
    };
  }

  return { valid: true };
}

// Fallback explanation based on data
export function getFallbackExplanation(data: any[]): string {
  if (!data || data.length === 0) {
    return 'Nao foram encontrados resultados para sua consulta.';
  }
  return `Encontrei ${data.length} resultado${data.length !== 1 ? 's' : ''} para sua consulta.`;
}

// Convert UTC timestamps to Brazil time (UTC-3) in data objects
// This ensures the AI sees and reports times in the correct timezone
export function convertTimestampsToBrazilTime(data: any[]): any[] {
  if (!data || data.length === 0) return data;

  return data.map(row => {
    const newRow = { ...row };
    for (const key of Object.keys(newRow)) {
      const value = newRow[key];
      // Check if it's an ISO timestamp string (ends with Z or has timezone offset)
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        try {
          const date = new Date(value);
          // Format to Brazil time (UTC-3) using explicit formatting
          // toLocaleString with pt-BR returns "26/01/2026, 09:15:00"
          // We want a cleaner format: "26/01/2026 às 09:15"
          const brazilDate = date.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          // Replace comma with "às" for natural reading
          newRow[key] = brazilDate.replace(', ', ' às ');
        } catch {
          // If conversion fails, keep original value
        }
      }
    }
    return newRow;
  });
}

// Types
export type AIProvider = 'gemini' | 'groq';

export interface SQLGenerationResult {
  query: string;
  error?: string;
  isRateLimited?: boolean;
}
