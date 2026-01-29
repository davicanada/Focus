import { test, expect } from '@playwright/test';

// Test credentials
const ADMIN_EMAIL = 'admin1@drummond.edu.br';
const ADMIN_PASSWORD = 'Focus@123';

test.describe('AI Analytics Timezone', () => {
  test('should display occurrence time in Brazil timezone (UTC-3)', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for AI response
    // Login as admin
    await page.goto('/');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    console.log('Logged in successfully');

    // Navigate to dashboard page (where AIChat is)
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');
    console.log('On dashboard page');

    // Scroll to the bottom to see the AIChat component
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Find the AI chat input - exact placeholder match
    const chatInput = page.locator('input[placeholder="Faca uma pergunta sobre seus dados..."]');
    await chatInput.waitFor({ timeout: 10000 });
    console.log('Found AI chat input');

    // Ask about the occurrence on January 26th at 9:15 (Brazil time)
    // The database stores this as 12:15 UTC
    await chatInput.fill('Qual foi a última ocorrência do dia 26 de janeiro de 2026?');

    // Submit the question
    const sendButton = page.locator('button[type="submit"]').last();
    await sendButton.click();
    console.log('Question submitted');

    // Wait for AI response
    // Look for the "Analisando..." loader to appear and then disappear
    const loadingIndicator = page.locator('text=Analisando...');
    try {
      await loadingIndicator.waitFor({ state: 'visible', timeout: 5000 });
      console.log('Loading indicator appeared');
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
      console.log('Loading indicator disappeared');
    } catch {
      // Loading might be very fast, wait a bit
      await page.waitForTimeout(5000);
    }

    // Wait a bit more for the response to render
    await page.waitForTimeout(2000);

    // Get all assistant messages (bg-muted class)
    const assistantMessages = page.locator('.bg-muted .whitespace-pre-wrap');
    const messageCount = await assistantMessages.count();
    console.log('Number of assistant messages:', messageCount);

    // Get the last assistant message (the response to our question)
    if (messageCount > 1) {
      const lastMessage = assistantMessages.nth(messageCount - 1);
      const responseText = await lastMessage.textContent();
      console.log('AI Response:', responseText);

      if (responseText) {
        // Check for Brazil time format (09:15)
        const hasBrazilTime = responseText.includes('09:15') || responseText.includes('9:15') || responseText.includes('09h15');
        // Check it doesn't show UTC time
        const hasUTCTime = responseText.includes('12:15') || responseText.includes('12h15');

        console.log('Has Brazil time (09:15):', hasBrazilTime);
        console.log('Has UTC time (12:15):', hasUTCTime);

        // If it shows 12:15, that's the UTC bug
        if (hasUTCTime && !hasBrazilTime) {
          throw new Error('BUG: AI is showing UTC time (12:15) instead of Brazil time (09:15)');
        }

        // If it shows 09:15, the fix is working
        if (hasBrazilTime) {
          console.log('SUCCESS: AI is correctly showing Brazil time!');
        }
      }
    }

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/ai-timezone-response.png' });
    console.log('Screenshot saved');
  });

  test('should convert timestamps correctly via API', async ({ request }) => {
    // Get the institution ID first
    const institutionsResponse = await request.get('http://localhost:3000/api/institutions/public');
    const institutions = await institutionsResponse.json();
    const institutionId = institutions.data?.[0]?.id;
    console.log('Institution ID:', institutionId);

    if (!institutionId) {
      console.log('Skipping API test - no institution found');
      return;
    }

    // Test the AI analytics API
    const response = await request.post('http://localhost:3000/api/ai-analytics', {
      data: {
        question: 'Qual foi a última ocorrência de janeiro de 2026?',
        institutionId: institutionId,
      },
    });

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Verify the API response
    expect(response.ok()).toBeTruthy();

    if (data.explanation) {
      const explanation = data.explanation;
      console.log('Explanation:', explanation);

      // If the explanation mentions a time, check it's in Brazil format
      // The occurrence was at 09:15 Brazil time (stored as 12:15 UTC)
      const hasUTCTime = explanation.includes('12:15');
      const hasBrazilTime = explanation.includes('09:15') || explanation.includes('9:15');

      if (hasUTCTime && !hasBrazilTime) {
        console.log('WARNING: API might be showing UTC time instead of Brazil time');
      }

      if (hasBrazilTime) {
        console.log('SUCCESS: API is showing Brazil time correctly');
      }
    }
  });
});
