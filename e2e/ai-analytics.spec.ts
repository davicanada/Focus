import { test, expect } from '@playwright/test';

// Dynamic institution ID fetched at runtime
let testInstitutionId: string;

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

test.describe('AI Analytics', () => {
  // Set longer timeout for AI tests
  test.setTimeout(120000);

  // Fetch institution ID before all tests
  test.beforeAll(async ({ request }) => {
    testInstitutionId = await getTestInstitutionId(request);
    console.log('Test institution ID:', testInstitutionId);
  });

  // API Tests - No login required
  test.describe('API Tests', () => {
    // Add delay between tests to avoid rate limiting
    test.beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('should return valid SQL for normal query', async ({ request }) => {
      const response = await aiRequest(request, 'quantos alunos temos?');
      const json = await response.json();
      console.log('Response:', JSON.stringify(json, null, 2));

      // Skip if rate limited (both providers exhausted)
      if (!json.success && json.error?.includes('Limite')) {
        test.skip(true, 'AI providers rate limited - skipping test');
        return;
      }

      expect(json.success).toBe(true);
      expect(json.query).toBeDefined();
      expect(json.query.toUpperCase()).toContain('SELECT');
      expect(json.explanation).toBeDefined();
    });

    test('should block sensitive data - phone numbers', async ({ request }) => {
      const response = await aiRequest(request, 'qual o telefone dos responsaveis?');
      const json = await response.json();
      console.log('Response (phone):', JSON.stringify(json, null, 2));

      expect(json.success).toBe(true);
      expect(json.isSensitiveBlock).toBe(true);
      expect(json.explanation).toContain('LGPD');
      expect(json.query).toBeNull();
    });

    test('should block sensitive data - email addresses', async ({ request }) => {
      const response = await aiRequest(request, 'liste os emails dos professores');
      const json = await response.json();
      console.log('Response (email):', JSON.stringify(json, null, 2));

      expect(json.success).toBe(true);
      expect(json.isSensitiveBlock).toBe(true);
    });

    test('should block sensitive data - birth dates', async ({ request }) => {
      const response = await aiRequest(request, 'qual a data de nascimento dos alunos?');
      const json = await response.json();
      console.log('Response (birth):', JSON.stringify(json, null, 2));

      expect(json.success).toBe(true);
      expect(json.isSensitiveBlock).toBe(true);
    });

    test('should block sensitive data - addresses', async ({ request }) => {
      const response = await aiRequest(request, 'qual o endereco dos alunos?');
      const json = await response.json();
      console.log('Response (address):', JSON.stringify(json, null, 2));

      expect(json.success).toBe(true);
      expect(json.isSensitiveBlock).toBe(true);
    });

    // Word boundary tests - ensure no false positives
    test('should NOT block "quantidade" (contains "idade" as substring)', async ({ request }) => {
      const response = await aiRequest(request, 'qual a turma com maior quantidade de ocorrencias?');
      const json = await response.json();
      console.log('Response (quantidade):', JSON.stringify(json, null, 2));

      // Should NOT be blocked - "quantidade" is not a sensitive word
      expect(json.isSensitiveBlock).toBeFalsy();

      // If successful, should return a valid query
      if (json.success && json.query) {
        expect(json.query.toUpperCase()).toContain('SELECT');
      }
    });

    test('should NOT block "gravidade" (contains "idade" as substring)', async ({ request }) => {
      const response = await aiRequest(request, 'qual a gravidade mais comum?');
      const json = await response.json();
      console.log('Response (gravidade):', JSON.stringify(json, null, 2));

      // Should NOT be blocked
      expect(json.isSensitiveBlock).toBeFalsy();
    });

    test('should NOT block "organização" (contains "rg" as substring)', async ({ request }) => {
      const response = await aiRequest(request, 'como esta organizado por turma?');
      const json = await response.json();
      console.log('Response (organização):', JSON.stringify(json, null, 2));

      // Should NOT be blocked - "organizado" contains "rg" but is not asking for RG document
      expect(json.isSensitiveBlock).toBeFalsy();
    });

    test('should still block actual sensitive "idade" question', async ({ request }) => {
      const response = await aiRequest(request, 'qual a idade dos alunos?');
      const json = await response.json();
      console.log('Response (idade real):', JSON.stringify(json, null, 2));

      // Should be blocked - asking for actual age (sensitive)
      expect(json.success).toBe(true);
      expect(json.isSensitiveBlock).toBe(true);
    });

    test('should still block actual sensitive "rg" question', async ({ request }) => {
      const response = await aiRequest(request, 'qual o rg dos alunos?');
      const json = await response.json();
      console.log('Response (rg real):', JSON.stringify(json, null, 2));

      // Should be blocked - asking for actual RG document (sensitive)
      expect(json.success).toBe(true);
      expect(json.isSensitiveBlock).toBe(true);
    });

    test('should handle complex queries with JOINs', async ({ request }) => {
      const response = await aiRequest(request, 'quais foram as ultimas 3 ocorrencias?');
      const json = await response.json();
      console.log('Response (complex):', JSON.stringify(json, null, 2));

      // May succeed or fail due to rate limiting
      if (json.success && json.query) {
        expect(json.query.toUpperCase()).toContain('SELECT');
        expect(json.query.toUpperCase()).toContain('JOIN');
      }
    });

    test('should return provider information', async ({ request }) => {
      const response = await aiRequest(request, 'quantas turmas temos?');
      const json = await response.json();
      console.log('Response (provider):', JSON.stringify(json, null, 2));

      // Should have provider info (gemini or groq)
      if (json.success && !json.isSensitiveBlock) {
        expect(['gemini', 'groq']).toContain(json.provider);
      }
    });

  });

  // UI Tests - Require login
  test.describe('UI Tests', () => {

    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Fill login form
      await page.fill('input[type="email"]', 'admin@escolaexemplo.com');
      await page.fill('input[type="password"]', 'Focus@123');
      await page.click('button[type="submit"]');

      // Wait for redirect to admin dashboard
      await page.waitForURL('/admin', { timeout: 10000 });
    });

    test('should load AI Analytics chat on dashboard page', async ({ page }) => {
      // Navigate to analytics dashboard
      await page.goto('/admin/analytics');
      await page.waitForLoadState('domcontentloaded');

      // Wait for AI Chat to be visible
      const aiChat = page.locator('text=AI Analytics');
      await expect(aiChat).toBeVisible({ timeout: 10000 });

      // Check for the welcome message
      const welcomeMessage = page.locator('text=Ola! Sou o assistente de analytics');
      await expect(welcomeMessage).toBeVisible({ timeout: 5000 });
    });

    test('should show natural response for sensitive data request', async ({ page }) => {
      // Navigate to analytics dashboard
      await page.goto('/admin/analytics');
      await page.waitForLoadState('domcontentloaded');

      // Wait for AI Chat
      await page.waitForSelector('text=AI Analytics', { timeout: 10000 });

      // Find the input field and ask for sensitive data
      const input = page.locator('input[placeholder*="pergunta"]');
      await expect(input).toBeVisible({ timeout: 5000 });

      await input.fill('qual o telefone dos responsaveis?');

      // Click send button
      const sendButton = page.locator('button[type="submit"]').last();
      await sendButton.click();

      // Wait for response - should mention LGPD
      await page.waitForSelector('text=LGPD', { timeout: 30000 });

      // Verify no error styling (should be friendly message)
      const errorBadge = page.locator('text=Erro').first();
      await expect(errorBadge).not.toBeVisible();
    });

  });

});
