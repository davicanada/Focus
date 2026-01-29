import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'davialmeida1996@gmail.com';

test.describe('Email Nodemailer + Gmail SMTP', () => {

  test('should send test email with new design', async ({ request }) => {
    const response = await request.post('/api/test-email', {
      data: {
        to: TEST_EMAIL,
        message: 'Este email mostra o novo design profissional com a logo do Focus!',
      },
      timeout: 30000
    });

    const json = await response.json();
    console.log('Test email response:', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
  });

  test('should send welcome email with credentials box', async ({ request }) => {
    const response = await request.post('/api/test-email', {
      data: {
        to: TEST_EMAIL,
        type: 'welcome',
      },
      timeout: 30000
    });

    const json = await response.json();
    console.log('Welcome email response:', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
    expect(json.type).toBe('welcome');
  });

  test('should send access request notification', async ({ request }) => {
    const response = await request.post('/api/test-email', {
      data: {
        to: TEST_EMAIL,
        type: 'access-request',
      },
      timeout: 30000
    });

    const json = await response.json();
    console.log('Access request email response:', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
    expect(json.type).toBe('access-request');
  });

  test('should send occurrence notification', async ({ request }) => {
    const response = await request.post('/api/test-email', {
      data: {
        to: TEST_EMAIL,
        type: 'occurrence',
      },
      timeout: 30000
    });

    const json = await response.json();
    console.log('Occurrence email response:', JSON.stringify(json, null, 2));

    expect(response.ok()).toBe(true);
    expect(json.success).toBe(true);
    expect(json.type).toBe('occurrence');
  });

  test('should reject request without recipient', async ({ request }) => {
    const response = await request.post('/api/test-email', {
      data: {
        message: 'Teste sem destinatário',
      }
    });

    const json = await response.json();
    expect(response.status()).toBe(400);
    expect(json.error).toContain('Destinatário');
  });

});
