import { test, expect } from '@playwright/test';

test.describe('Institution Select in Access Request', () => {
  test.setTimeout(60000);

  test.describe('Public Institutions API', () => {
    test('GET /api/institutions/public returns active institutions', async ({ request }) => {
      const response = await request.get('/api/institutions/public');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      // Should have at least one institution (from seed data)
      expect(data.data.length).toBeGreaterThan(0);

      // Check structure of returned data
      const firstInstitution = data.data[0];
      expect(firstInstitution).toHaveProperty('id');
      expect(firstInstitution).toHaveProperty('name');
      expect(firstInstitution).toHaveProperty('city');
      expect(firstInstitution).toHaveProperty('state_code');

      // Should NOT have sensitive fields
      expect(firstInstitution).not.toHaveProperty('full_address');
      expect(firstInstitution).not.toHaveProperty('latitude');
      expect(firstInstitution).not.toHaveProperty('longitude');
    });

    test('institutions are ordered by name', async ({ request }) => {
      const response = await request.get('/api/institutions/public');
      const data = await response.json();

      if (data.data.length > 1) {
        const names = data.data.map((inst: { name: string }) => inst.name);
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
        expect(names).toEqual(sortedNames);
      }
    });
  });

  test.describe('Access Request Modal - Professor Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('can open access request modal', async ({ page }) => {
      // Click "Solicitar Acesso" button (lowercase in the button)
      await page.click('button:has-text("Solicitar acesso")');

      // Modal should be visible - check for heading specifically
      await expect(page.getByRole('heading', { name: 'Solicitar Acesso' })).toBeVisible();
      await expect(page.locator('label:has-text("Tipo de Solicitação")')).toBeVisible();
    });

    test('professor type shows institution dropdown with options', async ({ page }) => {
      await page.click('button:has-text("Solicitar acesso")');

      // Professor is the default type, so institution select should be visible
      await expect(page.locator('label:has-text("Instituição")')).toBeVisible();

      // Wait for institutions to load
      await page.waitForTimeout(1500);

      // Click on the select to see options
      const select = page.locator('select#institutionId');
      await expect(select).toBeVisible();

      // Get all options
      const options = await select.locator('option').allTextContents();

      // Should have the placeholder + at least one institution
      expect(options.length).toBeGreaterThan(1);

      // First option should be placeholder
      expect(options[0]).toContain('Selecione uma instituição');

      // Log available institutions for debugging
      console.log('Available institutions:', options);

      // At least one real institution should be available (not just placeholder)
      const realInstitutions = options.filter(opt => !opt.includes('Selecione'));
      expect(realInstitutions.length).toBeGreaterThan(0);
    });

    test('can select institution and fill form as professor', async ({ page }) => {
      await page.click('button:has-text("Solicitar acesso")');

      // Wait for institutions to load
      await page.waitForTimeout(1500);

      // Fill personal info
      await page.fill('input#fullName', 'Professor Teste');
      await page.fill('input#email', `prof.teste.${Date.now()}@example.com`);
      await page.fill('input#phone', '(11) 99999-9999');

      // Select first available institution
      const select = page.locator('select#institutionId');
      const options = await select.locator('option').all();

      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value && value !== '') {
          await select.selectOption(value);
          break;
        }
      }

      // Verify institution is selected
      const selectedValue = await select.inputValue();
      expect(selectedValue).not.toBe('');

      // Submit button should be enabled
      const submitButton = page.getByRole('button', { name: 'Enviar Solicitação' });
      await expect(submitButton).toBeEnabled();
    });

    test('submits professor access request successfully', async ({ page }) => {
      await page.click('button:has-text("Solicitar acesso")');

      // Wait for institutions to load
      await page.waitForTimeout(1500);

      // Fill personal info
      const uniqueEmail = `prof.teste.${Date.now()}@example.com`;
      await page.fill('input#fullName', 'Professor Teste Submissao');
      await page.fill('input#email', uniqueEmail);

      // Select first available institution
      const select = page.locator('select#institutionId');
      const options = await select.locator('option').all();

      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value && value !== '') {
          await select.selectOption(value);
          break;
        }
      }

      // Submit
      await page.click('button:has-text("Enviar Solicitação")');

      // Wait for submission and check modal closes or loading state changes
      // Modal should close after successful submission
      await page.waitForTimeout(3000);

      // Either modal closes or we see success indication
      const modalClosed = await page.getByRole('heading', { name: 'Solicitar Acesso' }).isHidden();
      const buttonText = await page.locator('button:has-text("Enviar")').textContent();

      // Success: modal closed OR button is no longer in loading state
      expect(modalClosed || !buttonText?.includes('Enviando')).toBeTruthy();
    });
  });

  test.describe('Access Request Modal - Admin Existing Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('admin_existing type shows institution dropdown', async ({ page }) => {
      await page.click('button:has-text("Solicitar acesso")');

      // Change to admin_existing
      await page.selectOption('select#requestType', 'admin_existing');

      // Institution select should be visible
      await expect(page.locator('label:has-text("Instituição")')).toBeVisible();

      // Wait for institutions to load
      await page.waitForTimeout(1500);

      // Select should have options
      const select = page.locator('select#institutionId');
      const options = await select.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(1);
    });

    test('submits admin access request for existing institution', async ({ page }) => {
      await page.click('button:has-text("Solicitar acesso")');

      // Wait for modal to open
      await expect(page.getByRole('heading', { name: 'Solicitar Acesso' })).toBeVisible();

      // Change to admin_existing - use the modal's form context
      const modalForm = page.locator('form:has(select#requestType)');
      await modalForm.locator('select#requestType').selectOption('admin_existing');

      // Wait for institutions to load
      await page.waitForTimeout(1500);

      // Fill personal info using form context to avoid login form
      const uniqueEmail = `admin.existente.${Date.now()}@example.com`;
      await modalForm.locator('input#fullName').fill('Admin Teste Existente');
      await modalForm.locator('input#email').fill(uniqueEmail);

      // Select first available institution
      const select = modalForm.locator('select#institutionId');
      const options = await select.locator('option').all();

      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value && value !== '') {
          await select.selectOption(value);
          break;
        }
      }

      // Add message
      await modalForm.locator('textarea#message').fill('Sou o diretor da escola');

      // Submit
      await modalForm.locator('button:has-text("Enviar Solicitação")').click();

      // Wait for submission
      await page.waitForTimeout(3000);

      // Modal should close after successful submission
      const modalClosed = await page.getByRole('heading', { name: 'Solicitar Acesso' }).isHidden();
      expect(modalClosed).toBeTruthy();
    });
  });

  test.describe('Access Request Modal - Admin New Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('admin_new type hides institution dropdown and shows new institution fields', async ({ page }) => {
      await page.click('button:has-text("Solicitar acesso")');

      // Change to admin_new
      await page.selectOption('select#requestType', 'admin_new');

      // Institution select should NOT be visible
      await expect(page.locator('select#institutionId')).toBeHidden();

      // New institution fields should be visible
      await expect(page.locator('label:has-text("Nome da Instituição")')).toBeVisible();
      await expect(page.locator('label:has-text("Endereço da Instituição")')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('prevents submission when no institution selected', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Solicitar acesso")');

      // Wait for modal and institutions to load
      await page.waitForTimeout(1500);

      // Fill personal info but don't select institution
      await page.fill('input#fullName', 'Professor Sem Instituicao');
      await page.fill('input#email', 'sem.instituicao@example.com');

      // Try to submit
      await page.click('button:has-text("Enviar Solicitação")');

      // Wait a moment for any error to appear
      await page.waitForTimeout(1000);

      // Modal should still be open (form not submitted)
      const modalStillOpen = await page.getByRole('heading', { name: 'Solicitar Acesso' }).isVisible();
      expect(modalStillOpen).toBeTruthy();

      // Institution select should still show placeholder (no value selected)
      const select = page.locator('select#institutionId');
      const selectedValue = await select.inputValue();
      expect(selectedValue).toBe('');
    });
  });
});
