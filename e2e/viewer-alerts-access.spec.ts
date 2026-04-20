import { test, expect } from '@playwright/test';

/**
 * Valida que o role admin_viewer tem acesso as APIs e UI de alertas.
 * Antes da correcao, todas as APIs filtravam por role = 'admin', retornando
 * 403 ou count: 0 para admin_viewer.
 *
 * Credenciais (ja existentes no banco):
 * - admin:  almeidavi293@gmail.com   (role: admin)
 * - viewer: admin1@drummond.edu.br   (role: admin_viewer)
 */

test.describe('Viewer - Acesso a Alertas', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', 'admin1@drummond.edu.br');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/viewer', { timeout: 30000 });
  });

  test('GET /api/alert-notifications/count retorna 200 com count numerico', async ({ page }) => {
    const response = await page.request.get('/api/alert-notifications/count');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('count');
    expect(typeof body.count).toBe('number');
  });

  test('GET /api/alert-notifications retorna 200 com lista', async ({ page }) => {
    const response = await page.request.get('/api/alert-notifications');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/alert-rules retorna 200 com lista', async ({ page }) => {
    const response = await page.request.get('/api/alert-rules');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('pagina /viewer/alertas carrega sem mensagem de acesso negado', async ({ page }) => {
    await page.goto('/viewer/alertas');
    await expect(page.getByRole('heading', { name: /central de alertas/i })).toBeVisible({ timeout: 10000 });
    // Nao deve exibir "Acesso negado" ou erro 403
    await expect(page.getByText(/acesso negado/i)).toHaveCount(0);
  });
});

test.describe('Professor - Acesso a Alertas bloqueado', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', 'prof.ana@drummond.edu.br');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/professor', { timeout: 30000 });
  });

  test('GET /api/alert-notifications retorna 403', async ({ page }) => {
    const response = await page.request.get('/api/alert-notifications');
    expect(response.status()).toBe(403);
  });

  test('GET /api/alert-rules retorna 403', async ({ page }) => {
    const response = await page.request.get('/api/alert-rules');
    expect(response.status()).toBe(403);
  });
});
