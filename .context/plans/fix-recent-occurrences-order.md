---
status: draft
generated: 2026-01-27
agents:
  - type: "bug-fixer"
    role: "Corrigir ordenação das ocorrências recentes"
phases:
  - id: "phase-1"
    name: "Análise"
    prevc: "P"
  - id: "phase-2"
    name: "Correção"
    prevc: "E"
---

# Corrigir Ordenação de Ocorrências Recentes na Visão Geral

> Ocorrências do dia 23/01 aparecem antes das do dia 27/01 na seção "Ocorrências Recentes"

## Task Snapshot
- **Primary goal:** Garantir que as ocorrências mais recentes (por data E hora) apareçam primeiro
- **Success signal:** Ocorrências do dia 27/01 aparecem antes das do dia 23/01
- **Key references:**
  - API: `app/api/dashboard/stats/route.ts`
  - Página: `app/admin/page.tsx`

---

## Análise do Problema

### Código Atual (linha 79-91 da API)

```typescript
// Recent occurrences - ordenar por occurrence_date
supabase
  .from('occurrences')
  .select(`
    *,
    student:students(full_name),
    occurrence_type:occurrence_types(category, severity),
    registered_by_user:users!occurrences_registered_by_fkey(full_name)
  `)
  .eq('institution_id', institutionId)
  .is('deleted_at', null)
  .order('occurrence_date', { ascending: false })  // <-- Linha 90
  .limit(10)
```

### Problema Identificado

A ordenação `.order('occurrence_date', { ascending: false })` **deveria** funcionar corretamente (mais recente primeiro). Possíveis causas:

| Causa Potencial | Probabilidade | Verificação |
|-----------------|---------------|-------------|
| Campo `occurrence_date` sem hora (apenas data) | Média | Verificar tipo no banco |
| Múltiplas ocorrências no mesmo dia sem hora definida | Alta | Adicionar ordenação secundária |
| Problema com timezone | Baixa | Verificar formato ISO |

### Hipótese Principal

Se múltiplas ocorrências têm a mesma data (ex: `2026-01-27T00:00:00`), a ordenação entre elas é **indeterminada**. O Postgres pode retornar em qualquer ordem.

**Solução:** Adicionar ordenação secundária por `created_at` (data de cadastro no sistema) para desempatar.

---

## Solução Proposta

### Alteração na API

**Arquivo:** `app/api/dashboard/stats/route.ts`

**Linha 90 - Antes:**
```typescript
.order('occurrence_date', { ascending: false })
```

**Linha 90 - Depois:**
```typescript
.order('occurrence_date', { ascending: false })
.order('created_at', { ascending: false })
```

### Lógica da Solução

1. **Ordenação primária:** `occurrence_date DESC` - Data/hora do evento
2. **Ordenação secundária:** `created_at DESC` - Para desempatar ocorrências do mesmo dia

Isso garante que:
- Ocorrências de dias diferentes: ordenadas pela data do evento
- Ocorrências do mesmo dia: ordenadas pela hora do evento, ou se a hora for igual, pela ordem de cadastro (mais recente primeiro)

---

## Melhoria Adicional: Exibir Hora na UI

### Problema Atual na UI

A página `app/admin/page.tsx` (linha 243) mostra apenas a data:

```tsx
<p className="text-xs text-muted-foreground">
  Ocorreu em {formatDate(occurrence.occurrence_date)} • Registrado por ...
</p>
```

### Melhoria Proposta

Usar `formatDateTime` em vez de `formatDate` para mostrar data E hora:

```tsx
<p className="text-xs text-muted-foreground">
  Ocorreu em {formatDateTime(occurrence.occurrence_date)} • Registrado por ...
</p>
```

Isso ajuda o usuário a entender a ordenação e ver exatamente quando cada ocorrência aconteceu.

---

## Checklist de Implementação

### Fase 1: Correção da API
- [ ] Adicionar `.order('created_at', { ascending: false })` após a ordenação por `occurrence_date`

### Fase 2: Melhoria da UI (opcional)
- [ ] Trocar `formatDate` por `formatDateTime` na exibição das ocorrências recentes

### Fase 3: Validação
- [ ] Verificar que ocorrências de 27/01 aparecem antes de 23/01
- [ ] Verificar que ocorrências do mesmo dia estão ordenadas por hora
- [ ] Build passa sem erros

---

## Código Final

### `app/api/dashboard/stats/route.ts` (linhas 79-92)

```typescript
// Recent occurrences - ordenar por occurrence_date + created_at para desempate
supabase
  .from('occurrences')
  .select(`
    *,
    student:students(full_name),
    occurrence_type:occurrence_types(category, severity),
    registered_by_user:users!occurrences_registered_by_fkey(full_name)
  `)
  .eq('institution_id', institutionId)
  .is('deleted_at', null)
  .order('occurrence_date', { ascending: false })
  .order('created_at', { ascending: false })  // NOVO: desempate
  .limit(10),
```

### `app/admin/page.tsx` (linha 243)

```tsx
<p className="text-xs text-muted-foreground">
  Ocorreu em {formatDateTime(occurrence.occurrence_date)} • Registrado por {occurrence.registered_by_user?.full_name}
</p>
```

---

## Impacto

| Aspecto | Impacto |
|---------|---------|
| Performance | Nenhum (ordenação adicional é trivial) |
| Banco de dados | Nenhum (sem migration) |
| Breaking changes | Nenhum |
| Arquivos alterados | 2 (API + página) |
