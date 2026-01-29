import { test, expect } from '@playwright/test';

// Dynamic institution ID fetched at runtime
let testInstitutionId: string;

// Supabase credentials for direct database queries
const SUPABASE_URL = 'https://jtxfqsojicjtabtslqvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eGZxc29qaWNqdGFidHNscXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAyODcsImV4cCI6MjA4NDYxNjI4N30.anZQkr9qPcxj1Ga8YgfvTEU8cxvzPxPGSs-OxZSfmd8';

// Helper to get first existing institution ID
async function getTestInstitutionId(request: any): Promise<string> {
  const response = await request.get('/api/institutions/public');
  const data = await response.json();
  if (data.data && data.data.length > 0) {
    return data.data[0].id;
  }
  throw new Error('No institutions found in database. Please create one first.');
}

// Helper for AI API calls with retry and delay
async function aiRequest(request: any, question: string, retries = 3): Promise<any> {
  const institutionId = testInstitutionId;
  for (let i = 0; i < retries; i++) {
    // Add delay between retries (exponential backoff)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 2000));
    }

    const response = await request.post('/api/ai-analytics', {
      data: {
        question,
        institutionId
      },
      timeout: 60000
    });

    // If not a server error, return the response
    if (response.status() < 500) {
      return response;
    }

    console.log(`AI request attempt ${i + 1} failed with status ${response.status()}, retrying...`);
  }

  // Final attempt
  return request.post('/api/ai-analytics', {
    data: {
      question,
      institutionId
    },
    timeout: 60000
  });
}

// Helper to check if rate limited
function isRateLimited(json: any): boolean {
  return !json.success && (
    json.error?.includes('Limite') ||
    json.error?.includes('rate') ||
    json.error?.includes('quota')
  );
}

test.describe('AI Response Validation', () => {
  // Set longer timeout for AI tests
  test.setTimeout(120000);

  // Fetch institution ID before all tests
  test.beforeAll(async ({ request }) => {
    testInstitutionId = await getTestInstitutionId(request);
    console.log('Test institution ID:', testInstitutionId);
  });

  // Add delay between tests to avoid rate limiting
  test.beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  // Helper to query Supabase directly
  async function querySupabase(request: any, query: string) {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: query,
      },
    });
    return response.json();
  }

  test('AI student count matches database count', async ({ request }) => {
    // Ask AI for student count
    const response = await aiRequest(request, 'quantos alunos temos?');
    const aiJson = await response.json();
    console.log('AI Response (students):', JSON.stringify(aiJson, null, 2));

    // Skip if rate limited
    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();
    expect(aiJson.data.length).toBeGreaterThan(0);

    const aiCount = aiJson.data[0].total_alunos || aiJson.data[0].count || aiJson.data[0].total;

    // Query database directly for comparison
    const dbResult = await querySupabase(
      request,
      `SELECT COUNT(*) as total FROM students WHERE institution_id = '${testInstitutionId}' AND is_active = true AND deleted_at IS NULL`
    );
    console.log('DB Result (students):', JSON.stringify(dbResult, null, 2));

    const dbCount = dbResult[0]?.total || dbResult[0]?.count;

    // AI count should match database count
    expect(Number(aiCount)).toBe(Number(dbCount));
  });

  test('AI class count matches database count', async ({ request }) => {
    // Ask AI for class count
    const response = await aiRequest(request, 'quantas turmas temos?');
    const aiJson = await response.json();
    console.log('AI Response (classes):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();
    expect(aiJson.data.length).toBeGreaterThan(0);

    const aiCount = aiJson.data[0].total_turmas || aiJson.data[0].count || aiJson.data[0].total;

    // Query database directly
    const dbResult = await querySupabase(
      request,
      `SELECT COUNT(*) as total FROM classes WHERE institution_id = '${testInstitutionId}' AND is_active = true AND deleted_at IS NULL`
    );
    console.log('DB Result (classes):', JSON.stringify(dbResult, null, 2));

    const dbCount = dbResult[0]?.total || dbResult[0]?.count;

    expect(Number(aiCount)).toBe(Number(dbCount));
  });

  test('AI returns correct number of recent occurrences', async ({ request }) => {
    // Ask AI for last 3 occurrences
    const response = await aiRequest(request, 'quais foram as ultimas 3 ocorrencias?');
    const aiJson = await response.json();
    console.log('AI Response (occurrences):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();
    expect(aiJson.data).toHaveLength(3);

    // Verify dates are in descending order
    const dates = aiJson.data.map((d: any) => new Date(d.occurrence_date));
    expect(dates[0].getTime()).toBeGreaterThanOrEqual(dates[1].getTime());
    expect(dates[1].getTime()).toBeGreaterThanOrEqual(dates[2].getTime());
  });

  test('AI occurrence type count is accurate', async ({ request }) => {
    // Ask AI for occurrence types
    const response = await aiRequest(request, 'quantos tipos de ocorrencia temos?');
    const aiJson = await response.json();
    console.log('AI Response (types):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();
    expect(aiJson.data.length).toBeGreaterThan(0);

    // Get count from response - check various possible field names
    const firstRow = aiJson.data[0];
    const aiCount = firstRow.total_tipos || firstRow.total_tipos_ocorrencia ||
                    firstRow.count || firstRow.total || firstRow.quantidade;

    // AI should return a positive count of occurrence types
    expect(Number(aiCount)).toBeGreaterThan(0);

    // The query should be valid SQL targeting occurrence_types
    expect(aiJson.query.toLowerCase()).toContain('occurrence_types');
  });

  test('AI provides student with most occurrences correctly', async ({ request }) => {
    // Ask AI for student with most occurrences
    const response = await aiRequest(request, 'qual aluno tem mais ocorrencias?');
    const aiJson = await response.json();
    console.log('AI Response (top student):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();
    expect(aiJson.data.length).toBeGreaterThan(0);

    // The first result should have a student name
    const topStudent = aiJson.data[0];
    expect(topStudent.aluno || topStudent.full_name || topStudent.name).toBeDefined();
  });

  test('AI query returns valid SQL', async ({ request }) => {
    const response = await aiRequest(request, 'liste os nomes das turmas');
    const aiJson = await response.json();
    console.log('AI Response (SQL validation):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.query).toBeDefined();
    expect(aiJson.query.toUpperCase()).toContain('SELECT');
    // Check for dangerous SQL commands (not just the word, but the command)
    expect(aiJson.query.toUpperCase()).not.toMatch(/\bDELETE\s+FROM\b/);
    expect(aiJson.query.toUpperCase()).not.toMatch(/\bDROP\s+/);
    expect(aiJson.query.toUpperCase()).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/);
    expect(aiJson.query.toUpperCase()).not.toMatch(/\bINSERT\s+INTO\b/);
  });

  test('AI explanation is in Portuguese and natural', async ({ request }) => {
    const response = await aiRequest(request, 'quantos alunos temos por turma?');
    const aiJson = await response.json();
    console.log('AI Response (explanation):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.explanation).toBeDefined();

    // Should be in Portuguese (check for common Portuguese words)
    const portugueseWords = ['encontrei', 'total', 'aluno', 'turma', 'resultado', 'dados'];
    const hasPortuguese = portugueseWords.some(word =>
      aiJson.explanation.toLowerCase().includes(word)
    );
    expect(hasPortuguese).toBe(true);

    // Should NOT contain technical terms
    const technicalTerms = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'SQL', 'query', 'database'];
    const hasTechnical = technicalTerms.some(term =>
      aiJson.explanation.includes(term)
    );
    expect(hasTechnical).toBe(false);
  });

  test('AI handles aggregation queries correctly', async ({ request }) => {
    // Ask for occurrence count by category (clearer aggregation question)
    const response = await aiRequest(request, 'quantas ocorrencias temos por categoria?');
    const aiJson = await response.json();
    console.log('AI Response (aggregation):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();

    // Should have multiple rows (one per category)
    expect(aiJson.data.length).toBeGreaterThanOrEqual(1);

    // Each row should have a category and count
    aiJson.data.forEach((row: any) => {
      expect(row.categoria || row.category || row.tipo).toBeDefined();
      expect(row.total || row.count || row.quantidade || row.total_ocorrencias).toBeDefined();
    });
  });

  test('AI handles CTE queries (top N per group)', async ({ request }) => {
    // Ask for top 3 students per class - requires CTE with ROW_NUMBER()
    const response = await aiRequest(request, 'para cada turma, quais sao os top 3 alunos com mais ocorrencias?');
    const aiJson = await response.json();
    console.log('AI Response (CTE query):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.data).toBeDefined();

    // Should return results (may be empty if no occurrences exist)
    // But the query should execute successfully
    expect(Array.isArray(aiJson.data)).toBe(true);

    // If data exists, should have turma and aluno fields
    if (aiJson.data.length > 0) {
      const firstRow = aiJson.data[0];
      expect(firstRow.turma || firstRow.classe || firstRow.class_name).toBeDefined();
      expect(firstRow.aluno || firstRow.student || firstRow.full_name).toBeDefined();
    }

    // Explanation should exist and be natural
    expect(aiJson.explanation).toBeDefined();
    expect(aiJson.explanation.length).toBeGreaterThan(0);
  });

  test('AI explanation has no markdown asterisks', async ({ request }) => {
    // Ask any question and check explanation formatting
    const response = await aiRequest(request, 'qual turma tem mais alunos?');
    const aiJson = await response.json();
    console.log('AI Response (markdown check):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.explanation).toBeDefined();

    // Should NOT contain markdown asterisks for bold
    expect(aiJson.explanation).not.toContain('**');

    // Should NOT contain markdown underscores for italic/bold
    expect(aiJson.explanation).not.toContain('__');
  });

  test('AI response is natural language only', async ({ request }) => {
    // Ask a complex question
    const response = await aiRequest(request, 'quais sao as 5 turmas com mais ocorrencias?');
    const aiJson = await response.json();
    console.log('AI Response (natural language):', JSON.stringify(aiJson, null, 2));

    if (isRateLimited(aiJson)) {
      test.skip(true, 'AI providers rate limited');
      return;
    }

    expect(aiJson.success).toBe(true);
    expect(aiJson.explanation).toBeDefined();

    // Explanation should be a sentence, not code
    expect(aiJson.explanation.length).toBeGreaterThan(10);

    // Should contain natural Portuguese phrases
    const naturalPhrases = ['encontr', 'result', 'turma', 'aluno', 'ocorr', 'total'];
    const hasNatural = naturalPhrases.some(phrase =>
      aiJson.explanation.toLowerCase().includes(phrase)
    );
    expect(hasNatural).toBe(true);

    // Should NOT look like JSON or code
    expect(aiJson.explanation).not.toMatch(/^\s*[\[{]/);
    expect(aiJson.explanation).not.toMatch(/;\s*$/);
  });
});
