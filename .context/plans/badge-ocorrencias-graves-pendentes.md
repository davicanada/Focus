---
status: review
generated: 2026-03-09
agents:
  - type: "frontend-specialist"
    role: "Modificar Sidebar e integrar nova API"
  - type: "backend-specialist"
    role: "Criar API de contagem de graves pendentes"
phases:
  - id: "phase-1"
    name: "Planejamento"
    prevc: "P"
    agent: "architect-specialist"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
    agent: "feature-developer"
---

# Badge de Ocorrências Graves Pendentes no Sidebar

> Badge vermelho na aba "Ocorrências" do sidebar (admin e viewer) mostrando a contagem de ocorrências com `severity='grave'` e `status='pending'`. Aparece automaticamente quando uma ocorrência grave é registrada e desaparece conforme são tratadas.

## Objetivo e Motivação

**Problema atual:** O admin e viewer não têm sinalização visual imediata quando uma nova ocorrência grave entra no sistema — precisam acessar a página para descobrir.

**Solução:** Badge idêntico ao de Alertas, aplicado à aba "Ocorrências", com contagem de graves ainda pendentes.

**Comportamento natural:** badge sobe quando professor registra grave → admin entra na página, trata a ocorrência → badge desce. Zero configuração extra.

---

## Análise de Impacto

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `app/api/occurrences/pending-graves/count/route.ts` | **NOVO** — API de contagem |
| `components/layout/Sidebar.tsx` | Adicionar fetch + badge na aba Ocorrências |

### O que NÃO muda
- Tabela `occurrences` — sem migration
- Lógica de alertas existente — sem alteração
- Páginas `/admin/ocorrencias` e `/viewer/ocorrencias` — sem alteração

---

## Definição do Badge

| Campo | Valor |
|---|---|
| Tabela | `occurrences` |
| Filtro de severidade | `severity = 'grave'` (via JOIN em `occurrence_types`) |
| Filtro de status | `status = 'pending'` |
| Filtro de soft delete | `deleted_at IS NULL` |
| Filtro de instituição | `institution_id` do usuário logado |
| Roles que veem | `admin` (`/admin/ocorrencias`) e `admin_viewer` (`/viewer/ocorrencias`) |

---

## Fases de Implementação

### Phase 1 — Planejamento ✅

| # | Task | Status |
|---|------|--------|
| 1.1 | Mapear arquivos impactados | completed |
| 1.2 | Definir query e regras do badge | completed |
| 1.3 | Aprovar plano com o usuário | pending |

---

### Phase 2 — Implementação (E)

**Objetivo:** Criar a API e integrar no Sidebar seguindo o padrão existente de alertas.

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| 2.1 | Criar `GET /api/occurrences/pending-graves/count` | `backend-specialist` | pending | Retorna `{ count: number }` |
| 2.2 | Adicionar fetch no `useEffect` do Sidebar | `frontend-specialist` | pending | Estado `pendingGraves` no Sidebar |
| 2.3 | Aplicar badge em `/admin/ocorrencias` e `/viewer/ocorrencias` | `frontend-specialist` | pending | Badge visual idêntico ao de alertas |

#### Detalhe: API (task 2.1)

```
GET /api/occurrences/pending-graves/count

1. Verificar autenticação (401 se não logado)
2. Buscar institution_id do usuário (admin ou admin_viewer)
3. Retornar 0 se não for admin ou viewer
4. Query:
   SELECT COUNT(o.id)
   FROM occurrences o
   JOIN occurrence_types ot ON ot.id = o.occurrence_type_id
   WHERE o.institution_id = {institution_id}
     AND ot.severity = 'grave'
     AND o.status = 'pending'
     AND o.deleted_at IS NULL
5. Retornar { count: number }
```

#### Detalhe: Sidebar (tasks 2.2 e 2.3)

Seguir exatamente o mesmo padrão do `unreadAlerts`:

```typescript
// Novo state
const [pendingGraves, setPendingGraves] = useState(0);

// Dentro do mesmo useEffect (ou useEffect separado com mesma lógica)
const fetchPendingGraves = async () => {
  const response = await fetch('/api/occurrences/pending-graves/count');
  if (response.ok) {
    const data = await response.json();
    setPendingGraves(data.count || 0);
  }
};

// Aplicar badge nos nav items
// Admin: href '/admin/ocorrencias'
// Viewer: href '/viewer/ocorrencias'
return navItems.map(item =>
  (item.href === '/admin/ocorrencias' || item.href === '/viewer/ocorrencias') && pendingGraves > 0
    ? { ...item, badge: pendingGraves }
    : item
);
```

O polling de 5 min e a Visibility API já estão implementados — basta adicionar o fetch junto ao existente.

---

### Phase 3 — Validação (V)

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 3.1 | Professor registra ocorrência **grave** | Badge aparece na aba Ocorrências (após polling ou refresh) |
| 3.2 | Professor registra ocorrência **leve** | Badge NÃO aparece |
| 3.3 | Admin muda status da grave para `in_progress` | Contagem diminui |
| 3.4 | Admin resolve todas as graves pendentes | Badge desaparece |
| 3.5 | Viewer logado vê badge em `/viewer/ocorrencias` | Badge aparece igualmente |
| 3.6 | Build TypeScript | Sem erros |

---

## Rollback

Dois arquivos simples, sem migration. Para reverter:
1. Remover `app/api/occurrences/pending-graves/count/route.ts`
2. Reverter as linhas adicionadas em `components/layout/Sidebar.tsx`
