# Análise Completa de Governança de Dados - Sistema Focus

> Gerado em: 25/01/2026
> Objetivo: Garantir integridade referencial e prevenir perda de dados

---

## 1. RESUMO EXECUTIVO

### Estado Atual da Governança
| Métrica | Status |
|---------|--------|
| Entidades com Soft Delete | 5 de 12 (42%) |
| Operações de Hard Delete | 14 locais identificados |
| Pontos de Risco Crítico | 3 |
| Pontos de Risco Médio | 4 |
| Pontos Seguros | 8 |

### Classificação de Risco Geral: **MÉDIO-ALTO**

---

## 2. MAPA DE RELACIONAMENTOS DO BANCO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INSTITUTIONS (raiz)                                │
│                     Multi-tenant isolation point                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ├──── CASCADE ────► user_institutions ──── users
         │                         │
         │                         └── deleted_at, is_active (SOFT DELETE)
         │
         ├──── CASCADE ────► classes
         │                      │
         │                      ├── deleted_at, is_active (SOFT DELETE)
         │                      │
         │                      └──── CASCADE ────► students
         │                                             │
         │                                             ├── deleted_at, is_active (SOFT DELETE)
         │                                             │
         │                                             └──── CASCADE ────► occurrences
         │                                                                   │
         │                                                                   └── SEM SOFT DELETE ⚠️
         │
         ├──── CASCADE ────► occurrence_types
         │                      │
         │                      ├── deleted_at, is_active (SOFT DELETE)
         │                      │
         │                      └──── CASCADE ────► occurrences
         │
         ├──── CASCADE ────► quarters (períodos acadêmicos)
         │                      │
         │                      └── SEM SOFT DELETE ⚠️
         │
         ├──── CASCADE ────► school_years (anos letivos)
         │                      │
         │                      └── SEM SOFT DELETE (mas valida antes de deletar ✓)
         │
         ├──── CASCADE ────► alert_rules
         │                      │
         │                      ├── is_active (parcial)
         │                      │
         │                      └──── CASCADE ────► alert_notifications
         │
         ├──── SET NULL ───► access_requests (preserva histórico ✓)
         │
         └──── SET NULL ───► system_logs (preserva histórico ✓)
```

---

## 3. ANÁLISE DETALHADA DE CADA OPERAÇÃO DE DELETE

### 3.1 HARD DELETES IDENTIFICADOS

| # | Arquivo | Linha | Tabela | Validação | Risco |
|---|---------|-------|--------|-----------|-------|
| 1 | `app/master/page.tsx` | 349 | institutions | Confirma nome | **CRÍTICO** |
| 2 | `app/admin/turmas/page.tsx` | 256 | classes | confirm() simples | **CRÍTICO** |
| 3 | `app/admin/trimestres/page.tsx` | 269 | quarters | confirm() simples | **MÉDIO** |
| 4 | `app/admin/trimestres/page.tsx` | 388 | quarters | Parte do save | BAIXO |
| 5 | `app/admin/trimestres/page.tsx` | 433 | quarters | confirm() simples | **MÉDIO** |
| 6 | `app/api/alert-rules/[id]/route.ts` | 202 | alert_rules | Verifica dono | BAIXO |
| 7 | `app/api/school-years/[id]/route.ts` | 208 | school_years | **Valida turmas** | ✓ SEGURO |
| 8-14 | `app/api/setup/clean/route.ts` | vários | todas | Requer "LIMPAR_TUDO" | ✓ SEGURO |

### 3.2 SOFT DELETES IMPLEMENTADOS

| # | Arquivo | Tabela | Campos | Status |
|---|---------|--------|--------|--------|
| 1 | `app/api/users/[id]/deactivate/route.ts` | users | is_active, deleted_at, reason | ✓ COMPLETO |
| 2 | `app/api/students/[id]/deactivate/route.ts` | students | is_active, deleted_at, notes | ✓ COMPLETO |
| 3 | `app/api/classes/[id]/deactivate/route.ts` | classes | is_active, deleted_at | ✓ COMPLETO |
| 4 | `app/admin/tipos-ocorrencias/page.tsx` | occurrence_types | is_active | ✓ PARCIAL |
| 5 | `app/admin/turmas/page.tsx` | classes (soft) | is_active, deleted_at | ✓ COMPLETO |

---

## 4. CENÁRIOS DE RISCO DETALHADOS

### 🔴 CENÁRIO 1: Deletar Instituição (CRÍTICO)

**Caminho:** Painel Master → Instituições → Botão Excluir → Digitar nome → Confirmar

**Código atual:**
```typescript
// app/master/page.tsx:347-350
const { error } = await supabase
  .from('institutions')
  .delete()
  .eq('id', institutionToDelete.id);
```

**O que acontece (CASCADE em cadeia):**
```
DELETE institutions WHERE id = 'xxx'
    │
    ├── user_institutions: DELETADOS (usuários ficam sem vínculo)
    ├── classes: DELETADAS
    │      └── students: DELETADOS
    │             └── occurrences: DELETADAS (HISTÓRICO PERDIDO!)
    │             └── student_enrollments: DELETADAS
    ├── occurrence_types: DELETADOS
    │      └── occurrences: DELETADAS (mesmo as de outras turmas)
    ├── quarters: DELETADOS
    ├── school_years: DELETADOS
    ├── alert_rules: DELETADOS
    │      └── alert_notifications: DELETADAS
    ├── access_requests: institution_id = NULL (preservado)
    └── system_logs: institution_id = NULL (preservado)
```

**Proteções atuais:**
- [x] Modal de confirmação
- [x] Digitação do nome da instituição
- [x] Lista de tipos de dados afetados
- [ ] Contagem real de registros
- [ ] Backup antes de deletar
- [ ] Período de recuperação

**RISCO:** Todo o histórico de ocorrências da escola é perdido permanentemente.

---

### 🔴 CENÁRIO 2: Deletar Turma Permanentemente (CRÍTICO)

**Caminho:** Admin → Turmas → Lixeira → Excluir Permanentemente

**Código atual:**
```typescript
// app/admin/turmas/page.tsx:249-266
const handlePermanentDelete = async (classItem: Class) => {
  if (!confirm(`Excluir "${classItem.name}" permanentemente?`)) return;

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classItem.id);
};
```

**O que acontece:**
```
DELETE classes WHERE id = 'turma-xxx'
    │
    ├── students: TODOS DELETADOS (mesmo que tenham ocorrências)
    │      └── occurrences: TODAS DELETADAS
    │      └── student_enrollments: DELETADAS
    └── (tipos de ocorrência não são afetados)
```

**Proteções atuais:**
- [x] confirm() nativo do browser
- [x] Turma já estava na lixeira (2 passos)
- [ ] Verificação de alunos vinculados
- [ ] Verificação de ocorrências
- [ ] Contagem de registros

**RISCO:** Perda de dados de todos os alunos e suas ocorrências sem validação.

---

### 🟡 CENÁRIO 3: Deletar Tipo de Ocorrência (MÉDIO - MITIGADO)

**Caminho:** Admin → Tipos de Ocorrências → Desativar

**Código atual (CORRETO):**
```typescript
// app/admin/tipos-ocorrencias/page.tsx
const { error } = await supabase
  .from('occurrence_types')
  .update({ is_active: false })  // Soft delete!
  .eq('id', type.id);
```

**Status:** ✅ SEGURO - Usa soft delete via `is_active = false`

**Porém, se fosse hard delete:**
```
DELETE occurrence_types WHERE id = 'tipo-xxx'
    └── occurrences: TODAS desse tipo seriam DELETADAS
```

---

### 🟡 CENÁRIO 4: Deletar Períodos Acadêmicos (MÉDIO)

**Caminho:** Admin → Períodos → Limpar Todos

**Código atual:**
```typescript
// app/admin/trimestres/page.tsx:269
const { error } = await supabase
  .from('quarters')
  .delete()
  .eq('institution_id', currentInstitution.id);
```

**Impacto:**
- Perde configuração de bimestres/trimestres/semestres
- Relatórios por período param de funcionar
- NÃO afeta ocorrências (não há FK direta)

**Status:** 🟡 MÉDIO - Não causa perda de dados, apenas configuração.

---

### 🟢 CENÁRIO 5: Desligar Aluno (SEGURO)

**Caminho:** Admin → Alunos → Desligar

**Código atual (CORRETO):**
```typescript
// app/api/students/[id]/deactivate/route.ts
const { error } = await serviceClient
  .from('students')
  .update({
    is_active: false,
    deleted_at: new Date().toISOString(),
    notes: reason || 'Desligado pelo administrador',
  })
  .eq('id', studentId);

// Também atualiza enrollment
await serviceClient
  .from('student_enrollments')
  .update({ status: 'dropped', end_date: now })
  .eq('student_id', studentId)
  .eq('status', 'active');
```

**Status:** ✅ SEGURO
- Soft delete preserva histórico
- Ocorrências permanecem intactas
- Aluno pode ser reativado

---

### 🟢 CENÁRIO 6: Desligar Professor (SEGURO)

**Caminho:** API /api/users/[id]/deactivate

**Status:** ✅ SEGURO
- Soft delete preserva usuário
- Ocorrências registradas mantêm referência
- Professor pode ser reativado

---

### 🟢 CENÁRIO 7: Deletar Ano Letivo (SEGURO)

**Caminho:** Admin → Anos Letivos → Excluir

**Código atual (CORRETO):**
```typescript
// app/api/school-years/[id]/route.ts:180-195
// Verificar se há turmas vinculadas ANTES de deletar
const { count: classesCount } = await serviceClient
  .from('classes')
  .select('id', { count: 'exact', head: true })
  .eq('school_year_id', id);

if (classesCount && classesCount > 0) {
  return NextResponse.json(
    { error: `Não é possível excluir: ${classesCount} turmas vinculadas` },
    { status: 400 }
  );
}
```

**Status:** ✅ SEGURO - Valida dependências antes de permitir exclusão.

---

## 5. TABELA DE SOFT DELETE vs HARD DELETE

| Entidade | Soft Delete | Campos | Pode Recuperar |
|----------|-------------|--------|----------------|
| users | ✅ SIM | is_active, deleted_at, deactivation_reason | ✅ SIM |
| user_institutions | ✅ SIM | is_active, deleted_at | ✅ SIM |
| institutions | ❌ NÃO | - | ❌ NÃO |
| classes | ✅ SIM | is_active, deleted_at | ✅ SIM |
| students | ✅ SIM | is_active, deleted_at, notes | ✅ SIM |
| occurrence_types | ✅ SIM | is_active, deleted_at | ✅ SIM |
| **occurrences** | ❌ NÃO | - | ❌ NÃO |
| quarters | ❌ NÃO | - | ❌ NÃO |
| school_years | ❌ NÃO | - | ❌ NÃO |
| alert_rules | ⚠️ PARCIAL | is_active (sem deleted_at) | ⚠️ PARCIAL |
| alert_notifications | ❌ NÃO | - | ❌ NÃO |
| access_requests | ❌ NÃO | - | ❌ NÃO |
| system_logs | ❌ NÃO | - | ❌ NÃO |

---

## 6. PROBLEMAS DE CONSISTÊNCIA IDENTIFICADOS

### 6.1 Alert Rules com Entidades Inativas

**Problema:** Quando um aluno/turma é desligado (soft delete), as regras de alerta que os referenciam continuam ativas.

**Exemplo:**
```sql
-- Regra configurada: "Alertar se aluno João tiver 3 ocorrências"
-- Aluno João é desligado (is_active = false)
-- Regra continua ativa → nunca mais dispara → confuso para o admin
```

**Impacto:** Regras "fantasma" que nunca disparam.

### 6.2 Ocorrências Antigas sem class_id_at_occurrence

**Problema:** Ocorrências criadas antes da migration podem não ter a turma histórica preenchida.

**Impacto:** Analytics podem mostrar dados incorretos.

### 6.3 Turmas sem school_year_id

**Problema:** Turmas antigas podem não estar vinculadas a um ano letivo.

**Impacto:** Relatórios de anos letivos incompletos.

---

## 7. PLANO DE CORREÇÕES

### PRIORIDADE 1 - CRÍTICA (Implementar Imediatamente)

#### 1.1 Adicionar Soft Delete em Ocorrências

**Arquivo:** Nova migration SQL

```sql
-- Migration: add_soft_delete_to_occurrences.sql
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Índice para queries de ocorrências ativas
CREATE INDEX IF NOT EXISTS idx_occurrences_active
ON occurrences (institution_id, deleted_at)
WHERE deleted_at IS NULL;
```

**Arquivos a modificar:**
- `types/index.ts` - Adicionar campos ao tipo Occurrence
- Todas as queries que leem ocorrências - Adicionar `AND deleted_at IS NULL`

---

#### 1.2 Bloquear DELETE Permanente de Turmas com Dados

**Arquivo:** `app/admin/turmas/page.tsx`

```typescript
const handlePermanentDelete = async (classItem: Class) => {
  // NOVO: Verificar dependências antes de deletar
  const supabase = createClient();

  // Contar alunos na turma
  const { count: studentsCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classItem.id);

  // Contar ocorrências históricas da turma
  const { count: occurrencesCount } = await supabase
    .from('occurrences')
    .select('id', { count: 'exact', head: true })
    .eq('class_id_at_occurrence', classItem.id);

  if ((studentsCount || 0) > 0 || (occurrencesCount || 0) > 0) {
    toast.error(
      `Não é possível excluir permanentemente: ` +
      `${studentsCount || 0} alunos e ${occurrencesCount || 0} ocorrências vinculadas. ` +
      `Mova os alunos para outra turma primeiro.`
    );
    return;
  }

  if (!confirm(`Excluir "${classItem.name}" permanentemente?`)) return;

  // ... resto do código
};
```

---

#### 1.3 Preview de Dados na Exclusão de Instituição

**Arquivo:** `app/master/page.tsx`

```typescript
// Adicionar estado para contagens
const [deletePreview, setDeletePreview] = useState<{
  students: number;
  occurrences: number;
  classes: number;
  teachers: number;
} | null>(null);

// Função para carregar preview
const loadDeletePreview = async (institutionId: string) => {
  const supabase = createClient();

  const [students, occurrences, classes, teachers] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId),
    supabase.from('occurrences').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId),
    supabase.from('user_institutions').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('role', 'professor'),
  ]);

  setDeletePreview({
    students: students.count || 0,
    occurrences: occurrences.count || 0,
    classes: classes.count || 0,
    teachers: teachers.count || 0,
  });
};

// Chamar ao abrir modal de exclusão
const handleOpenDeleteModal = (institution: Institution) => {
  setInstitutionToDelete(institution);
  loadDeletePreview(institution.id);
  setShowDeleteModal(true);
};
```

---

### PRIORIDADE 2 - ALTA (Implementar Esta Semana)

#### 2.1 Desativar Alert Rules ao Desativar Entidades

**Arquivo:** `app/api/students/[id]/deactivate/route.ts`

Adicionar após soft delete do aluno:
```typescript
// Desativar regras de alerta que referenciam este aluno
await serviceClient
  .from('alert_rules')
  .update({ is_active: false })
  .eq('scope_student_id', studentId);
```

**Arquivo:** `app/api/classes/[id]/deactivate/route.ts`

Adicionar:
```typescript
// Desativar regras de alerta que referenciam esta turma
await serviceClient
  .from('alert_rules')
  .update({ is_active: false })
  .eq('scope_class_id', classId);
```

---

#### 2.2 Preencher Dados Faltantes

**Migration SQL:**
```sql
-- Preencher class_id_at_occurrence em ocorrências antigas
UPDATE occurrences o
SET class_id_at_occurrence = (
  SELECT class_id FROM students WHERE id = o.student_id
)
WHERE o.class_id_at_occurrence IS NULL;

-- Criar anos letivos para turmas órfãs
INSERT INTO school_years (id, institution_id, year, name, is_current)
SELECT
  gen_random_uuid(),
  institution_id,
  year,
  CONCAT('Ano Letivo ', year),
  (year = EXTRACT(YEAR FROM NOW()))
FROM classes
WHERE school_year_id IS NULL
GROUP BY institution_id, year
ON CONFLICT DO NOTHING;

-- Vincular turmas órfãs aos anos letivos
UPDATE classes c
SET school_year_id = (
  SELECT id FROM school_years sy
  WHERE sy.institution_id = c.institution_id
  AND sy.year = c.year
)
WHERE c.school_year_id IS NULL;
```

---

### PRIORIDADE 3 - MÉDIA (Implementar Este Mês)

#### 3.1 Adicionar Soft Delete Completo em Alert Rules

```sql
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

#### 3.2 Criar Job de Verificação de Integridade

**Arquivo:** `app/api/maintenance/integrity-check/route.ts`

```typescript
export async function GET() {
  const supabase = createServiceClient();

  const checks = await Promise.all([
    // V1: Usuários órfãos
    supabase.rpc('count_orphan_users'),
    // V2: Alunos em turmas inativas
    supabase.rpc('count_students_in_inactive_classes'),
    // V3: Ocorrências sem turma histórica
    supabase.rpc('count_occurrences_without_historical_class'),
    // V4: Alert rules com entidades inválidas
    supabase.rpc('count_invalid_alert_rules'),
  ]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    checks: {
      orphanUsers: checks[0].data || 0,
      studentsInInactiveClasses: checks[1].data || 0,
      occurrencesWithoutClass: checks[2].data || 0,
      invalidAlertRules: checks[3].data || 0,
    }
  });
}
```

---

## 8. QUERIES DE VERIFICAÇÃO DE INTEGRIDADE

Execute periodicamente para detectar problemas:

```sql
-- =====================================
-- VERIFICAÇÕES DE INTEGRIDADE - FOCUS
-- =====================================

-- V1: Usuários sem vínculo com instituição (órfãos)
SELECT 'V1: Usuários órfãos' as verificacao, COUNT(*) as problemas
FROM users u
WHERE u.deleted_at IS NULL
  AND u.is_master = false
  AND NOT EXISTS (
    SELECT 1 FROM user_institutions ui
    WHERE ui.user_id = u.id
    AND ui.deleted_at IS NULL
  );

-- V2: Alunos ativos em turmas inativas
SELECT 'V2: Alunos em turmas inativas' as verificacao, COUNT(*) as problemas
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.deleted_at IS NULL
  AND s.is_active = true
  AND (c.deleted_at IS NOT NULL OR c.is_active = false);

-- V3: Ocorrências sem turma histórica
SELECT 'V3: Ocorrências sem turma histórica' as verificacao, COUNT(*) as problemas
FROM occurrences o
WHERE o.class_id_at_occurrence IS NULL;

-- V4: Regras de alerta com aluno/turma inválido
SELECT 'V4: Alert rules inválidas' as verificacao, COUNT(*) as problemas
FROM alert_rules ar
LEFT JOIN students s ON ar.scope_student_id = s.id
LEFT JOIN classes c ON ar.scope_class_id = c.id
WHERE ar.is_active = true
  AND (
    (ar.scope_student_id IS NOT NULL AND (s.id IS NULL OR s.deleted_at IS NOT NULL))
    OR
    (ar.scope_class_id IS NOT NULL AND (c.id IS NULL OR c.deleted_at IS NOT NULL))
  );

-- V5: Turmas sem ano letivo
SELECT 'V5: Turmas sem ano letivo' as verificacao, COUNT(*) as problemas
FROM classes c
WHERE c.school_year_id IS NULL
  AND c.deleted_at IS NULL;

-- V6: Matrículas ativas de alunos inativos
SELECT 'V6: Matrículas inconsistentes' as verificacao, COUNT(*) as problemas
FROM student_enrollments se
JOIN students s ON se.student_id = s.id
WHERE se.status = 'active'
  AND (s.deleted_at IS NOT NULL OR s.is_active = false);
```

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1 - Crítica (Imediato)
- [ ] Migration: Soft delete em occurrences
- [ ] Código: Bloquear delete permanente de turmas com dados
- [ ] Código: Preview de dados na exclusão de instituição
- [ ] Testes: E2E para cenários de deleção

### Fase 2 - Alta (Esta Semana)
- [ ] Código: Desativar alert_rules ao desativar aluno/turma
- [ ] Migration: Preencher class_id_at_occurrence
- [ ] Migration: Criar e vincular school_years faltantes
- [ ] Testes: Queries de verificação de integridade

### Fase 3 - Média (Este Mês)
- [ ] Migration: Soft delete completo em alert_rules
- [ ] API: Endpoint de verificação de integridade
- [ ] Docs: Documentar regras de governança

---

## 10. CONCLUSÃO

O sistema Focus tem uma base sólida de governança de dados, com soft delete implementado nas principais entidades (users, classes, students, occurrence_types). No entanto, existem **3 pontos críticos** que precisam de atenção imediata:

1. **DELETE de instituição** apaga todo histórico sem possibilidade de recuperação
2. **DELETE permanente de turma** não valida dependências
3. **Ocorrências não têm soft delete** - dado mais importante do sistema

As correções propostas são incrementais e podem ser implementadas sem downtime, mantendo compatibilidade com dados existentes.
