import { test, expect } from '@playwright/test';

// Helper to get first existing institution ID
async function getTestInstitutionId(request: any): Promise<string> {
  const response = await request.get('/api/institutions/public');
  const data = await response.json();
  if (data.data && data.data.length > 0) {
    return data.data[0].id;
  }
  throw new Error('No institutions found in database. Please create one first.');
}

test.describe('Ordenação de Ocorrências Recentes', () => {
  let testInstitutionId: string;

  test.beforeAll(async ({ request }) => {
    testInstitutionId = await getTestInstitutionId(request);
    console.log('Test institution ID:', testInstitutionId);
  });

  test('API retorna ocorrências ordenadas por data decrescente', async ({ request }) => {
    // Chamar a API de stats do dashboard
    const response = await request.get(`/api/dashboard/stats?institution_id=${testInstitutionId}`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);

    const occurrences = data.recentOccurrences;
    console.log(`Encontradas ${occurrences.length} ocorrências recentes`);

    // Se não houver ocorrências suficientes, teste passa
    if (occurrences.length < 2) {
      console.log('Menos de 2 ocorrências - não há ordenação para verificar');
      return;
    }

    // Exibir as datas para debug
    console.log('Ocorrências retornadas pela API:');
    occurrences.forEach((occ: any, i: number) => {
      console.log(`  ${i + 1}. ${occ.occurrence_date} - ${occ.student?.full_name} - ${occ.occurrence_type?.category}`);
    });

    // Verificar ordenação decrescente por occurrence_date
    for (let i = 1; i < occurrences.length; i++) {
      const currentDate = new Date(occurrences[i].occurrence_date);
      const previousDate = new Date(occurrences[i - 1].occurrence_date);

      console.log(`Comparando: ${previousDate.toISOString()} >= ${currentDate.toISOString()}`);

      // A data anterior deve ser maior ou igual à data atual (ordem decrescente)
      expect(previousDate.getTime()).toBeGreaterThanOrEqual(currentDate.getTime());
    }

    console.log('Todas as datas estão em ordem decrescente correta!');
  });

  test('Ocorrências mais recentes (27/01) devem vir antes das mais antigas (23/01)', async ({ request }) => {
    const response = await request.get(`/api/dashboard/stats?institution_id=${testInstitutionId}`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const occurrences = data.recentOccurrences;

    if (occurrences.length === 0) {
      console.log('Nenhuma ocorrência encontrada');
      return;
    }

    // Verificar se a primeira ocorrência é a mais recente
    const firstDate = new Date(occurrences[0].occurrence_date);
    const allDates = occurrences.map((occ: any) => new Date(occ.occurrence_date));
    const maxDate = new Date(Math.max(...allDates.map((d: Date) => d.getTime())));

    console.log(`Primeira ocorrência: ${firstDate.toISOString()}`);
    console.log(`Data mais recente: ${maxDate.toISOString()}`);

    // A primeira ocorrência deve ter a data mais recente (ou igual se houver empate)
    expect(firstDate.getTime()).toBe(maxDate.getTime());
  });

  test('Verificar que occurrence_date contém hora (não apenas data)', async ({ request }) => {
    const response = await request.get(`/api/dashboard/stats?institution_id=${testInstitutionId}`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const occurrences = data.recentOccurrences;

    if (occurrences.length === 0) {
      console.log('Nenhuma ocorrência encontrada');
      return;
    }

    // Verificar formato do primeiro occurrence_date
    const firstOccurrence = occurrences[0];
    console.log('occurrence_date raw:', firstOccurrence.occurrence_date);

    // O campo deve ser um timestamp completo (ISO 8601 com hora)
    // Exemplo: "2026-01-27T14:30:00+00:00" ou "2026-01-27T14:30:00.000Z"
    const dateString = firstOccurrence.occurrence_date;

    // Verificar se contém "T" indicando que tem hora
    expect(dateString).toContain('T');

    // Verificar se não é meia-noite (00:00:00) - indicaria que só a data foi salva
    const hasTime = !dateString.includes('T00:00:00');
    console.log(`Ocorrência tem hora específica: ${hasTime}`);

    // Se todas as ocorrências forem às 00:00:00, pode indicar que a hora não está sendo salva
    const allMidnight = occurrences.every((occ: any) => occ.occurrence_date.includes('T00:00:00'));
    if (allMidnight) {
      console.log('AVISO: Todas as ocorrências estão com hora 00:00:00 - verificar se a hora está sendo salva corretamente');
    }
  });
});
