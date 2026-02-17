---
status: completed
generated: 2026-02-04
agents:
  - type: "bug-fixer"
    role: "Fix NULL status handling in KPI cards and reports"
phases:
  - id: "phase-1"
    name: "Diagnóstico"
    prevc: "P"
  - id: "phase-2"
    name: "Correção"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Correção de KPIs e Contagem de Status NULL

> Corrigir: KPI Cards mostrando 0 para status que existem no banco, relatório de devolutivas mostrando 0

## Diagnóstico do Problema

### Problema 1: KPI Cards em admin/ocorrencias mostram valores incorretos
**Localização:** `app/admin/ocorrencias/page.tsx` linhas 295-301

**Código problemático:**
```typescript
setStats({
  total: allStatuses.length,
  pending: allStatuses.filter((o: { status: string }) => o.status === 'pending').length,
  in_progress: allStatuses.filter((o: { status: string }) => o.status === 'in_progress').length,
  resolved: allStatuses.filter((o: { status: string }) => o.status === 'resolved').length
});
```

**Causa raiz:** Ocorrências com `status = NULL` no banco de dados não são contabilizadas em nenhuma categoria. O filtro `o.status === 'pending'` retorna `false` quando `status` é `null`.

**Evidência:** Linha 334 faz fallback `(o.status || 'pending')` para exibição na tabela, mas os stats não usam esse fallback.

### Problema 2: API de relatório de devolutivas conta status incorretamente
**Localização:** `app/api/reports/devolutiva/route.ts` linhas 146-150

**Código problemático:**
```typescript
const byStatus = {
  pending: occurrences?.filter(o => o.status === 'pending').length || 0,
  in_progress: occurrences?.filter(o => o.status === 'in_progress').length || 0,
  resolved: occurrences?.filter(o => o.status === 'resolved').length || 0
};
```

**Causa raiz:** Mesmo problema - NULL não é igual a 'pending', 'in_progress' ou 'resolved'.

**Nota:** Linha 167 já faz o fallback corretamente: `status: o.status || 'pending'`

## Solução Proposta

### Correção 1: admin/ocorrencias/page.tsx
Tratar NULL como 'pending' na contagem de stats:

```typescript
setStats({
  total: allStatuses.length,
  pending: allStatuses.filter((o: { status: string | null }) => !o.status || o.status === 'pending').length,
  in_progress: allStatuses.filter((o: { status: string | null }) => o.status === 'in_progress').length,
  resolved: allStatuses.filter((o: { status: string | null }) => o.status === 'resolved').length
});
```

### Correção 2: app/api/reports/devolutiva/route.ts
Tratar NULL como 'pending' na contagem by_status:

```typescript
const byStatus = {
  pending: occurrences?.filter(o => !o.status || o.status === 'pending').length || 0,
  in_progress: occurrences?.filter(o => o.status === 'in_progress').length || 0,
  resolved: occurrences?.filter(o => o.status === 'resolved').length || 0
};
```

## Arquivos a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `app/admin/ocorrencias/page.tsx` | 298 | Adicionar `!o.status \|\|` antes de `o.status === 'pending'` |
| `app/api/reports/devolutiva/route.ts` | 147 | Adicionar `!o.status \|\|` antes de `o.status === 'pending'` |

## Impacto Esperado

Após a correção:
- KPI Cards mostrarão contagem correta de Pendentes, Em Andamento e Resolvidas
- Relatório de devolutivas mostrará by_status correto
- Ocorrências sem status definido serão tratadas como "Pendentes"

## Validação

1. Verificar que a soma de pending + in_progress + resolved = total
2. Verificar que ocorrências com status NULL aparecem como "Pendentes"
3. Verificar relatório de devolutivas mostra contagens corretas

## Correções Implementadas (04/02/2026)

### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `app/admin/ocorrencias/page.tsx` | Linha 298: `!o.status \|\|` adicionado |
| `app/viewer/ocorrencias/page.tsx` | Linha 146: `!o.status \|\|` adicionado |
| `app/api/reports/devolutiva/route.ts` | Linha 147: `!o.status \|\|` adicionado |
| `app/api/professor/feedback-summary/route.ts` | Linha 47: `!o.status \|\|` adicionado |

### Build e Testes
- ✅ Build passando
- ✅ 34 testes Playwright passando (17 chromium + 17 mobile)
