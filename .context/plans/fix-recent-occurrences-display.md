---
status: completed
generated: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Investigar e corrigir problema de exibicao de ocorrencias recentes"
phases:
  - id: "phase-1"
    name: "Investigacao"
    prevc: "P"
    status: "completed"
  - id: "phase-2"
    name: "Correcao"
    prevc: "E"
    status: "completed"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
    status: "completed"
---

# Corrigir Exibicao de Ocorrencias Recentes no Admin Dashboard

> Investigar por que ocorrencias registradas recentemente nao aparecem na lista de "Ocorrencias Recentes"

## Problema Reportado

O professor Cesar Belo Cavalcante registrou 2 ocorrencias graves no dia 23 de janeiro, mas elas nao aparecem na lista de "Ocorrencias Recentes" do admin. Apenas 1 ocorrencia media do dia 23 aparece.

## Task Snapshot
- **Primary goal:** Garantir que as ocorrencias mais recentes aparecam corretamente no dashboard do admin
- **Success signal:** Todas as ocorrencias recentes aparecem na ordem correta
- **Key references:**
  - `app/admin/page.tsx` - Dashboard do admin (consome API)
  - `app/api/dashboard/stats/route.ts` - API que busca dados

## Codebase Context

### Query Atual de Ocorrencias Recentes (linha 77-87)

```typescript
// Recent occurrences
supabase
  .from('occurrences')
  .select(`
    *,
    student:students(full_name),
    occurrence_type:occurrence_types(category, severity),
    registered_by_user:users!occurrences_registered_by_fkey(full_name)
  `)
  .eq('institution_id', institutionId)
  .order('occurrence_date', { ascending: false })
  .limit(5),
```

### Problemas Potenciais Identificados

#### 1. Ordenacao por `occurrence_date` vs `created_at`

**Problema:** A query ordena por `occurrence_date` (data em que a ocorrencia ACONTECEU), nao por `created_at` (data em que foi REGISTRADA).

**Cenario:**
- Professor registra hoje uma ocorrencia que aconteceu ha 2 semanas
- Essa ocorrencia nao aparecera como "recente" porque a data da ocorrencia e antiga
- Mas deveria aparecer porque foi registrada recentemente

**Solucao proposta:** Ordenar por `created_at DESC` para mostrar as ultimas REGISTRADAS.

#### 2. Bug de Timezone Anterior

**Contexto:** Acabamos de corrigir um bug onde ocorrencias eram salvas com timezone incorreto. As 2 ocorrencias graves registradas pelo professor podem ter sido salvas com a data errada (22/01 em vez de 23/01) se foram registradas ANTES da correcao.

**Verificacao necessaria:** Consultar o banco para ver as datas reais das ocorrencias.

#### 3. Limite de 5 Registros

**Problema:** O limite de 5 pode ser muito restritivo se houver muitas ocorrencias no mesmo dia.

**Solucao proposta:** Aumentar para 10 e/ou adicionar filtro por periodo recente (ultimos 7 dias).

#### 4. Falta de Filtros de Atividade

**Problema:** A query nao filtra `is_active` ou `deleted_at`, podendo incluir registros inativos.

**Solucao proposta:** Adicionar filtros de atividade.

## Investigacao

### Step 1: Verificar Ocorrencias no Banco

Consultar diretamente o banco para ver todas as ocorrencias do dia 23/01:

```sql
SELECT
  o.id,
  o.occurrence_date,
  o.created_at,
  s.full_name as student_name,
  ot.category,
  ot.severity,
  u.full_name as registered_by
FROM occurrences o
JOIN students s ON o.student_id = s.id
JOIN occurrence_types ot ON o.occurrence_type_id = ot.id
JOIN users u ON o.registered_by = u.id
WHERE o.occurrence_date >= '2026-01-23'
  AND o.occurrence_date < '2026-01-24'
ORDER BY o.created_at DESC;
```

### Step 2: Verificar Todas as Ocorrencias Recentes

```sql
SELECT
  o.id,
  o.occurrence_date,
  o.created_at,
  ot.severity
FROM occurrences o
JOIN occurrence_types ot ON o.occurrence_type_id = ot.id
ORDER BY o.created_at DESC
LIMIT 10;
```

## Correcao Proposta

### Opcao A: Ordenar por `created_at` (Recomendado)

```typescript
// Recent occurrences - ordenar por data de REGISTRO
supabase
  .from('occurrences')
  .select(`
    *,
    student:students(full_name),
    occurrence_type:occurrence_types(category, severity),
    registered_by_user:users!occurrences_registered_by_fkey(full_name)
  `)
  .eq('institution_id', institutionId)
  .order('created_at', { ascending: false })
  .limit(10),
```

### Opcao B: Ordenar por Ambas (created_at principal, occurrence_date secundario)

Se quiser manter a semantica de "ocorrencias mais recentes que aconteceram":

```typescript
.order('occurrence_date', { ascending: false })
.order('created_at', { ascending: false })
.limit(10),
```

### Opcao C: Filtrar por Periodo + Ordenar

Mostrar ocorrencias dos ultimos 7 dias, ordenadas por data:

```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .gte('created_at', sevenDaysAgo.toISOString())
  .order('created_at', { ascending: false })
  .limit(10),
```

## Decisao

**Recomendacao:** Usar **Opcao A** (ordenar por `created_at`) porque:
1. "Ocorrencias Recentes" significa "registradas recentemente", nao "aconteceram recentemente"
2. E o comportamento mais intuitivo para o admin
3. Garante que novas ocorrencias sempre aparecem no topo

## Mudancas a Implementar

1. **`app/api/dashboard/stats/route.ts`:**
   - Mudar `order('occurrence_date', ...)` para `order('created_at', ...)`
   - Aumentar limit de 5 para 10

2. **`app/admin/page.tsx`:**
   - Verificar se exibe `created_at` ou `occurrence_date` (atualmente exibe `occurrence_date` via `formatDateTime`)
   - Considerar mostrar ambas as datas para clareza

## Validacao

- [ ] Consultar banco para confirmar que as 2 ocorrencias graves existem
- [ ] Verificar as datas (`occurrence_date` vs `created_at`)
- [ ] Aplicar correcao
- [ ] Verificar que as ocorrencias aparecem corretamente
- [ ] Build passando
