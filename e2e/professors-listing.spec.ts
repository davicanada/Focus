import { test, expect } from '@playwright/test';

// Drummond institution ID
const DRUMMOND_INSTITUTION_ID = 'a5469bc2-dee5-461c-8e3a-f98cf8c386af';

test.describe('Professors Listing Fix', () => {

  test('API GET /api/teachers returns professors for Drummond institution', async ({ request }) => {
    // Call the new API endpoint
    const response = await request.get(`/api/teachers?institution_id=${DRUMMOND_INSTITUTION_ID}`);

    expect(response.ok()).toBe(true);

    const data = await response.json();
    console.log('API /api/teachers response:', JSON.stringify(data, null, 2));

    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // Log the number of professors found
    console.log(`Number of professors found via API: ${data.data.length}`);

    // Should have at least some professors
    expect(data.data.length).toBeGreaterThan(0);

    // Each professor should have user data
    if (data.data.length > 0) {
      const firstProfessor = data.data[0];
      expect(firstProfessor.role).toBe('professor');
      expect(firstProfessor.user).toBeDefined();
      console.log('First professor:', firstProfessor.user?.full_name);
    }
  });

  test('API GET /api/teachers requires institution_id', async ({ request }) => {
    const response = await request.get('/api/teachers');

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('API returns professors with complete user data', async ({ request }) => {
    const response = await request.get(`/api/teachers?institution_id=${DRUMMOND_INSTITUTION_ID}`);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // Verify each professor has complete user data
    for (const professor of data.data) {
      expect(professor.role).toBe('professor');
      expect(professor.user).toBeDefined();
      expect(professor.user.id).toBeDefined();
      expect(professor.user.full_name).toBeDefined();
      expect(professor.user.email).toBeDefined();
    }

    // Check that we have the real professors
    const realProfessors = data.data.filter((p: any) =>
      p.user.email.includes('@drummond.edu.br')
    );
    console.log(`Real Drummond professors: ${realProfessors.length}`);
    console.log('Names:', realProfessors.map((p: any) => p.user.full_name).join(', '));

    expect(realProfessors.length).toBe(4);
  });

  test('List all professors by institution', async ({ request }) => {
    // Get all institutions
    const institutionsResponse = await request.get('/api/institutions/public');
    const institutionsData = await institutionsResponse.json();

    if (institutionsData.data && institutionsData.data.length > 0) {
      console.log('\nProfessor count by institution:');
      console.log('================================');

      for (const institution of institutionsData.data) {
        const response = await request.get(`/api/teachers?institution_id=${institution.id}`);
        const data = await response.json();
        const count = data.data?.length || 0;
        console.log(`${institution.name}: ${count} professors`);
      }
    }
  });
});
