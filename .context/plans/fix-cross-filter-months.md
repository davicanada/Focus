---
status: ready
generated: 2026-02-02
---

# Corrigir Cross-Filtering entre Graficos de Tipos Diferentes

## Problema

No `components/analytics/AnalyticsDashboard.tsx`, o filtro `months` do `FilterState` e setado corretamente pelo `handleMonthlyClick` (linha 598), mas **nenhum outro grafico aplica esse filtro** ao processar dados. Isso significa que selecionar um mes no grafico de tendencia mensal nao afeta os outros graficos.

### Exemplo do Bug
1. Usuario clica no "8A" no grafico de turmas -> `activeFilters.classIds = ['8A']`
2. Grafico mensal atualiza corretamente (aplica `filters.classIds` na linha 378)
3. Usuario faz Ctrl+Click em "Jan" no grafico mensal -> `activeFilters.months = ['Jan']`
4. **Bug**: Grafico de turmas NAO filtra por mes (linhas 431-436 nao verificam `filters.months`)
5. Os outros graficos (categorias, severidade, alunos, nivel de ensino, turno) tambem nao filtram por mes

### Causa Raiz

A funcao auxiliar para extrair o mes de uma ocorrencia e comparar com `filters.months` simplesmente nao foi implementada. Cada secao de filtragem (categorias, severidades, turmas, alunos, etc.) aplica todos os filtros EXCETO o seu proprio -- mas `months` foi esquecido em TODOS eles.

## Solucao

### Helper para Extrair Mes

Criar constante `monthNames` (ja existe na linha 368) e funcao:

```typescript
const getMonthName = (dateStr: string): string => {
  return monthNames[new Date(dateStr).getMonth()];
};
```

### Linhas a Adicionar

Adicionar `matchesFilter(getMonthName(r.occurrence_date), filters.months)` em cada secao:

| Secao | Linha | Descricao |
|-------|-------|-----------|
| Category chart | ~331 | Apos check de shifts |
| Severity chart | ~355 | Apos check de shifts |
| Student chart | ~399 | Apos check de shifts |
| Class chart | ~436 | Apos check de shifts |
| Education level chart | ~463 | Apos check de shifts |
| Shift chart | ~483 | Apos check de educationLevels |
| KPI calculation | ~504 | Apos check de shifts |

### Padrao

```typescript
if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;
```

### Arquivo Modificado
- `components/analytics/AnalyticsDashboard.tsx` -- unico arquivo

## Verificacao

1. Clicar em uma turma (ex: 8A) -> grafico mensal filtra por turma
2. Ctrl+Click em um mes (ex: Jan) -> TODOS os graficos filtram por turma + mes
3. KPIs refletem a combinacao
4. Clicar novamente no mes para deselecionar -> volta a mostrar todos os meses
5. Testar 3+ filtros simultaneos (turma + mes + severidade)
