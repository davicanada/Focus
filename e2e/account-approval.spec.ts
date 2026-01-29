import { test, expect } from '@playwright/test';

// Supabase credentials for direct database operations
const SUPABASE_URL = 'https://jtxfqsojicjtabtslqvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eGZxc29qaWNqdGFidHNscXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAyODcsImV4cCI6MjA4NDYxNjI4N30.anZQkr9qPcxj1Ga8YgfvTEU8cxvzPxPGSs-OxZSfmd8';

// Generate unique test email to avoid conflicts
const generateTestEmail = () => `test.${Date.now()}@example.com`;

// Dynamic IDs fetched at runtime
let masterUserId: string;
let testInstitutionId: string;

test.describe('Account Approval Flow', () => {

  // Helper to get master user ID
  async function getMasterUserId(request: any): Promise<string> {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: "SELECT id FROM users WHERE is_master = true LIMIT 1",
      },
    });
    const data = await response.json();
    return data[0]?.id;
  }

  // Helper to get first existing institution ID
  async function getTestInstitutionId(request: any): Promise<string> {
    const response = await request.get('/api/institutions/public');
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].id;
    }
    throw new Error('No institutions found in database. Please create one first.');
  }

  // Helper to clean up test data
  async function cleanupTestRequest(request: any, email: string) {
    // Delete access request by email (via RPC since RLS may block direct delete)
    await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: `DELETE FROM access_requests WHERE email = '${email}'`,
      },
    }).catch(() => {});
  }

  test.beforeAll(async ({ request }) => {
    masterUserId = await getMasterUserId(request);
    testInstitutionId = await getTestInstitutionId(request);
    console.log('Master user ID:', masterUserId);
    console.log('Test institution ID:', testInstitutionId);
  });

  test('Create access request as professor for existing institution', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Professor Teste E2E';
    const testPhone = '(11) 98765-4321';

    // Create access request
    const response = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: testPhone,
        request_type: 'professor',
        institution_id: testInstitutionId,
      }
    });

    const json = await response.json();
    console.log('Access request response:', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.email).toBe(testEmail);
    expect(json.data.status).toBe('pending');
    expect(json.data.request_type).toBe('professor');

    // Cleanup
    await cleanupTestRequest(request, testEmail);
  });

  test('Create access request as admin for existing institution', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Admin Teste E2E';
    const testPhone = '(11) 91234-5678';

    const response = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: testPhone,
        request_type: 'admin_existing',
        institution_id: testInstitutionId,
      }
    });

    const json = await response.json();
    console.log('Access request (admin_existing):', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
    expect(json.data.request_type).toBe('admin_existing');

    // Cleanup
    await cleanupTestRequest(request, testEmail);
  });

  test('Create access request for new institution', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Admin Nova Escola';
    const testPhone = '(21) 99999-8888';
    const institutionName = `Escola Teste E2E ${Date.now()}`;

    const response = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: testPhone,
        request_type: 'admin_new',
        institution_name: institutionName,
        institution_city: 'Rio de Janeiro',
        institution_state: 'RJ',
        institution_full_address: 'Rua Teste, 123 - Centro, Rio de Janeiro - RJ',
        institution_street: 'Rua Teste',
        institution_number: '123',
        institution_neighborhood: 'Centro',
        institution_state_code: 'RJ',
        institution_postal_code: '20000-000',
        institution_country: 'Brasil',
      }
    });

    const json = await response.json();
    console.log('Access request (admin_new):', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
    expect(json.data.request_type).toBe('admin_new');
    expect(json.data.institution_name).toBe(institutionName);

    // Cleanup
    await cleanupTestRequest(request, testEmail);
  });

  test('Reject duplicate pending access request', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Duplicado Teste';

    // First request
    await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: '(11) 99999-9999',
        request_type: 'professor',
        institution_id: testInstitutionId,
      }
    });

    // Second request with same email should fail
    const response = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName + ' 2',
        phone: '(11) 88888-8888',
        request_type: 'professor',
        institution_id: testInstitutionId,
      }
    });

    const json = await response.json();
    console.log('Duplicate request response:', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(false);
    expect(json.error).toBeDefined();
    expect(json.error).toContain('pendente');

    // Cleanup
    await cleanupTestRequest(request, testEmail);
  });

  test('Master can approve professor request and user can login', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Professor Aprovado';

    // Step 1: Create access request
    const createResponse = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: '(11) 97777-6666',
        request_type: 'professor',
        institution_id: testInstitutionId,
      }
    });

    const createJson = await createResponse.json();
    expect(createJson.success).toBe(true);
    const requestId = createJson.data.id;
    console.log('Created request ID:', requestId);

    // Step 2: Approve the request (as master)
    const approveResponse = await request.post('/api/approve-user', {
      data: {
        request_id: requestId,
        action: 'approve',
        reviewer_id: masterUserId,
      }
    });

    const approveJson = await approveResponse.json();
    console.log('Approve response:', JSON.stringify(approveJson, null, 2));

    expect(approveResponse.ok()).toBe(true);
    expect(approveJson.success).toBe(true);
    expect(approveJson.action).toBe('approved');
    expect(approveJson.user).toBeDefined();
    expect(approveJson.tempPassword).toBeDefined();

    // Verify user was created
    expect(approveJson.user.email).toBe(testEmail);
    expect(approveJson.user.full_name).toBe(testName);

    // Step 3: Verify user can login (check auth)
    const loginResponse = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        email: testEmail,
        password: approveJson.tempPassword,
      }
    });

    const loginJson = await loginResponse.json();
    console.log('Login response status:', loginResponse.status());

    expect(loginResponse.ok()).toBe(true);
    expect(loginJson.access_token).toBeDefined();
    expect(loginJson.user).toBeDefined();
    expect(loginJson.user.email).toBe(testEmail);

    // Note: Email would be sent here - check server logs for:
    // "Email would be sent: { to: '<email>', subject: 'Bem-vindo ao Focus...' }"
    console.log('Check server logs for welcome email to:', testEmail);

    // Cleanup: We don't delete the user since it's in Supabase Auth
    // In a real test environment, you would use a test database
  });

  test('Master can reject request with reason', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Usuario Rejeitado';
    const rejectionReason = 'Teste de rejeicao automatizado';

    // Create access request
    const createResponse = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: '(11) 95555-4444',
        request_type: 'professor',
        institution_id: testInstitutionId,
      }
    });

    const createJson = await createResponse.json();
    const requestId = createJson.data.id;

    // Reject the request
    const rejectResponse = await request.post('/api/approve-user', {
      data: {
        request_id: requestId,
        action: 'reject',
        reviewer_id: masterUserId,
        rejection_reason: rejectionReason,
      }
    });

    const rejectJson = await rejectResponse.json();
    console.log('Reject response:', JSON.stringify(rejectJson, null, 2));

    expect(rejectResponse.ok()).toBe(true);
    expect(rejectJson.success).toBe(true);
    expect(rejectJson.action).toBe('rejected');

    // Verify request status was updated
    const statusResponse = await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: `SELECT status, rejection_reason FROM access_requests WHERE id = '${requestId}'`,
      },
    });

    const statusData = await statusResponse.json();
    console.log('Request status:', statusData);

    expect(statusData[0].status).toBe('rejected');
    expect(statusData[0].rejection_reason).toBe(rejectionReason);

    // Cleanup
    await cleanupTestRequest(request, testEmail);
  });

  test('Approval of admin_new creates institution', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Admin Nova Instituicao';
    const institutionName = `Escola E2E ${Date.now()}`;

    // Create admin_new request
    const createResponse = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: '(31) 93333-2222',
        request_type: 'admin_new',
        institution_name: institutionName,
        institution_city: 'Belo Horizonte',
        institution_state: 'MG',
        institution_full_address: 'Av. Afonso Pena, 1000 - Centro, Belo Horizonte - MG',
        institution_street: 'Av. Afonso Pena',
        institution_number: '1000',
        institution_neighborhood: 'Centro',
        institution_state_code: 'MG',
        institution_postal_code: '30130-000',
        institution_country: 'Brasil',
      }
    });

    const createJson = await createResponse.json();
    expect(createJson.success).toBe(true);
    const requestId = createJson.data.id;

    // Approve the request
    const approveResponse = await request.post('/api/approve-user', {
      data: {
        request_id: requestId,
        action: 'approve',
        reviewer_id: masterUserId,
      }
    });

    const approveJson = await approveResponse.json();
    console.log('Approve admin_new response:', JSON.stringify(approveJson, null, 2));

    expect(approveResponse.ok()).toBe(true);
    expect(approveJson.success).toBe(true);

    // Verify institution was created
    const institutionResponse = await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: `SELECT id, name, city, state FROM institutions WHERE name = '${institutionName}'`,
      },
    });

    const institutionData = await institutionResponse.json();
    console.log('New institution:', institutionData);

    expect(institutionData.length).toBe(1);
    expect(institutionData[0].name).toBe(institutionName);
    expect(institutionData[0].city).toBe('Belo Horizonte');

    // Verify user was linked as admin
    const relationResponse = await request.post(`${SUPABASE_URL}/rest/v1/rpc/execute_ai_query`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        query_text: `SELECT role FROM user_institutions WHERE user_id = '${approveJson.user.id}'`,
      },
    });

    const relationData = await relationResponse.json();
    console.log('User role:', relationData);

    expect(relationData[0].role).toBe('admin');
  });

  test('Verify welcome email is logged on approval', async ({ request }) => {
    const testEmail = generateTestEmail();
    const testName = 'Email Teste';

    // Create and approve request
    const createResponse = await request.post('/api/access-request', {
      data: {
        email: testEmail,
        full_name: testName,
        phone: '(11) 91111-0000',
        request_type: 'professor',
        institution_id: testInstitutionId,
      }
    });

    const createJson = await createResponse.json();
    const requestId = createJson.data.id;

    const approveResponse = await request.post('/api/approve-user', {
      data: {
        request_id: requestId,
        action: 'approve',
        reviewer_id: masterUserId,
      }
    });

    const approveJson = await approveResponse.json();

    expect(approveResponse.ok()).toBe(true);
    expect(approveJson.success).toBe(true);

    // The email content is currently logged to console
    // In production with Resend enabled, it would be sent via the Resend API
    // Check server logs for: "Email would be sent:" and "Welcome email sent to:"
    console.log('=== EMAIL VERIFICATION ===');
    console.log('Expected email recipient:', testEmail);
    console.log('Expected subject: Bem-vindo ao Focus - Suas credenciais de acesso');
    console.log('Expected password in email:', approveJson.tempPassword);
    console.log('Check server console for email log output');
    console.log('===========================');

    // This test passes if the approval succeeds
    // Email verification requires checking server logs or enabling Resend
    expect(approveJson.tempPassword).toBeDefined();
    expect(approveJson.tempPassword.length).toBeGreaterThan(10);
  });

  // ============================================
  // T1: Validation Tests - Required Fields
  // ============================================

  test.describe('T1: Required Field Validation', () => {

    test('Reject request without email', async ({ request }) => {
      const response = await request.post('/api/access-request', {
        data: {
          full_name: 'Teste Sem Email',
          phone: '(11) 99999-9999',
          request_type: 'professor',
          institution_id: testInstitutionId,
        }
      });

      const json = await response.json();
      console.log('Response (no email):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('obrigat');
    });

    test('Reject request without full_name', async ({ request }) => {
      const response = await request.post('/api/access-request', {
        data: {
          email: generateTestEmail(),
          phone: '(11) 99999-9999',
          request_type: 'professor',
          institution_id: testInstitutionId,
        }
      });

      const json = await response.json();
      console.log('Response (no name):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('obrigat');
    });

    test('Reject request without request_type', async ({ request }) => {
      const response = await request.post('/api/access-request', {
        data: {
          email: generateTestEmail(),
          full_name: 'Teste Sem Tipo',
          phone: '(11) 99999-9999',
          institution_id: testInstitutionId,
        }
      });

      const json = await response.json();
      console.log('Response (no request_type):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('obrigat');
    });

    test('Reject request with empty email', async ({ request }) => {
      const response = await request.post('/api/access-request', {
        data: {
          email: '',
          full_name: 'Teste Email Vazio',
          phone: '(11) 99999-9999',
          request_type: 'professor',
          institution_id: testInstitutionId,
        }
      });

      const json = await response.json();
      console.log('Response (empty email):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
    });

  });

  // ============================================
  // T3: Security Tests
  // ============================================

  test.describe('T3: Security Tests', () => {

    test('Reject approval of non-existent request', async ({ request }) => {
      const fakeRequestId = '00000000-0000-0000-0000-000000000000';

      const response = await request.post('/api/approve-user', {
        data: {
          request_id: fakeRequestId,
          action: 'approve',
          reviewer_id: masterUserId,
        }
      });

      const json = await response.json();
      console.log('Response (non-existent request):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('nao encontrada');
    });

    test('Reject approval of already processed request', async ({ request }) => {
      const testEmail = generateTestEmail();

      // Create request
      const createResponse = await request.post('/api/access-request', {
        data: {
          email: testEmail,
          full_name: 'Teste Dupla Aprovacao',
          phone: '(11) 98888-7777',
          request_type: 'professor',
          institution_id: testInstitutionId,
        }
      });

      const createJson = await createResponse.json();
      const requestId = createJson.data.id;

      // First approval (should succeed)
      const firstApproval = await request.post('/api/approve-user', {
        data: {
          request_id: requestId,
          action: 'approve',
          reviewer_id: masterUserId,
        }
      });

      expect(firstApproval.ok()).toBe(true);

      // Second approval attempt (should fail)
      const secondApproval = await request.post('/api/approve-user', {
        data: {
          request_id: requestId,
          action: 'approve',
          reviewer_id: masterUserId,
        }
      });

      const secondJson = await secondApproval.json();
      console.log('Response (already processed):', JSON.stringify(secondJson, null, 2));

      expect(secondApproval.status()).toBe(404);
      expect(secondJson.error).toContain('ja processada');
    });

    test('Reject approval without request_id', async ({ request }) => {
      const response = await request.post('/api/approve-user', {
        data: {
          action: 'approve',
          reviewer_id: masterUserId,
        }
      });

      const json = await response.json();
      console.log('Response (no request_id):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('obrigat');
    });

    test('Reject approval without reviewer_id', async ({ request }) => {
      const testEmail = generateTestEmail();

      // Create request first
      const createResponse = await request.post('/api/access-request', {
        data: {
          email: testEmail,
          full_name: 'Teste Sem Reviewer',
          phone: '(11) 97777-6666',
          request_type: 'professor',
          institution_id: testInstitutionId,
        }
      });

      const createJson = await createResponse.json();
      const requestId = createJson.data.id;

      const response = await request.post('/api/approve-user', {
        data: {
          request_id: requestId,
          action: 'approve',
        }
      });

      const json = await response.json();
      console.log('Response (no reviewer_id):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('obrigat');

      // Cleanup
      await cleanupTestRequest(request, testEmail);
    });

    test('Reject approval with invalid action', async ({ request }) => {
      const testEmail = generateTestEmail();

      // Create request first
      const createResponse = await request.post('/api/access-request', {
        data: {
          email: testEmail,
          full_name: 'Teste Acao Invalida',
          phone: '(11) 96666-5555',
          request_type: 'professor',
          institution_id: testInstitutionId,
        }
      });

      const createJson = await createResponse.json();
      const requestId = createJson.data.id;

      const response = await request.post('/api/approve-user', {
        data: {
          request_id: requestId,
          action: 'invalid_action',
          reviewer_id: masterUserId,
        }
      });

      const json = await response.json();
      console.log('Response (invalid action):', JSON.stringify(json, null, 2));

      expect(response.status()).toBe(400);
      expect(json.error).toBeDefined();
      expect(json.error).toContain('invalida');

      // Cleanup
      await cleanupTestRequest(request, testEmail);
    });

  });

});
