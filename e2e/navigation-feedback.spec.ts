import { test, expect } from '@playwright/test';

/**
 * Testes de Feedback Visual de Navegação
 *
 * Credenciais atualizadas (verificadas no banco):
 * - admin: almeidavi293@gmail.com (role: admin)
 * - viewer: admin1@drummond.edu.br (role: admin_viewer)
 * - professor: prof.ana@drummond.edu.br (role: professor)
 * - master: davialmeida1996@gmail.com (is_master: true)
 */

test.describe('Feedback Visual de Navegação', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('Role: Admin', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[type="email"]', 'almeidavi293@gmail.com');
      await page.fill('input[type="password"]', 'Focus@123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin', { timeout: 30000 });
    });

    test('navegação para Turmas mostra feedback e carrega corretamente', async ({ page }) => {
      await page.locator('a[href="/admin/turmas"]').click();
      await page.waitForURL('/admin/turmas', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /turmas/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação para Alunos funciona', async ({ page }) => {
      await page.locator('a[href="/admin/alunos"]').click();
      await page.waitForURL('/admin/alunos', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação para Analytics funciona', async ({ page }) => {
      await page.locator('a[href="/admin/analytics"]').click();
      await page.waitForURL('/admin/analytics', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /tendencia mensal/i })).toBeVisible({ timeout: 10000 });
    });

    test('navegação para Relatórios funciona', async ({ page }) => {
      await page.locator('a[href="/admin/relatorios"]').click();
      await page.waitForURL('/admin/relatorios', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /relatorios/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação circular funciona sem travar', async ({ page }) => {
      // Vai para Turmas
      await page.locator('a[href="/admin/turmas"]').click();
      await page.waitForURL('/admin/turmas', { timeout: 10000 });

      // Volta para Visão Geral
      await page.locator('a[href="/admin"]').first().click();
      await page.waitForURL('/admin', { timeout: 10000 });

      // Vai para Alunos
      await page.locator('a[href="/admin/alunos"]').click();
      await page.waitForURL('/admin/alunos', { timeout: 10000 });

      await expect(page.getByRole('heading', { name: /alunos/i })).toBeVisible();
    });
  });

  test.describe('Role: Professor', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[type="email"]', 'prof.ana@drummond.edu.br');
      await page.fill('input[type="password"]', 'Focus@123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/professor', { timeout: 30000 });
    });

    test('navegação para Registrar Ocorrência funciona', async ({ page }) => {
      await page.locator('a[href="/professor/registrar"]').click();
      await page.waitForURL('/professor/registrar', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /registrar/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação para Minhas Ocorrências funciona', async ({ page }) => {
      await page.locator('a[href="/professor/ocorrencias"]').click();
      await page.waitForURL('/professor/ocorrencias', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /minhas ocorrencias/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação para Analytics funciona', async ({ page }) => {
      await page.locator('a[href="/professor/analytics"]').click();
      await page.waitForURL('/professor/analytics', { timeout: 10000 });
    });

    test('navegação para Settings funciona', async ({ page }) => {
      await page.locator('a[href="/settings"]').click();
      await page.waitForURL('/settings', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /configuracoes/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Role: Viewer', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[type="email"]', 'admin1@drummond.edu.br');
      await page.fill('input[type="password"]', 'Focus@123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/viewer', { timeout: 30000 });
    });

    test('navegação para Analytics funciona', async ({ page }) => {
      await page.locator('a[href="/viewer/analytics"]').click();
      await page.waitForURL('/viewer/analytics', { timeout: 10000 });
    });

    test('navegação para Relatórios funciona', async ({ page }) => {
      await page.locator('a[href="/viewer/relatorios"]').click();
      await page.waitForURL('/viewer/relatorios', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /relatorios/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação para Alertas funciona', async ({ page }) => {
      await page.locator('a[href="/viewer/alertas"]').click();
      await page.waitForURL('/viewer/alertas', { timeout: 10000 });
    });

    test('navegação para Configurações funciona', async ({ page }) => {
      await page.locator('a[href="/viewer/configuracoes"]').click();
      await page.waitForURL('/viewer/configuracoes', { timeout: 10000 });
    });
  });

  test.describe('Role: Master', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[type="email"]', 'davialmeida1996@gmail.com');
      await page.fill('input[type="password"]', 'Focus@123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/master', { timeout: 30000 });
    });

    test('página master carrega corretamente', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /painel master/i })).toBeVisible({ timeout: 5000 });
    });

    test('navegação para Settings funciona', async ({ page }) => {
      await page.locator('a[href="/settings"]').click();
      await page.waitForURL('/settings', { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /configuracoes/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance', () => {
    test('navegação admin é rápida (< 5s por página)', async ({ page }) => {
      // Login
      await page.goto('/');
      await page.fill('input[type="email"]', 'almeidavi293@gmail.com');
      await page.fill('input[type="password"]', 'Focus@123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/admin', { timeout: 30000 });

      const routes = ['/admin/turmas', '/admin/alunos', '/admin/analytics'];

      for (const route of routes) {
        const startTime = Date.now();
        await page.locator(`a[href="${route}"]`).click();
        await page.waitForURL(route, { timeout: 5000 });
        const loadTime = Date.now() - startTime;

        test.info().annotations.push({
          type: 'performance',
          description: `${route}: ${loadTime}ms`
        });

        expect(loadTime).toBeLessThan(5000);
      }
    });
  });
});
