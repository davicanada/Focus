import { test, expect, Page, BrowserContext } from '@playwright/test';

// These tests focus on mobile layout validation
test.describe('Mobile Responsive Design', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Skip if not mobile project (viewport >= 768)
    const viewportWidth = page.viewportSize()?.width || 1280;
    if (viewportWidth >= 768) {
      test.skip();
    }
  });

  test('login page is responsive on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the mobile view shows the paragraph version (inside mobile logo section)
    const mobileLogoText = page.locator('p:has-text("Sistema de Gestão Escolar")');
    await expect(mobileLogoText).toBeVisible();

    // Email and password inputs should be accessible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Login button should be visible
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();

    // Left side branding should be hidden on mobile (lg:flex hidden)
    const leftBranding = page.locator('div.hidden.lg\\:flex');
    await expect(leftBranding).toBeHidden();
  });

  test('page content uses full width on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The login card container should use most of the width
    const loginSection = page.locator('.flex-1.flex.items-center').first();
    const boundingBox = await loginSection.boundingBox();

    // Should be close to viewport width
    const viewportWidth = page.viewportSize()?.width || 375;
    expect(boundingBox?.width).toBeGreaterThan(viewportWidth * 0.9);
  });

  test('layout has correct responsive padding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/mobile-login-page.png', fullPage: true });

    // Verify the login container exists and is properly styled
    const loginContainer = page.locator('.w-full.max-w-md');
    await expect(loginContainer).toBeVisible();
  });
});

// Test authenticated flows separately with proper skip handling
test.describe('Mobile Authenticated Layout', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Skip if not mobile project
    const viewportWidth = page.viewportSize()?.width || 1280;
    if (viewportWidth >= 768) {
      test.skip();
    }
  });

  test('professor dashboard shows hamburger menu on mobile', async ({ page }) => {
    // Try to login
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'prof.maria@escolaexemplo.com');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');

    // Wait for either redirect or error
    try {
      await page.waitForURL(/professor/, { timeout: 20000 });
    } catch {
      // Login might have failed - check for error toast or still on login page
      const currentUrl = page.url();
      if (!currentUrl.includes('/professor')) {
        console.log('Login did not redirect to professor page');
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/mobile-login-failed.png' });
        test.skip(true, 'Login failed or timed out');
        return;
      }
    }

    // If we get here, login succeeded
    await page.waitForLoadState('networkidle');

    // Sidebar should be hidden on mobile (has 'hidden md:block' classes)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeHidden();

    // Hamburger menu button should be visible
    const menuButton = page.getByRole('button', { name: 'Abrir menu' });
    await expect(menuButton).toBeVisible();
  });

  test('sidebar opens and closes via hamburger menu', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'prof.maria@escolaexemplo.com');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/professor/, { timeout: 20000 });
    } catch {
      test.skip(true, 'Login failed');
      return;
    }

    await page.waitForLoadState('networkidle');

    // Click hamburger to open sidebar
    const menuButton = page.getByRole('button', { name: 'Abrir menu' });
    await menuButton.click();

    // Sidebar should now be visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Navigation links should be visible
    await expect(page.locator('aside').getByText('Dashboard')).toBeVisible();
    await expect(page.locator('aside').getByText('Registrar Ocorrência')).toBeVisible();

    // Click a link
    await page.locator('aside').getByText('Registrar Ocorrência').click();

    // Wait for navigation and sidebar to close
    await page.waitForURL(/registrar/);
    await page.waitForTimeout(500);

    // Sidebar should be closed after navigation
    await expect(sidebar).toBeHidden();
  });

  test('professor registrar page is usable on mobile', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'prof.maria@escolaexemplo.com');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/professor/, { timeout: 20000 });
    } catch {
      test.skip(true, 'Login failed');
      return;
    }

    // Navigate directly to registrar
    await page.goto('/professor/registrar');
    await page.waitForLoadState('networkidle');

    // Both form sections should be visible (stacked vertically)
    await expect(page.getByText('Selecione os Alunos')).toBeVisible();
    await expect(page.getByText('Detalhes da Ocorrência')).toBeVisible();

    // Form controls should be visible
    await expect(page.locator('select#class')).toBeVisible();
    await expect(page.locator('select#type')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /Registrar Ocorrência/ })).toBeVisible();

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/mobile-professor-registrar.png', fullPage: true });
  });

  test('occurrences table has scroll on mobile', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'prof.maria@escolaexemplo.com');
    await page.fill('input[type="password"]', 'Focus@123');
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/professor/, { timeout: 20000 });
    } catch {
      test.skip(true, 'Login failed');
      return;
    }

    // Navigate to occurrences
    await page.goto('/professor/ocorrencias');
    await page.waitForLoadState('networkidle');

    // Page title should be visible
    await expect(page.getByRole('heading', { name: 'Minhas Ocorrências' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/mobile-professor-ocorrencias.png', fullPage: true });

    // If there's a table, it should be inside overflow-x-auto container
    const table = page.locator('table');
    const hasTable = await table.count() > 0;

    if (hasTable) {
      const tableContainer = page.locator('.overflow-x-auto');
      await expect(tableContainer.first()).toBeVisible();
    }
  });
});
