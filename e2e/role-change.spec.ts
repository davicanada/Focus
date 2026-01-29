import { test, expect } from '@playwright/test';

// Admin credentials - drummond admin
const ADMIN_EMAIL = 'admin1@drummond.edu.br';
const ADMIN_PASSWORD = 'Focus@123';

// Known professor from database (César Belo Cavalcante)
const TEST_PROFESSOR = {
  userInstitutionId: 'a2d79961-e1f7-486c-9762-608c36ad35b3',
  userId: '447c011c-38f9-49b9-94cb-58e1d9072713',
  name: 'César Belo Cavalcante',
};

// Supabase credentials for direct database operations
const SUPABASE_URL = 'https://jtxfqsojicjtabtslqvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eGZxc29qaWNqdGFidHNscXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAyODcsImV4cCI6MjA4NDYxNjI4N30.anZQkr9qPcxj1Ga8YgfvTEU8cxvzPxPGSs-OxZSfmd8';

test.describe('Role Change Flow', () => {

  // Helper to reset professor role back via direct SQL
  async function resetProfessorRole(request: any) {
    await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: `UPDATE user_institutions SET role = 'professor' WHERE id = '${TEST_PROFESSOR.userInstitutionId}'`,
      },
    }).catch(() => {});
  }

  test('UI: Login as admin and change professor role to visualizador', async ({ page }) => {
    // Listen to console messages for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('[BROWSER ERROR]', msg.text());
      }
    });

    // Listen to network requests for debugging
    page.on('response', async response => {
      if (response.url().includes('/api/users/') && response.url().includes('/role')) {
        console.log('[ROLE API]', response.status(), await response.text().catch(() => 'no body'));
      }
    });

    // Go to login page
    await page.goto('/');
    console.log('On login page');

    // Fill login form
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    console.log('Filled login form');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin**', { timeout: 15000 });
    console.log('Logged in successfully, URL:', page.url());

    // Navigate to users page
    await page.goto('/admin/professores');
    await page.waitForLoadState('networkidle');
    console.log('On users page');

    // Wait for the table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Find the professor in the table
    const professorRow = page.locator('tr', { hasText: TEST_PROFESSOR.name });
    const rowCount = await professorRow.count();
    console.log(`Found ${rowCount} rows with professor name: ${TEST_PROFESSOR.name}`);

    expect(rowCount).toBeGreaterThan(0);

    // Click the UserCog button (role change)
    const roleButton = professorRow.first().locator('button[title="Alterar Função"]');
    await roleButton.click();
    console.log('Clicked role change button');

    // Wait for modal to appear (look for the modal title)
    await page.waitForSelector('text=Alterar Função do Usuário', { timeout: 5000 });
    console.log('Modal opened');

    // Verify current role badge shows Professor in the modal
    const modalContent = page.locator('.fixed.inset-0').locator('.relative.z-50');
    const currentRoleBadge = modalContent.locator('text=Professor');
    expect(await currentRoleBadge.count()).toBeGreaterThan(0);
    console.log('Current role is Professor');

    // Select new role (admin_viewer)
    await page.selectOption('select#newRole', 'admin_viewer');
    console.log('Selected admin_viewer');

    // Click confirm button
    const confirmButton = page.locator('button:has-text("Confirmar Alteração")');
    await confirmButton.click();
    console.log('Clicked confirm button');

    // Wait for response
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/role-change-after-click.png' });

    // Check if modal closed (success) or still open (error)
    const modalStillOpen = await page.locator('text=Alterar Função do Usuário').count() > 0;
    console.log('Modal still open:', modalStillOpen);

    if (!modalStillOpen) {
      // Modal closed, check if role changed
      await page.waitForTimeout(1000);
      const updatedRow = page.locator('tr', { hasText: TEST_PROFESSOR.name });
      const visualizadorBadge = updatedRow.first().locator('text=Visualizador');
      const badgeCount = await visualizadorBadge.count();
      console.log('Visualizador badge count:', badgeCount);

      expect(badgeCount).toBeGreaterThan(0);
      console.log('SUCCESS: Role was changed to Visualizador!');
    } else {
      // Modal still open, check for error message
      const modalDiv = page.locator('.fixed.inset-0').locator('.relative.z-50');
      const modalTextContent = await modalDiv.textContent();
      console.log('Modal content:', modalTextContent);

      // Fail the test with useful info
      expect(modalStillOpen).toBe(false);
    }

    // Reset the role back to professor
    await resetProfessorRole(page.request);
    console.log('Reset professor role');
  });

  test.afterEach(async ({ request }) => {
    // Always reset professor role after test
    await resetProfessorRole(request);
  });
});
