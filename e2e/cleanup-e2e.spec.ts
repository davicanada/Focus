import { test, expect } from '@playwright/test';

test.describe('E2E Data Cleanup', () => {
  test('Clean up all E2E test data', async ({ request }) => {
    const response = await request.post('/api/setup/cleanup-e2e');

    console.log('Response status:', response.status());

    const data = await response.json();
    console.log('Cleanup results:', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.success).toBe(true);

    // Log summary
    if (data.results) {
      console.log('\n=== CLEANUP SUMMARY ===');
      console.log(`Test users found: ${data.results.testUsersFound}`);
      console.log(`User-institutions deleted: ${data.results.userInstitutionsDeleted}`);
      console.log(`Users deleted: ${data.results.usersDeleted}`);
      console.log(`Auth users deleted: ${data.results.authUsersDeleted}`);
      console.log(`Access requests deleted: ${data.results.accessRequestsDeleted}`);
      console.log(`Additional requests deleted: ${data.results.additionalRequestsDeleted}`);
    }
  });
});
