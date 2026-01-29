---
status: completed
generated: 2026-01-25
agents:
  - type: "feature-developer"
    role: "Implementar sistema de regras de alerta"
  - type: "database-specialist"
    role: "Criar tabelas e triggers no Supabase"
  - type: "frontend-specialist"
    role: "Criar UI para gerenciamento de regras"
phases:
  - id: "phase-1"
    name: "Design e Banco de Dados"
    prevc: "P"
    status: pending
  - id: "phase-2"
    name: "Implementação Backend"
    prevc: "E"
    status: pending
  - id: "phase-3"
    name: "Implementação Frontend"
    prevc: "E"
    status: pending
  - id: "phase-4"
    name: "Validação"
    prevc: "V"
    status: pending
---

# Sistema de Alertas Configuráveis para Ocorrências

> Permitir que admins criem regras flexíveis para receber alertas quando padrões de ocorrências são detectados

## Task Snapshot

- **Primary goal:** Admin pode criar regras de monitoramento que disparam alertas automáticos
- **Success signal:** Ao cadastrar uma ocorrência que atinge o threshold de uma regra, admin recebe notificação
- **Arquivos principais:**
  - `app/admin/configuracoes/page.tsx` - Nova página de configurações do admin
  - `types/index.ts` - Novos tipos para regras e alertas
  - `app/api/alert-rules/` - APIs para CRUD de regras
  - `app/api/occurrences/route.ts` - Integrar verificação de regras

## Exemplos de Regras que o Admin Pode Criar

### Regra 1: Aluno específico reincidente
> "Me avise quando **João Silva** receber **3 ou mais** ocorrências de **Atraso** em **30 dias**"

### Regra 2: Qualquer aluno com ocorrências graves
> "Me avise quando **qualquer aluno** receber **2 ou mais** ocorrências de **severidade grave** em **7 dias**"

### Regra 3: Turma com muitas ocorrências
> "Me avise quando a turma **1º A** acumular **10 ou mais** ocorrências de **qualquer tipo** em **30 dias**"

### Regra 4: Tipo de ocorrência frequente
> "Me avise quando houver **5 ou mais** ocorrências de **Briga** em **toda a escola** em **7 dias**"

## Modelo de Dados

### Tabela `alert_rules`

```sql
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),

  -- Identificação
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Escopo: quem monitorar
  scope_type VARCHAR(20) NOT NULL, -- 'student', 'class', 'institution'
  scope_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  scope_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  -- Filtro: que tipo de ocorrência
  filter_type VARCHAR(20) NOT NULL, -- 'occurrence_type', 'severity', 'any'
  filter_occurrence_type_id UUID REFERENCES occurrence_types(id) ON DELETE CASCADE,
  filter_severity VARCHAR(10), -- 'leve', 'media', 'grave'

  -- Threshold: quanto dispara
  threshold_count INTEGER NOT NULL DEFAULT 3,
  threshold_period_days INTEGER NOT NULL DEFAULT 30,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own institution rules"
  ON alert_rules FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_institutions
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Tabela `alert_notifications`

```sql
CREATE TABLE alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,

  -- Contexto do alerta
  triggered_by_occurrence_id UUID REFERENCES occurrences(id) ON DELETE SET NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Dados snapshot (para histórico mesmo se regra for editada)
  rule_name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,

  -- Status de leitura
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own institution notifications"
  ON alert_notifications FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_institutions
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update own institution notifications"
  ON alert_notifications FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_institutions
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Tipos TypeScript

```typescript
// types/index.ts

export type AlertScopeType = 'student' | 'class' | 'institution';
export type AlertFilterType = 'occurrence_type' | 'severity' | 'any';

export interface AlertRule {
  id: string;
  institution_id: string;
  created_by: string;
  name: string;
  description?: string;

  // Escopo
  scope_type: AlertScopeType;
  scope_student_id?: string;
  scope_class_id?: string;

  // Filtro
  filter_type: AlertFilterType;
  filter_occurrence_type_id?: string;
  filter_severity?: 'leve' | 'media' | 'grave';

  // Threshold
  threshold_count: number;
  threshold_period_days: number;

  // Status
  is_active: boolean;
  last_triggered_at?: string;
  trigger_count: number;

  created_at: string;
  updated_at: string;

  // Joins opcionais
  student?: Student;
  class?: Class;
  occurrence_type?: OccurrenceType;
  created_by_user?: User;
}

export interface AlertNotification {
  id: string;
  alert_rule_id: string;
  institution_id: string;
  triggered_by_occurrence_id?: string;
  triggered_at: string;
  rule_name: string;
  message: string;
  occurrence_count: number;
  is_read: boolean;
  read_at?: string;
  read_by?: string;
  created_at: string;

  // Joins opcionais
  alert_rule?: AlertRule;
  occurrence?: Occurrence;
}
```

## Interface do Usuário

### Página: `/admin/configuracoes`

Nova página de configurações do admin com abas:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ Configurações da Instituição                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🔔 Alertas]  [📧 Notificações]  [🎨 Preferências]            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Regras de Alerta                    [+ Nova Regra]      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  📋 Atraso recorrente - João Silva                      │   │
│  │     3+ ocorrências de "Atraso" em 30 dias              │   │
│  │     ✅ Ativo | Disparou 2x | Última: 15/01/2026        │   │
│  │     [Editar] [Desativar]                               │   │
│  │                                                         │   │
│  │  📋 Brigas na escola                                    │   │
│  │     5+ ocorrências de "Briga" (qualquer aluno) em 7d   │   │
│  │     ✅ Ativo | Nunca disparou                          │   │
│  │     [Editar] [Desativar]                               │   │
│  │                                                         │   │
│  │  📋 Alunos com ocorrências graves                       │   │
│  │     2+ ocorrências graves (qualquer aluno) em 7 dias   │   │
│  │     ⏸️ Inativo                                         │   │
│  │     [Editar] [Ativar]                                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Modal: Criar/Editar Regra

```
┌─────────────────────────────────────────────────────────────────┐
│ Nova Regra de Alerta                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nome da Regra *                                               │
│  [Atraso recorrente - João Silva_________________]             │
│                                                                 │
│  Descrição (opcional)                                          │
│  [Monitorar atrasos frequentes do aluno________________]       │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  QUEM MONITORAR                                                │
│                                                                 │
│  Escopo: ( ) Aluno específico                                  │
│          ( ) Turma inteira                                     │
│          (•) Toda a instituição                                │
│                                                                 │
│  [Selecione o aluno... ▼] (aparece se "Aluno específico")     │
│  [Selecione a turma... ▼] (aparece se "Turma inteira")        │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  QUE TIPO DE OCORRÊNCIA                                        │
│                                                                 │
│  Filtro: ( ) Tipo específico                                   │
│          ( ) Severidade específica                             │
│          (•) Qualquer ocorrência                               │
│                                                                 │
│  [Selecione o tipo... ▼] (aparece se "Tipo específico")       │
│  [Selecione severidade ▼] (aparece se "Severidade")           │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  QUANDO ALERTAR                                                │
│                                                                 │
│  Me avise quando houver [3___] ou mais ocorrências            │
│  nos últimos [30__] dias                                       │
│                                                                 │
│                                  [Cancelar] [Salvar Regra]     │
└─────────────────────────────────────────────────────────────────┘
```

### Indicador de Notificações no Sidebar

```
┌──────────────────────┐
│ 📊 Dashboard         │
│ 👥 Turmas            │
│ 👨‍🎓 Alunos            │
│ ⚠️ Ocorrências       │
│ 📋 Tipos             │
│ 📅 Períodos          │
│ 👨‍🏫 Professores       │
│ 📈 Analytics         │
│ ─────────────────    │
│ 🔔 Alertas (3)  ← Badge vermelho com contagem
│ ⚙️ Configurações     │
└──────────────────────┘
```

### Painel de Alertas: `/admin/alertas`

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Central de Alertas                     [Marcar todos lidos] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ● 15/01 10:30 - Atraso recorrente - João Silva               │
│    João Silva atingiu 3 ocorrências de "Atraso" nos últimos   │
│    30 dias. [Ver aluno] [Ver regra] [Dispensar]               │
│                                                                 │
│  ● 14/01 14:15 - Brigas na escola                              │
│    5 ocorrências de "Briga" registradas nos últimos 7 dias.   │
│    [Ver ocorrências] [Ver regra] [Dispensar]                  │
│                                                                 │
│  ○ 10/01 09:00 - Ocorrências graves                            │
│    2 ocorrências de severidade grave nos últimos 7 dias.      │
│    [Ver ocorrências] [Ver regra]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Lógica de Avaliação de Regras

### Função: `evaluateAlertRules()`

Chamada após cada nova ocorrência ser registrada:

```typescript
// lib/alerts/evaluateRules.ts

interface EvaluationContext {
  occurrence: Occurrence;
  institutionId: string;
}

export async function evaluateAlertRules(ctx: EvaluationContext): Promise<void> {
  const supabase = createServiceClient();

  // 1. Buscar regras ativas da instituição
  const { data: rules } = await supabase
    .from('alert_rules')
    .select('*, occurrence_type:occurrence_types(*)')
    .eq('institution_id', ctx.institutionId)
    .eq('is_active', true);

  if (!rules?.length) return;

  // 2. Para cada regra, verificar se a ocorrência se enquadra
  for (const rule of rules) {
    if (!matchesRule(rule, ctx.occurrence)) continue;

    // 3. Contar ocorrências no período
    const count = await countOccurrencesForRule(rule, ctx.institutionId);

    // 4. Se atingiu threshold, criar notificação
    if (count >= rule.threshold_count) {
      await createAlertNotification(rule, ctx.occurrence, count);
    }
  }
}

function matchesRule(rule: AlertRule, occurrence: Occurrence): boolean {
  // Verificar escopo
  if (rule.scope_type === 'student' && rule.scope_student_id !== occurrence.student_id) {
    return false;
  }
  if (rule.scope_type === 'class') {
    // Buscar class_id do aluno e comparar
  }

  // Verificar filtro
  if (rule.filter_type === 'occurrence_type' &&
      rule.filter_occurrence_type_id !== occurrence.occurrence_type_id) {
    return false;
  }
  if (rule.filter_type === 'severity') {
    // Buscar severidade do tipo de ocorrência e comparar
  }

  return true;
}

async function countOccurrencesForRule(
  rule: AlertRule,
  institutionId: string
): Promise<number> {
  const supabase = createServiceClient();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - rule.threshold_period_days);

  let query = supabase
    .from('occurrences')
    .select('id', { count: 'exact' })
    .eq('institution_id', institutionId)
    .gte('occurrence_date', periodStart.toISOString());

  // Aplicar filtros de escopo
  if (rule.scope_type === 'student') {
    query = query.eq('student_id', rule.scope_student_id);
  }
  if (rule.scope_type === 'class') {
    // JOIN com students para filtrar por class_id
  }

  // Aplicar filtros de tipo
  if (rule.filter_type === 'occurrence_type') {
    query = query.eq('occurrence_type_id', rule.filter_occurrence_type_id);
  }
  if (rule.filter_type === 'severity') {
    // JOIN com occurrence_types para filtrar por severity
  }

  const { count } = await query;
  return count || 0;
}
```

## Working Phases

### Phase 1 — Design e Banco de Dados
**Tarefas:**
1. Criar migration para tabela `alert_rules`
2. Criar migration para tabela `alert_notifications`
3. Adicionar políticas RLS
4. Adicionar tipos TypeScript em `types/index.ts`

### Phase 2 — Implementação Backend
**Tarefas:**
1. API `POST /api/alert-rules` - Criar regra
2. API `GET /api/alert-rules` - Listar regras
3. API `PUT /api/alert-rules/[id]` - Editar regra
4. API `DELETE /api/alert-rules/[id]` - Excluir regra
5. API `GET /api/alert-notifications` - Listar notificações
6. API `PUT /api/alert-notifications/[id]/read` - Marcar como lida
7. Função `evaluateAlertRules()` em `lib/alerts/`
8. Integrar avaliação no `POST /api/occurrences`

### Phase 3 — Implementação Frontend
**Tarefas:**
1. Criar página `/admin/configuracoes/page.tsx`
2. Componente `AlertRulesList` - Lista de regras
3. Componente `AlertRuleModal` - Criar/editar regra
4. Criar página `/admin/alertas/page.tsx`
5. Componente `AlertNotificationsList` - Lista de notificações
6. Adicionar badge de notificações no Sidebar
7. Adicionar link "Alertas" e "Configurações" no menu admin

### Phase 4 — Validação
**Testes:**
1. Criar regra para aluno específico
2. Criar regra para severidade
3. Criar regra para toda a instituição
4. Registrar ocorrências até atingir threshold
5. Verificar notificação aparece
6. Marcar como lida
7. Editar/desativar regra

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Notificação in-app | Sim | MVP simples, sem dependência de email |
| Email opcional | Futuro | Pode adicionar depois |
| Avaliação síncrona | Sim | Evita complexidade de jobs assíncronos |
| Cooldown de alertas | Não (MVP) | Pode causar spam, adicionar depois |
| Histórico de notificações | Sim | Útil para auditoria |

## Evidence & Follow-up

- [x] Migration `alert_rules` aplicada
- [x] Migration `alert_notifications` aplicada
- [x] Tipos TypeScript adicionados
- [x] APIs de regras funcionando
- [x] APIs de notificações funcionando
- [x] Página de configurações criada
- [x] Página de alertas criada
- [x] Badge no sidebar funcionando
- [x] Integração com registro de ocorrências
- [ ] Testes manuais passando
- [x] Build passando
