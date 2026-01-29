---
status: ready
generated: 2026-01-25
agents:
  - type: "feature-developer"
    role: "Implement edit modal and API route"
  - type: "frontend-specialist"
    role: "Design edit UI with good UX"
  - type: "security-auditor"
    role: "Ensure RLS policies protect data"
  - type: "test-writer"
    role: "Write E2E tests for edit flow"
phases:
  - id: "phase-1"
    name: "Discovery & Alignment"
    prevc: "P"
  - id: "phase-2"
    name: "Implementation & Iteration"
    prevc: "E"
  - id: "phase-3"
    name: "Validation & Handoff"
    prevc: "V"
---

# Edição de Ocorrências pelo Professor Plan

> Permitir que professores editem ocorrências que já registraram para corrigir erros

## Task Snapshot
- **Primary goal:** Permitir que professores editem ocorrências que eles mesmos registraram, possibilitando correção de erros (aluno errado, tipo errado, descrição incorreta).
- **Success signal:** Professor consegue clicar em "Editar" em uma ocorrência, modificar campos e salvar. A alteração persiste no banco de dados.
- **Key references:**
  - `app/professor/ocorrencias/page.tsx` - Página atual de listagem
  - `app/professor/registrar/page.tsx` - Formulário de registro (referência para campos)
  - `types/index.ts` - Interface `Occurrence`

## Codebase Context

### Estado Atual
- **`app/professor/ocorrencias/page.tsx`**:
  - Lista ocorrências do professor logado (`registered_by = user.id`)
  - Modal de visualização apenas (botão Eye)
  - Filtros: busca, turma, severidade
  - Não possui funcionalidade de edição

- **`app/professor/registrar/page.tsx`**:
  - Formulário para criar nova ocorrência
  - Campos: Turma, Alunos (multi-select), Tipo, Data, Descrição
  - Usa `createClient()` para insert direto no Supabase

- **Tabela `occurrences` no banco**:
  - `id`, `institution_id`, `student_id`, `occurrence_type_id`
  - `registered_by` (FK para users - quem registrou)
  - `occurrence_date`, `description`
  - `created_at`, `updated_at`

### RLS Atual
- Professores podem INSERT ocorrências
- Professores podem SELECT ocorrências da sua instituição
- **NÃO há política de UPDATE** - precisa criar

## Agent Lineup
| Agent | Role in this plan | First responsibility focus |
| --- | --- | --- |
| Feature Developer | Implementar modal de edição e API | Criar componente EditOccurrenceModal e rota PUT |
| Frontend Specialist | Garantir boa UX na edição | Validação de formulário, feedback visual |
| Security Auditor | Proteger dados | Validar RLS e verificar `registered_by` na API |
| Test Writer | Cobrir fluxo com testes | E2E tests para edição com sucesso e falha |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Professor editar ocorrência de outro | Low | High | Validar `registered_by` no backend + RLS |
| Edição após muito tempo | Medium | Medium | Considerar limite de 7 dias (opcional) |
| Mudança de aluno invalida histórico | Low | Medium | Manter `updated_at` para auditoria |

### Dependencies
- **Internal:** Nenhuma - funcionalidade isolada
- **External:** Supabase RLS policies
- **Technical:** Nenhuma migration de schema necessária

### Assumptions
- `updated_at` já existe na tabela e é atualizado automaticamente pelo Supabase
- Professor só pode editar ocorrências que ele mesmo registrou
- Não há limite de tempo para edição (MVP) - pode ser adicionado depois

## Working Phases

### Phase 1 — Discovery & Alignment ✅
**Análise Concluída:**
1. ✅ Revisada estrutura da página `professor/ocorrencias/page.tsx`
2. ✅ Revisada estrutura do formulário `professor/registrar/page.tsx`
3. ✅ Identificados campos editáveis: `occurrence_type_id`, `occurrence_date`, `description`
4. ✅ Decisão: NÃO permitir mudar `student_id` (evita confusão no histórico)

**Decisões de Design:**
- Botão de editar (ícone Pencil) ao lado do botão de visualizar
- Modal reutiliza estrutura do modal de visualização
- Campos editáveis: Tipo de Ocorrência, Data, Descrição
- Campo NÃO editável: Aluno (apenas visualização)

### Phase 2 — Implementation & Iteration

**Step 2.1: Criar RLS Policy para UPDATE**
```sql
-- Migration: allow_professor_update_own_occurrences
CREATE POLICY "Professors can update own occurrences"
ON occurrences FOR UPDATE
TO authenticated
USING (registered_by = auth.uid())
WITH CHECK (registered_by = auth.uid());
```

**Step 2.2: Criar API Route PUT `/api/occurrences/[id]`**
Arquivo: `app/api/occurrences/[id]/route.ts`
```typescript
// Valida:
// 1. Usuário autenticado
// 2. Ocorrência existe
// 3. registered_by === current user
// 4. Campos válidos (occurrence_type_id existe, date válida)
// Atualiza: occurrence_type_id, occurrence_date, description
```

**Step 2.3: Adicionar botão Edit na tabela**
Arquivo: `app/professor/ocorrencias/page.tsx`
- Importar ícone `Pencil` do lucide-react
- Adicionar botão ao lado do Eye button
- Estado `editingOccurrence` para controlar modal

**Step 2.4: Criar Modal de Edição**
Arquivo: `app/professor/ocorrencias/page.tsx` (inline ou componente separado)
```tsx
// Modal com:
// - Aluno (readonly, apenas exibição)
// - Select de Tipo de Ocorrência
// - Input date para Data
// - Textarea para Descrição
// - Botões Cancelar / Salvar
```

**Step 2.5: Integrar com API**
- Fetch PUT `/api/occurrences/${id}` no handleSave
- Toast de sucesso/erro
- Recarregar lista após salvar

**Arquivos a Criar/Modificar:**
| Arquivo | Ação | Descrição |
| --- | --- | --- |
| `app/api/occurrences/[id]/route.ts` | Criar | API PUT para update |
| `app/professor/ocorrencias/page.tsx` | Modificar | Adicionar botão + modal de edição |
| Supabase Dashboard | Executar | RLS policy para UPDATE |

### Phase 3 — Validation & Handoff

**Step 3.1: Testes Manuais**
- [ ] Professor edita própria ocorrência com sucesso
- [ ] Campos atualizados refletem no banco
- [ ] Toast de sucesso aparece
- [ ] Lista recarrega com dados atualizados

**Step 3.2: Testes E2E**
Arquivo: `e2e/professor-edit-occurrence.spec.ts`
```typescript
// Testes:
// 1. Professor edita ocorrência com sucesso
// 2. Professor tenta editar ocorrência de outro (deve falhar)
// 3. Validação de campos obrigatórios
// 4. Cancel fecha modal sem salvar
```

**Step 3.3: Atualizar CLAUDE.md**
- Documentar nova funcionalidade
- Registrar migration executada

## Rollback Plan

### Rollback Triggers
- Bug que permite editar ocorrência de outro professor
- Perda de dados durante update
- Erros de RLS policy

### Rollback Procedures
#### Phase 2 Rollback
- Action: Remover RLS policy, reverter código para versão anterior
- Data Impact: Nenhum - apenas adiciona funcionalidade
- Comando: `DROP POLICY "Professors can update own occurrences" ON occurrences;`

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot do modal de edição funcionando
- [ ] Log de teste E2E passando
- [ ] SQL da policy RLS executada

**Follow-up Opcional (Futuro):**
- Limite de tempo para edição (ex: 7 dias após criação)
- Log de auditoria das edições
- Notificação ao admin quando ocorrência é editada
