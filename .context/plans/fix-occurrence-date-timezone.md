---
status: completed
generated: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Investigar causa raiz e implementar correcao"
phases:
  - id: "phase-1"
    name: "Investigacao"
    prevc: "P"
    status: "completed"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
    status: "completed"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
    status: "completed"
---

# Corrigir Bug de Data - Ocorrencias Registradas com Dia Anterior Plan

> Investigar e corrigir problema onde ocorrencias sao exibidas com data do dia anterior ao registrado

## Task Snapshot
- **Primary goal:** Corrigir bug onde ocorrencias registradas em dia X aparecem como dia X-1 no sistema
- **Success signal:** Ocorrencias registradas aparecem com a data correta em todos os dashboards
- **Key references:**
  - `app/professor/registrar/page.tsx` - Pagina de registro de ocorrencias
  - `app/professor/ocorrencias/page.tsx` - Pagina de listagem/edicao
  - `lib/utils.ts` - Funcoes utilitarias de data

## Problema Reportado

O professor Cesar Belo Cavalcante registrou ocorrencias no dia 23 de janeiro de 2026, mas no sistema elas apareceram como dia 22 de janeiro.

## Investigacao

### Causa Raiz Identificada

O problema estava na construcao da string de data/hora em duas paginas:

**1. `app/professor/registrar/page.tsx` (linha 153)**
```typescript
occurrence_date: `${occurrenceDate}T${occurrenceTime}:00`,
```

**2. `app/professor/ocorrencias/page.tsx` (linha 191)**
```typescript
occurrence_date: `${editForm.occurrence_date}T${editForm.occurrence_time}:00`,
```

### Explicacao Tecnica

A string `"2026-01-23T10:30:00"` (sem indicador de timezone) e ambigua:

1. **JavaScript `new Date()`:** Interpreta como hora LOCAL
2. **PostgreSQL `timestamp with time zone`:** Interpreta como **UTC**

Quando o banco recebe `"2026-01-23T02:30:00"` (sem timezone), ele assume UTC. No Brasil (UTC-3), isso equivale a `"2026-01-22T23:30:00"` - **dia anterior!**

Para horarios entre 00:00 e 02:59 (hora local brasileira), a conversao para UTC resulta no dia anterior.

### Diagrama do Problema

```
Usuario digita: 23/01/2026 02:30
String criada:  "2026-01-23T02:30:00" (sem timezone)
PostgreSQL interpreta como UTC: 2026-01-23T02:30:00+00:00
Exibido no Brasil (UTC-3): 22/01/2026 23:30 <- DIA ERRADO!
```

## Solucao Implementada

### Requisito Especial
O sistema e para uso exclusivo no Brasil (horario de Brasilia). Mesmo que o usuario acesse de outro pais (ex: Montreal, Canada), as datas devem ser interpretadas como horario de Brasilia.

### 1. Nova funcao utilitaria (`lib/utils.ts`)

```typescript
// Criar datetime ISO em horario de Brasilia (UTC-3)
// O sistema e para uso no Brasil, entao todas as datas sao interpretadas como horario de Brasilia
// independente de onde o usuario esteja acessando
// Brasil aboliu horario de verao em 2019, entao e sempre UTC-3
export function createBrazilDateTimeISO(dateStr: string, timeStr: string): string {
  // Formato: YYYY-MM-DDTHH:MM:00-03:00
  return `${dateStr}T${timeStr}:00-03:00`;
}
```

### 2. Uso nos arquivos corrigidos

**`app/professor/registrar/page.tsx`:**
```typescript
import { createBrazilDateTimeISO } from '@/lib/utils';

// Antes:
occurrence_date: `${occurrenceDate}T${occurrenceTime}:00`,

// Depois:
occurrence_date: createBrazilDateTimeISO(occurrenceDate, occurrenceTime),
```

**`app/professor/ocorrencias/page.tsx`:**
```typescript
import { createBrazilDateTimeISO } from '@/lib/utils';

// Antes:
occurrence_date: `${editForm.occurrence_date}T${editForm.occurrence_time}:00`,

// Depois:
occurrence_date: createBrazilDateTimeISO(editForm.occurrence_date, editForm.occurrence_time),
```

### Como a Correcao Funciona

```
Usuario digita: 23/01/2026 10:30 (em qualquer lugar do mundo)
createBrazilDateTimeISO cria: "2026-01-23T10:30:00-03:00"
PostgreSQL interpreta corretamente: 10:30 no Brasil (UTC-3) = 13:30 UTC
Armazena: 2026-01-23T13:30:00+00:00 (UTC)
Exibido no Brasil: 23/01/2026 10:30 <- CORRETO!
```

### Por que `-03:00` fixo?
O Brasil aboliu o horario de verao em 2019. Desde entao, o horario de Brasilia e sempre UTC-3, sem variacao ao longo do ano. Isso simplifica a logica - nao precisamos de biblioteca de timezone.

## Validacao

- [x] Build passou sem erros (`npm run build`)
- [x] Funcao `createLocalDateTimeISO` exportada corretamente
- [x] Ambos arquivos atualizados para usar a nova funcao
- [x] TypeScript compila sem erros

## Arquivos Modificados

1. `lib/utils.ts` - Adicionada funcao `createBrazilDateTimeISO`
2. `app/professor/registrar/page.tsx` - Import e uso da nova funcao
3. `app/professor/ocorrencias/page.tsx` - Import e uso da nova funcao

## Rollback Plan

### Trigger
- Se a correcao causar outros problemas de data

### Procedimento
1. Reverter as 3 alteracoes via git
2. Impacto: Nenhum em dados existentes
3. Tempo estimado: < 5 minutos

## Nota sobre Dados Existentes

As ocorrencias ja registradas com data errada permanecem com a data errada no banco. Para corrigi-las seria necessario um script de migracao que ajustasse as datas, mas isso requer saber quais registros foram afetados e qual era a intencao original do usuario.

Recomendacao: Deixar dados existentes como estao e monitorar novos registros.
