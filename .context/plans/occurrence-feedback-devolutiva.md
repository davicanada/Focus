---
status: approved
generated: 2026-02-04
---

# Sistema de Devolutivas - Feedback de Ocorrências

> Permitir que admin/viewer registrem ações tomadas (devolutivas) nas ocorrências e que professores acompanhem o status e as providências.

## Objetivo

Quando um professor registra uma ocorrência, ele precisa saber se algo está sendo feito a respeito. Este sistema cria:

1. **Resumo na Visão Geral do Professor** - Cards mostrando status das suas ocorrências
2. **Status visível** em cada ocorrência no histórico do professor
3. **Botão "Ver Detalhes"** que abre timeline completa das ações tomadas
4. **Interface simples** para admin/viewer registrarem devolutivas
5. **Relatório de Devolutiva** para análise geral (comparar ocorrências vs devolutivas)

---

## Modelo de Dados

### Nova Tabela: `occurrence_feedbacks` (Devolutivas)

```sql
CREATE TABLE occurrence_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  description TEXT,
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_occurrence_feedbacks_occurrence ON occurrence_feedbacks(occurrence_id);
CREATE INDEX idx_occurrence_feedbacks_performed_at ON occurrence_feedbacks(performed_at);
```

### Alteração: Tabela `occurrences`

```sql
ALTER TABLE occurrences
ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'in_progress', 'resolved'));

CREATE INDEX idx_occurrences_status ON occurrences(status);
```

### Tipos de Ação (Devolutiva)

| action_type | Label PT-BR |
|-------------|-------------|
| `student_talk` | Conversa com aluno |
| `guardian_contact` | Contato com responsável |
| `verbal_warning` | Advertência verbal |
| `written_warning` | Advertência escrita |
| `coordination_referral` | Encaminhamento à coordenação |
| `direction_referral` | Encaminhamento à direção |
| `psychologist_referral` | Encaminhamento ao psicólogo |
| `suspension` | Suspensão |
| `mediation` | Mediação de conflito |
| `observation` | Observação/Acompanhamento |
| `resolved` | Caso resolvido |
| `other` | Outra ação |

### Status da Ocorrência

| status | Label PT-BR | Cor |
|--------|-------------|-----|
| `pending` | Pendente | Amarelo |
| `in_progress` | Em andamento | Azul |
| `resolved` | Resolvida | Verde |

---

## Fluxo por Perfil

### Professor - Visão Geral (Dashboard)

**Página: `/professor` (home)**

Adicionar nova seção **"Minhas Devolutivas"** com cards de resumo:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Minhas Devolutivas                                         │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Ocorrências │ │ 🟡 Pendentes│ │ 🔵 Andamento│ │🟢Resolvidas│ │
│  │  Registradas│ │             │ │             │ │           │ │
│  │     47      │ │      8      │ │      12     │ │    27     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                 │
│  📋 Últimas Atualizações                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ João Silva (7A) - Briga → Resolvida (há 2h)          │   │
│  │ 🔵 Ana Costa (6B) - Atraso → Em andamento (há 5h)       │   │
│  │ 💬 Pedro Lima (8A) - Nova devolutiva (ontem)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [Ver todas as ocorrências →]      │
└─────────────────────────────────────────────────────────────────┘
```

**O que o professor vê:**
- Total de ocorrências que ele registrou
- Quantas estão pendentes (aguardando ação da gestão)
- Quantas estão em andamento
- Quantas foram resolvidas
- Lista das últimas atualizações/devolutivas recebidas

**Benefício:** Professor entra no sistema e já tem feedback imediato!

---

### Professor - Histórico de Ocorrências

**Página: `/professor/ocorrencias`**

1. Tabela ganha nova coluna **"Status"** com badge colorido
2. Novo botão **"Ver Detalhes"** em cada linha
3. Ao clicar, abre **modal** com timeline de devolutivas

**Mockup da Timeline:**
```
┌─────────────────────────────────────────────────────────┐
│  📋 Detalhes da Ocorrência                         [X] │
├─────────────────────────────────────────────────────────┤
│  Aluno: João Silva                                      │
│  Turma: 7º Ano A - Matutino                            │
│  Tipo: Briga (Grave)                                   │
│  Data: 03/02/2026 às 14:30                             │
│  Descrição: Aluno se envolveu em briga no intervalo... │
│                                                         │
│  Status: 🟢 Resolvida                                  │
├─────────────────────────────────────────────────────────┤
│  📜 DEVOLUTIVAS                                        │
│                                                         │
│  ● 03/02 15:00 - Maria Silva (Coordenadora)            │
│    💬 Conversa com aluno                               │
│    "Conversei com João sobre o ocorrido"               │
│                                                         │
│  ● 04/02 09:00 - Maria Silva (Coordenadora)            │
│    📞 Contato com responsável                          │
│    "Liguei para a mãe, agendamos reunião"              │
│                                                         │
│  ● 05/02 11:00 - Carlos Santos (Diretor)               │
│    ✅ Caso resolvido                                   │
│    "Reunião realizada, aluno se desculpou"             │
└─────────────────────────────────────────────────────────┘
```

---

### Admin/Viewer - Gerenciamento

**Nova Página: `/admin/ocorrencias`** (e `/viewer/ocorrencias`)

#### 1. Resumo no Topo (Cards)
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   📊 Total   │ │ 🟡 Pendentes │ │ 🔵 Andamento │ │ 🟢 Resolvidas│
│     152      │ │      23      │ │      18      │ │     111      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### 2. Filtros Simples
- Status (Todos, Pendentes, Em andamento, Resolvidas)
- Turma
- Tipo de ocorrência
- Professor (quem registrou)

#### 3. Lista de Ocorrências
| Data | Aluno | Turma | Tipo | Severidade | Professor | Status | Ações |
|------|-------|-------|------|------------|-----------|--------|-------|
| 03/02 | João Silva | 7A | Briga | Grave | Prof. Carlos | 🟢 | [+Devolutiva] [Histórico] |

#### Modal "Adicionar Devolutiva"
```
┌─────────────────────────────────────────────────────────┐
│  ➕ Registrar Devolutiva                           [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Ocorrência: Briga - João Silva (7A) - 03/02/2026      │
│  Registrada por: Prof. Carlos Oliveira                 │
│                                                         │
│  Tipo de Ação: *                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Selecione...                               ▼    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Descrição:                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Descreva o que foi feito...                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ☐ Marcar ocorrência como "Resolvida"                  │
│                                                         │
│              [Cancelar]  [Salvar Devolutiva]           │
└─────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Ao salvar com "Marcar como Resolvida" → status = `resolved`
- Ao salvar sem marcar e status era `pending` → status = `in_progress`

---

## Relatório de Devolutiva

**Nova Página: `/admin/relatorios/devolutiva`**

### Objetivo
Comparar ocorrências vs devolutivas para garantir que nenhuma fique sem resposta.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Relatório de Devolutiva - 2026                                     │
│                                                                         │
│  Ano: [2026 ▼]                              [📥 Excel] [📄 PDF]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐ │
│  │ Ocorrências │ │    Com      │ │    Sem      │ │       Taxa        │ │
│  │   Total     │ │ Devolutiva  │ │ Devolutiva  │ │     Resposta      │ │
│  │    152      │ │    129      │ │     23      │ │      84.9%        │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  📋 Detalhamento                                                       │
│                                                                         │
│  ┌────────┬──────────┬────────┬────────┬────────┬──────────────┬─────┐ │
│  │ Data   │ Aluno    │ Turma  │ Tipo   │ Status │  Professor   │Devol│ │
│  ├────────┼──────────┼────────┼────────┼────────┼──────────────┼─────┤ │
│  │03/02/26│João Silva│ 7A     │ Briga  │Resolvid│Prof. Carlos  │  3  │ │
│  │03/02/26│Ana Costa │ 6B     │ Atraso │Resolvid│Prof. Maria   │  1  │ │
│  │02/02/26│Pedro Lima│ 8A     │Desresp.│Pendente│Prof. João    │  0  │ │
│  └────────┴──────────┴────────┴────────┴────────┴──────────────┴─────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Colunas do Relatório

| Coluna | Descrição |
|--------|-----------|
| Data | Data da ocorrência |
| Aluno | Nome do aluno |
| Turma | Turma do aluno |
| Tipo | Tipo da ocorrência |
| Severidade | Leve/Média/Grave |
| Status | Pendente/Em andamento/Resolvida |
| **Professor** | **Quem registrou a ocorrência** |
| Qtd. Devolutivas | Número de devolutivas |
| Última Devolutiva | Data da mais recente |

### Exportação

**Excel (2 sheets):**
- Sheet 1 "Ocorrências": Tabela principal com todas as colunas
- Sheet 2 "Devolutivas": Detalhes de cada devolutiva

**PDF:**
- Cards de resumo + tabela paginada
- Coluna Professor em destaque

---

## Estrutura de Arquivos

```
app/
├── admin/
│   ├── ocorrencias/
│   │   └── page.tsx              # Gerenciamento de devolutivas
│   └── relatorios/
│       └── devolutiva/
│           └── page.tsx          # Relatório de Devolutiva
├── viewer/
│   └── ocorrencias/
│       └── page.tsx              # Mesma funcionalidade do admin
├── professor/
│   ├── page.tsx                  # Adicionar seção "Minhas Devolutivas"
│   └── ocorrencias/
│       └── page.tsx              # Coluna status + modal detalhes
└── api/
    ├── occurrences/
    │   └── [id]/
    │       └── feedbacks/
    │           └── route.ts      # GET/POST devolutivas
    ├── professor/
    │   └── feedback-summary/
    │       └── route.ts          # GET resumo para dashboard professor
    └── reports/
        └── devolutiva/
            └── route.ts          # GET dados do relatório

components/
└── occurrences/
    ├── OccurrenceStatusBadge.tsx
    ├── OccurrenceFeedbackTimeline.tsx
    ├── AddFeedbackModal.tsx
    └── OccurrenceDetailModal.tsx
```

---

## APIs

### GET /api/professor/feedback-summary
Resumo para o dashboard do professor.

```typescript
// Response
{
  total_occurrences: 47,
  pending: 8,
  in_progress: 12,
  resolved: 27,
  recent_updates: [
    {
      occurrence_id: "uuid",
      student_name: "João Silva",
      class_name: "7A",
      occurrence_type: "Briga",
      status: "resolved",
      last_feedback_at: "2026-02-03T15:00:00Z",
      last_feedback_type: "resolved"
    }
  ]
}
```

### GET /api/occurrences/[id]/feedbacks
```typescript
// Response
{
  feedbacks: [
    {
      id: "uuid",
      action_type: "student_talk",
      action_label: "Conversa com aluno",
      description: "Conversei com o aluno...",
      performed_by: { id: "uuid", name: "Maria Silva", role: "admin" },
      performed_at: "2026-02-03T15:00:00Z"
    }
  ]
}
```

### POST /api/occurrences/[id]/feedbacks
```typescript
// Request
{
  action_type: "student_talk",
  description: "Conversei com o aluno...",
  mark_resolved?: boolean
}
```

### GET /api/reports/devolutiva?year=2026
```typescript
// Response
{
  summary: {
    total_occurrences: 152,
    with_feedback: 129,
    without_feedback: 23,
    response_rate: 84.9,
    by_status: { pending: 23, in_progress: 18, resolved: 111 }
  },
  occurrences: [
    {
      id: "uuid",
      occurrence_date: "2026-02-03",
      student_name: "João Silva",
      class_name: "7º Ano A",
      occurrence_type: "Briga",
      severity: "grave",
      status: "resolved",
      registered_by_name: "Prof. Carlos Oliveira",
      feedback_count: 3,
      last_feedback_at: "2026-02-05T11:00:00Z"
    }
  ]
}
```

---

## Fases de Implementação

### Fase 1: Backend
- [ ] Migration SQL (tabela + coluna status)
- [ ] Tipos TypeScript
- [ ] API GET/POST /api/occurrences/[id]/feedbacks
- [ ] API GET /api/professor/feedback-summary
- [ ] API GET /api/reports/devolutiva
- [ ] RLS policies

### Fase 2: Dashboard Professor
- [ ] Seção "Minhas Devolutivas" com cards
- [ ] Lista "Últimas Atualizações"
- [ ] Link "Ver todas as ocorrências"

### Fase 3: Histórico Professor
- [ ] Coluna "Status" na tabela
- [ ] Modal OccurrenceDetailModal com timeline
- [ ] Componente OccurrenceFeedbackTimeline

### Fase 4: UI Admin/Viewer
- [ ] Página /admin/ocorrencias
- [ ] Cards de resumo + filtros
- [ ] Modal AddFeedbackModal
- [ ] Duplicar para /viewer/ocorrencias

### Fase 5: Relatório de Devolutiva
- [ ] Página /admin/relatorios/devolutiva
- [ ] Tabela com paginação
- [ ] Exportação Excel (2 sheets)
- [ ] Exportação PDF
- [ ] Link no menu Relatórios

### Fase 6: Sidebar
- [ ] Link "Ocorrências" no menu admin/viewer
- [ ] Link "Devolutiva" no submenu Relatórios

---

## Métricas do Relatório

O Relatório de Devolutiva responde:

1. **Quantas ocorrências tivemos?** → Total
2. **Quantas receberam devolutiva?** → Com Devolutiva
3. **Quantas estão sem resposta?** → Sem Devolutiva
4. **Taxa de resposta?** → (Com Devolutiva / Total) × 100
5. **Qual professor registrou cada uma?** → Coluna Professor
6. **Quais precisam de atenção?** → Status = Pendente

---

## Próximos Passos

Após aprovação:
1. Executar migration no Supabase
2. Implementar APIs
3. Criar componentes de UI
4. Implementar relatório com exportação
5. Testar fluxos completos
6. Deploy
