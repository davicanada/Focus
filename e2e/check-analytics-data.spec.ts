import { test } from '@playwright/test';

test('Check Analytics data for Drummond admin', async ({ page }) => {
  test.setTimeout(90000);

  await page.goto('https://focus-school.vercel.app');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"]').fill('almeidavi293@gmail.com');
  await page.locator('input[type="password"]').fill('Focus@123');
  await page.locator('button:has-text("Entrar")').click();
  await page.waitForTimeout(10000);

  console.log('URL after login:', page.url());

  if (!page.url().includes('/admin')) {
    await page.screenshot({ path: 'e2e/screenshots/login-failed.png', fullPage: true });
    console.log('Login did not redirect to /admin');
    return;
  }

  // Navigate to Analytics
  await page.goto('https://focus-school.vercel.app/admin/analytics');
  await page.waitForTimeout(8000);
  console.log('URL at analytics:', page.url());

  await page.screenshot({ path: 'e2e/screenshots/analytics-top.png' });
  await page.screenshot({ path: 'e2e/screenshots/analytics-full.png', fullPage: true });

  // Extract visible text data
  const bodyText = await page.textContent('body') || '';

  // Find percentage patterns
  const pctMatches = bodyText.match(/\d[\d,.]*\s*\([\d,.]+%\)/g);
  console.log('=== PERCENTAGE PATTERNS ===');
  console.log(JSON.stringify(pctMatches, null, 2));

  // Check institution name
  console.log('Has Drummond:', bodyText.includes('Drummond'));

  // Year filter
  const yearSelect = page.locator('select#year-filter');
  if (await yearSelect.count() > 0) {
    console.log('Year selected:', await yearSelect.inputValue());
  }
});
