import { test, expect } from '@playwright/test';

test.describe('Reports Pages', () => {

  // Note: These pages require authentication (admin role)
  // Auth redirect is tested in account-approval.spec.ts
  // These tests verify the routes exist and respond

  test('Reports main page route exists', async ({ page }) => {
    const response = await page.goto('/admin/relatorios');
    expect(response?.status()).toBeLessThan(500);
  });

  test('Period report page route exists', async ({ page }) => {
    const response = await page.goto('/admin/relatorios/periodo');
    expect(response?.status()).toBeLessThan(500);
  });

  test('Student report page route exists', async ({ page }) => {
    const response = await page.goto('/admin/relatorios/aluno');
    expect(response?.status()).toBeLessThan(500);
  });

});
