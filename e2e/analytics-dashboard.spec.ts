import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', 'admin@escolaexemplo.com');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 10000 });
  });

  test('should display all dashboard components', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Check all section headings are visible
    await expect(page.getByRole('heading', { name: 'Tendencia Mensal' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Distribuicao por Categoria' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Distribuicao por Severidade' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alunos com Mais Ocorrencias' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ocorrencias por Turma' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alunos sem Ocorrencias' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Analytics' })).toBeVisible();
  });

  test('should display monthly trend chart section', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for the monthly trend section
    const monthlySection = page.getByRole('heading', { name: 'Tendencia Mensal' }).locator('..');
    await expect(monthlySection).toBeVisible({ timeout: 10000 });

    // Check the description mentions clicking to filter
    await expect(page.getByText('Evolucao das ocorrencias')).toBeVisible();
  });

  test('should display classes chart with alphabetical order description', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for the class chart section
    const classSection = page.getByRole('heading', { name: 'Ocorrencias por Turma' }).locator('..');
    await expect(classSection).toBeVisible({ timeout: 10000 });

    // Check description mentions alphabetical order and colors
    await expect(page.getByText('Ordenado alfabeticamente')).toBeVisible();
    await expect(page.getByText('Vermelho: mais ocorrencias')).toBeVisible();
    await expect(page.getByText('Verde: menos')).toBeVisible();
  });

  test('should show students without occurrences table', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for the table section
    const tableSection = page.getByRole('heading', { name: 'Alunos sem Ocorrencias' }).locator('..');
    await expect(tableSection).toBeVisible({ timeout: 10000 });

    // Check table headers exist
    await expect(page.getByRole('columnheader', { name: 'Aluno' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Turma' })).toBeVisible();

    // Check that there are some rows (students without occurrences)
    const rows = page.getByRole('row');
    const rowCount = await rows.count();
    // At least header row + 1 data row
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test('should display multi-select hint text', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Check for Ctrl+Click multi-select hint (period filter was removed)
    await expect(page.getByText('Ctrl+Clique para multi-selecao')).toBeVisible({ timeout: 10000 });
  });

  test('should display AI Analytics section', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Check for AI Analytics section
    await expect(page.getByRole('heading', { name: 'AI Analytics' })).toBeVisible({ timeout: 10000 });

    // Check for the input field
    await expect(page.getByPlaceholder('Faca uma pergunta sobre seus dados')).toBeVisible();

    // Check for example questions
    await expect(page.getByText('Qual foi a ultima ocorrencia grave')).toBeVisible();
  });

  test('should show description text with student count', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Check that the students without occurrences shows a count
    await expect(page.getByText(/\d+ aluno(s)? sem registro no periodo/)).toBeVisible({ timeout: 10000 });
  });
});
