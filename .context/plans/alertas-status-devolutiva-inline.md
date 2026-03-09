---
status: ready
generated: 2026-03-08
agents:
  - type: "frontend-specialist"
    role: "Implementar UI inline na AlertNotifications e modal de devolutiva"
  - type: "backend-specialist"
    role: "Estender API /api/alert-notifications com dados de status e feedbacks"
  - type: "code-reviewer"
    role: "Revisar tipos TypeScript, reutilização de componentes, UX"
phases:
  - id: "phase-P"
    name: "Plano e Arquitetura"
    prevc: "P"
    agent: "architect-specialist"
  - id: "phase-E"
    name: "Implementação"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "phase-V"
    name: "Validação"
    prevc: "V"
    agent: "code-reviewer"
---

# Status e Devolutiva Inline na Aba de Alertas

> Adicionar colunas de status (Pendente/Em andamento/Resolvida) e ação de devolutiva
> diretamente na lista de notificações da aba Alertas, eliminando a necessidade de
> navegar até a aba de Ocorrências para tratar um alerta.

## Task Snapshot
- **Primary goal:** O admin vê o alerta → vê o status da ocorrência vinculada → pode mudar o status e adicionar devolutiva, tudo na mesma tela.
- **Success signal:** Um admin consegue, sem sair da aba Alertas: ver o badge de status, clicar em "Tratar", preencher o formulário de devolutiva e salvar — com a lista atualizando em tempo real.
- **Key references:**
  - `components/admin/alerts/AlertNotifications.tsx` — componente principal a modificar
  - `app/api/alert-notifications/route.ts` — API de notificações (GET precisa de join com status)
  - `components/occurrences/OccurrenceStatusBadge.tsx` — reutilizar badge de status existente
  - `components/occurrences/OccurrenceFeedbackTimeline.tsx` — reutilizar timeline de devolutivas
  - `app/api/occurrences/[id]/feedbacks/route.ts` — API existente de feedbacks
  - `app/api/occurrences/[id]/route.ts` — API existente para atualizar status

---

## Contexto do Código

### Estrutura atual de AlertNotification (API)
A notificação hoje traz apenas:
```
alert_rule: { id, name, scope_type, filter_type }
occurrence: { id, occurrence_date, student: { id, full_name } }
```
Faltam: `occurrence.status`, `occurrence.occurrence_type`, `occurrence.description`

### Componentes reutilizáveis disponíveis
- `OccurrenceStatusBadge` — aceita `status: OccurrenceStatus`, renderiza badge colorido
- `OccurrenceFeedbackTimeline` — aceita `occurrenceId`, carrega e exibe histórico de devolutivas
- `OCCURRENCE_STATUS` em `lib/constants/feedback.ts` — labels e cores dos status

### APIs existentes que serão reutilizadas (sem criar novas)
- `PUT /api/occurrences/[id]` — atualiza `status` da ocorrência
- `GET/POST /api/occurrences/[id]/feedbacks` — CRUD de devolutivas

---

## Decisões de Arquitetura

### O que NÃO fazer
- Não criar nova API separada — apenas estender o JOIN existente no GET de notificações
- Não duplicar o formulário de devolutiva — reutilizar `OccurrenceFeedbackTimeline`
- Não redirecionar para outra página — tudo inline com modal

### O que FAZER
- Estender o SELECT do GET `/api/alert-notifications` para incluir `status` e `occurrence_type`
- Adicionar coluna "Status" na lista com `OccurrenceStatusBadge`
- Adicionar botão "Tratar" que abre um modal com:
  - Informações da ocorrência (aluno, tipo, data, status atual)
  - Select para mudar o status (Pendente → Em andamento → Resolvida)
  - `OccurrenceFeedbackTimeline` para visualizar e adicionar devolutivas
- Marcar notificação como lida automaticamente ao abrir o modal

---

## Fases de Trabalho

### Phase P — Plano (este documento) ✅

---

### Phase E — Implementação

**Objetivo:** Implementar o fluxo completo de status + devolutiva inline na aba Alertas.

#### E1 — Estender API de Notificações
**Arquivo:** `app/api/alert-notifications/route.ts`

Modificar o SELECT para incluir dados completos da ocorrência:
```ts
occurrence:occurrences(
  id,
  occurrence_date,
  status,
  description,
  student:students(id, full_name),
  occurrence_type:occurrence_types(
    category,
    severity,
    subcategory:occurrence_subcategories(name, color)
  )
)
```

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| E1 | Atualizar SELECT no GET /api/alert-notifications | `backend-specialist` | pending | API retorna `status` e `occurrence_type` |

---

#### E2 — Atualizar Tipos TypeScript
**Arquivo:** `types/index.ts`

Estender o campo `occurrence` no tipo `AlertNotification`:
```ts
occurrence?: {
  id: string;
  occurrence_date: string;
  status: OccurrenceStatus;
  description?: string;
  student?: { id: string; full_name: string };
  occurrence_type?: {
    category: string;
    severity: string;
    subcategory?: { name: string; color?: string };
  };
};
```

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| E2 | Estender tipo AlertNotification em types/index.ts | `frontend-specialist` | pending | Zero erros de TypeScript |

---

#### E3 — Criar AlertOccurrenceModal
**Arquivo:** `components/admin/alerts/AlertOccurrenceModal.tsx` (NOVO)

Modal com 3 seções:
1. **Header**: Aluno, tipo, subcategoria, severidade, data
2. **Status**: Select com os 3 valores — chama `PUT /api/occurrences/[id]` ao mudar
3. **Devolutivas**: `<OccurrenceFeedbackTimeline occurrenceId={...} />`

Props:
```ts
interface AlertOccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: AlertNotification;
  onStatusChanged: (notificationId: string, newStatus: OccurrenceStatus) => void;
}
```

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| E3 | Criar AlertOccurrenceModal.tsx | `frontend-specialist` | pending | Modal funcional com status + devolutiva |

---

#### E4 — Modificar AlertNotifications.tsx
**Arquivo:** `components/admin/alerts/AlertNotifications.tsx`

1. Importar `OccurrenceStatusBadge` e `AlertOccurrenceModal`
2. Adicionar state `selectedNotification: AlertNotification | null`
3. Em cada item da lista adicionar:
   - `<OccurrenceStatusBadge status={notification.occurrence?.status ?? 'pending'} />`
   - Botão "Tratar" com ícone `ClipboardList`
4. Ao clicar "Tratar": abrir modal + marcar como lida se não estiver
5. Callback `onStatusChanged` atualiza estado local

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| E4 | Adicionar badge de status e botão Tratar na lista | `frontend-specialist` | pending | Lista com status visível |
| E4b | Integrar AlertOccurrenceModal no componente | `frontend-specialist` | pending | Modal abre/fecha e atualiza estado |

---

#### E5 — Card de Estatísticas "Pendentes"
Adicionar 4º card nas stats: `notifications.filter(n => n.occurrence?.status === 'pending').length`

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| E5 | Adicionar card "Pendentes" nas estatísticas | `frontend-specialist` | pending | 4 cards de stats |

---

### Phase V — Validação

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| V1 | `npm run build` sem erros TypeScript | `code-reviewer` | pending | Build limpo |
| V2 | Testar: abrir modal, mudar status, adicionar devolutiva | `code-reviewer` | pending | Fluxo funcional end-to-end |
| V3 | Verificar que notificação é marcada como lida ao abrir modal | `code-reviewer` | pending | Badge de não lida some ao tratar |
| V4 | Verificar responsividade do modal em mobile (375px) | `code-reviewer` | pending | Modal usável em tela pequena |

---

## Escopo (O que está FORA)
- Notificações em tempo real (WebSocket) — feature separada
- Filtro por status na lista de alertas — pode vir depois
- Excluir notificações — não está no escopo
- Professor acessar esta tela — apenas admin

## Riscos e Mitigações
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `OccurrenceFeedbackTimeline` pode não aceitar prop externa de occurrenceId | Média | Médio | Verificar interface antes; adaptar se necessário |
| RLS bloqueia admin de atualizar status de ocorrências de professores | Baixa | Alto | PUT /api/occurrences/[id] já usa serviceClient |
| JOIN pesado de feedbacks na listagem de notificações | Baixa | Baixo | Não incluir feedbacks no GET — carregar sob demanda no modal |

## Rollback (sem impacto em banco)
1. Reverter `app/api/alert-notifications/route.ts` para SELECT anterior
2. Reverter `AlertNotifications.tsx`
3. Deletar `AlertOccurrenceModal.tsx`
4. Nenhuma migration necessária
