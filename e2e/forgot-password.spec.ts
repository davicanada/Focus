import { test, expect } from '@playwright/test';

test.describe('Forgot Password Flow', () => {

  test.beforeAll(async ({ request }) => {
    // Apply the migration to add reset_token columns
    const migrationResponse = await request.post('/api/setup/migrate-reset-password');
    console.log('Migration response:', await migrationResponse.json());
  });

  test('Modal opens when clicking "Esqueci minha senha"', async ({ page }) => {
    await page.goto('/');

    // Click the forgot password link
    await page.click('text=Esqueci minha senha');

    // Modal should be visible
    await expect(page.locator('text=Digite seu email cadastrado')).toBeVisible();
  });

  test('Shows error for empty email', async ({ page }) => {
    await page.goto('/');

    // Click the forgot password link
    await page.click('text=Esqueci minha senha');

    // Click submit without entering email
    await page.click('button:has-text("Enviar link")');

    // Should show error - use exact match to avoid matching the description text
    await expect(page.getByText('Digite seu email', { exact: true })).toBeVisible();
  });

  test('Shows error for invalid email', async ({ page }) => {
    await page.goto('/');

    // Click the forgot password link
    await page.click('text=Esqueci minha senha');

    // Wait for modal to be visible
    await expect(page.locator('#forgot-email')).toBeVisible();

    // Enter email that passes HTML5 validation but fails our regex
    // Our regex requires a dot in domain: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    await page.fill('#forgot-email', 'test@testdomain');

    // Click submit
    await page.click('button:has-text("Enviar link")');

    // Should show error
    await expect(page.locator('text=Email inválido')).toBeVisible();
  });

  test('API returns success for valid email (prevents enumeration)', async ({ request }) => {
    // Test with a real email
    const response = await request.post('/api/forgot-password', {
      data: { email: 'davialmeida1996@gmail.com' }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('API returns success for non-existent email (prevents enumeration)', async ({ request }) => {
    // Test with a non-existent email - should still return success to prevent enumeration
    const response = await request.post('/api/forgot-password', {
      data: { email: 'nonexistent@example.com' }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('Shows success message after submitting valid email', async ({ page }) => {
    await page.goto('/');

    // Click the forgot password link
    await page.click('text=Esqueci minha senha');

    // Wait for modal to be visible
    await expect(page.locator('#forgot-email')).toBeVisible();

    // Enter valid email in the modal's input (not the login form)
    await page.fill('#forgot-email', 'davialmeida1996@gmail.com');

    // Click submit
    await page.click('button:has-text("Enviar link")');

    // Should show success message (email sending may take time)
    await expect(page.locator('text=Email Enviado!')).toBeVisible({ timeout: 30000 });
  });

  test('Reset password page shows invalid for bad token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');

    // Should show invalid message
    await expect(page.locator('text=Link Inválido')).toBeVisible({ timeout: 10000 });
  });

  test('Reset password page shows invalid when no token', async ({ page }) => {
    await page.goto('/reset-password');

    // Should show invalid message
    await expect(page.locator('text=Link Inválido')).toBeVisible({ timeout: 10000 });
  });
});
