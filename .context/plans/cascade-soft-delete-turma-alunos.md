---
status: review
generated: 2026-03-09
agents:
  - type: "frontend-specialist"
    role: "Modificar UI de turmas com modal de confirmação e lógica de cascata"
  - type: "feature-developer"
    role: "Implementar soft-delete em cascata e nova validação de exclusão permanente"
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

# Soft Delete em Cascata ao Excluir Turma

> Ao mover uma turma para a lixeira, soft-delete automático em todos os alunos da turma sem intervenção manual. Exclusão permanente bloqueada se qualquer aluno tiver ocorrências históricas. Restauração da turma também restaura os alunos automaticamente.

## Objetivo e Motivação

**Problema atual:** O admin precisa desligar aluno por aluno antes de poder mover uma turma para a lixeira — fluxo lento e frustrante.

**Solução:** Soft-delete em cascata preserva toda a governança de dados (histórico de ocorrências intacto) e elimina o trabalho manual.

**Princípio central:** Soft delete nunca apaga dados — apenas desativa registros. Ocorrências continuam apontando para `student_id` que ainda existe no banco.

---

## Análise de Impacto

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `app/admin/turmas/page.tsx` | Modal de confirmação, lógica de cascata, restauração |
| `app/api/students/bulk-deactivate/route.ts` | **NOVA API** — desativa múltiplos alunos em batch |
| `app/api/students/bulk-restore/route.ts` | **NOVA API** — restaura múltiplos alunos em batch |

### O que NÃO muda
- Tabela `students` — sem migration necessária (`deleted_at` já existe)
- Tabela `student_enrollments` — atualização de status por batch
- Ocorrências — completamente intocadas em todos os fluxos
- `alert_rules` — desativadas por batch junto com os alunos

---

## Decisões de Governança

| Cenário | Comportamento |
|---|---|
| Turma → Lixeira (tem alunos SEM ocorrências) | Soft-delete em cascata nos alunos ✅ |
| Turma → Lixeira (tem alunos COM ocorrências) | Soft-delete em cascata nos alunos ✅ (ocorrências preservadas) |
| Restaurar turma da lixeira | Restaura todos os alunos desativados junto com a turma ✅ |
| Exclusão permanente (alunos sem ocorrências) | Permitida — exclui alunos e depois a turma ✅ |
| Exclusão permanente (algum aluno TEM ocorrências) | **BLOQUEADA** — protege integridade do histórico 🔒 |

---

## Fases de Implementação

### Phase 1 — Planejamento ✅
> Fase atual (P) — este documento

| # | Task | Status |
|---|------|--------|
| 1.1 | Mapear arquivos impactados | completed |
| 1.2 | Definir regras de governança | completed |
| 1.3 | Aprovar plano com o usuário | pending |

---

### Phase 2 — Implementação (E)

**Objetivo:** Criar as duas novas APIs e modificar a página de turmas.

| # | Task | Agent | Status | Deliverable |
|---|------|-------|--------|-------------|
| 2.1 | Criar `POST /api/students/bulk-deactivate` | `feature-developer` | pending | Desativa N alunos em batch + enrollments + alert_rules |
| 2.2 | Criar `POST /api/students/bulk-restore` | `feature-developer` | pending | Restaura N alunos em batch + enrollments |
| 2.3 | Substituir `confirm()` por modal React em `handleDelete` | `frontend-specialist` | pending | Modal com contagem de alunos e aviso claro |
| 2.4 | Após confirmação, chamar bulk-deactivate antes de soft-delete da turma | `frontend-specialist` | pending | Cascata funcional |
| 2.5 | Modificar `handleRestore` para chamar bulk-restore dos alunos | `frontend-specialist` | pending | Restauração em cascata |
| 2.6 | Modificar `handlePermanentDelete` para verificar ocorrências por aluno | `frontend-specialist` | pending | Bloqueio granular correto |

#### Detalhe: Modal de Confirmação (task 2.3)

```
⚠️ Mover "8º Ano A" para a lixeira?

Esta turma possui 25 alunos. Ao mover a turma para a lixeira,
todos os alunos serão desativados automaticamente.

O histórico de ocorrências será preservado.
A turma e os alunos podem ser restaurados a qualquer momento.

[Cancelar]  [Mover para a lixeira]
```

#### Detalhe: Nova regra de Exclusão Permanente (task 2.6)

**Lógica atual (a substituir):**
```
se (alunos > 0 || ocorrências > 0) → bloquear
```

**Nova lógica:**
```
// Contar alunos da turma que possuem ocorrências históricas
const alunosComOcorrencias = COUNT(occurrences)
  WHERE class_id_at_occurrence = turma.id
  AND deleted_at IS NULL

se (alunosComOcorrencias > 0) → BLOQUEAR:
  "X aluno(s) possuem histórico de ocorrências e não podem ser excluídos permanentemente.
   Use 'Mover para a lixeira' para desativar preservando o histórico."

se (alunosComOcorrencias === 0) → permitir:
  → deletar alunos primeiro (sem histórico, safe)
  → depois deletar a turma
```

#### Detalhe: API bulk-deactivate (task 2.1)

```
POST /api/students/bulk-deactivate
Body: { studentIds: string[], reason?: string }

- Verifica auth (admin ou master)
- Verifica institution_id de cada aluno (segurança multi-tenant)
- UPDATE students SET is_active=false, deleted_at=now() WHERE id IN (...)
- UPDATE student_enrollments SET status='dropped' WHERE student_id IN (...)
- UPDATE alert_rules SET is_active=false WHERE scope_student_id IN (...)
- Retorna: { deactivated: number }
```

#### Detalhe: API bulk-restore (task 2.2)

```
POST /api/students/bulk-restore
Body: { studentIds: string[] }

- Verifica auth (admin ou master)
- Verifica institution_id de cada aluno (segurança multi-tenant)
- UPDATE students SET is_active=true, deleted_at=null WHERE id IN (...)
- UPDATE student_enrollments SET status='active' WHERE student_id IN (...)
- Retorna: { restored: number }
```

---

### Phase 3 — Validação (V)

**Objetivo:** Garantir que todos os cenários funcionam corretamente.

| # | Cenário | Resultado esperado |
|---|---------|-------------------|
| 3.1 | Mover turma COM alunos para lixeira | Modal aparece com contagem correta de alunos |
| 3.2 | Confirmar no modal | Turma + alunos vão para lixeira |
| 3.3 | Verificar alunos na página de Alunos | Alunos aparecem como inativos |
| 3.4 | Verificar ocorrências dos alunos | Ocorrências intactas no banco |
| 3.5 | Restaurar turma da lixeira | Turma + alunos restaurados |
| 3.6 | Exclusão permanente (aluno COM ocorrência) | Bloqueado com mensagem clara |
| 3.7 | Exclusão permanente (aluno SEM ocorrência) | Permite com confirmação |
| 3.8 | Mover turma SEM alunos para lixeira | Funciona normalmente (sem modal extra) |
| 3.9 | Build TypeScript | Sem erros |

---

## Rollback

Sem migration de banco — apenas código frontend e duas APIs novas. Para reverter:
1. Remover rotas `bulk-deactivate` e `bulk-restore`
2. Reverter `app/admin/turmas/page.tsx` para o estado anterior

---

## Notas de Segurança

- Ambas as APIs verificam autenticação + role (admin ou master)
- Verificação de `institution_id` garante que admin só afeta sua própria instituição
- `bulk-restore` restaura apenas alunos que foram desativados pelo fluxo de turma (identificados pelos `studentIds` passados ao desativar)
