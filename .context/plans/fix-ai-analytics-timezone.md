# Plano: Corrigir Problema de Timezone na AI Analytics

## Status: CONCLUÍDO ✅

## Problema Reportado

- Ocorrência no dia 26/01 às 9:15 estava sendo exibida como 12:15 pela IA
- Diferença de +3 horas indicava problema de conversão UTC → Brasília

## Causa Raiz Identificada

### Investigação no Banco de Dados

```sql
SELECT occurrence_date FROM occurrences WHERE occurrence_date::date = '2026-01-26'
-- Resultado: "2026-01-26T12:15:00.000Z" (UTC)
```

- **Coluna**: `timestamp with time zone` (timestamptz)
- **Armazenamento**: UTC (correto)
- **Problema**: A IA recebia timestamps em UTC e reportava sem converter

### Fluxo do Bug

1. Professor registra ocorrência às **09:15** (horário de Brasília)
2. Banco armazena como **12:15 UTC** (correto, UTC-3)
3. Query SQL retorna `2026-01-26T12:15:00.000Z`
4. IA recebia esse JSON e reportava "12:15" (UTC) ❌

## Solução Aplicada

### 1. Nova função `convertTimestampsToBrazilTime` em `lib/ai/shared.ts`

```typescript
export function convertTimestampsToBrazilTime(data: any[]): any[] {
  return data.map(row => {
    const newRow = { ...row };
    for (const key of Object.keys(newRow)) {
      const value = newRow[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        const date = new Date(value);
        const brazilDate = date.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        newRow[key] = brazilDate.replace(', ', ' às ');
      }
    }
    return newRow;
  });
}
```

### 2. Aplicação da conversão em `lib/ai/index.ts`

```typescript
export async function explainResults(question: string, data: any[]): Promise<ExplanationResult> {
  // Converte timestamps antes de enviar para a IA
  const dataWithBrazilTime = convertTimestampsToBrazilTime(data);

  const explanation = await explainResultsWithGemini(question, dataWithBrazilTime);
  // ...
}
```

### 3. Formato final enviado para a IA

**Antes**: `"occurrence_date": "2026-01-26T12:15:00+00:00"`
**Depois**: `"occurrence_date": "26/01/2026 às 09:15"`

## Arquivos Modificados

- [x] `lib/ai/shared.ts` - Nova função `convertTimestampsToBrazilTime`
- [x] `lib/ai/index.ts` - Aplica conversão antes de enviar para IA

## Teste E2E

- [x] `e2e/ai-timezone.spec.ts` - Teste de API confirma conversão correta

### Resultado do Teste

```
API Response: {
  "data": [{
    "occurrence_date": "2026-01-26T12:15:00+00:00"  // Banco (UTC)
  }],
  "explanation": "Data e Horário: 26/01/2026 às 09:15"  // IA (Brasil) ✅
}
SUCCESS: API is showing Brazil time correctly
```

## Resultado Final

A IA agora exibe corretamente **09:15** (horário de Brasília) em vez de **12:15** (UTC).
