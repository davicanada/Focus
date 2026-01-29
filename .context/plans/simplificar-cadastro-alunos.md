---
status: completed
generated: 2026-01-23
agents:
  - type: "feature-developer"
    role: "Simplificar formulário removendo campos desnecessários"
  - type: "frontend-specialist"
    role: "Ajustar UI do modal e template Excel"
docs:
  - "project-overview.md"
phases:
  - id: "phase-1"
    name: "Simplificação do Formulário"
    prevc: "E"
  - id: "phase-2"
    name: "Validação"
    prevc: "V"
---

# Simplificar Cadastro de Alunos para MVP

> Simplificar o formulário de cadastro de alunos removendo campos desnecessários para o MVP. Manter apenas: Nome, Matrícula e Turma. Remover: data de nascimento, dados do responsável e observações.

## Task Snapshot
- **Primary goal:** Reduzir o formulário de cadastro de alunos para apenas os campos essenciais ao MVP (gestão de ocorrências)
- **Success signal:** Formulário exibe apenas Nome, Matrícula e Turma; importação Excel funciona com template simplificado
- **Key references:**
  - `app/admin/alunos/page.tsx` - Página principal de alunos
  - `types/index.ts` - Tipos TypeScript

## Codebase Context

### Estado Atual (app/admin/alunos/page.tsx)

O formulário atual possui os seguintes campos:
```typescript
interface FormData {
  full_name: string;
  class_id: string;
  enrollment_number: string;
  birth_date: string;        // REMOVER
  guardian_name: string;     // REMOVER
  guardian_phone: string;    // REMOVER
  guardian_email: string;    // REMOVER
  notes: string;             // REMOVER
}
```

O estado inicial:
```typescript
const emptyForm: FormData = {
  full_name: '',
  class_id: '',
  enrollment_number: '',
  birth_date: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_email: '',
  notes: '',
};
```

### Estado Desejado

```typescript
interface FormData {
  full_name: string;
  enrollment_number: string;
  class_id: string;
}

const emptyForm: FormData = {
  full_name: '',
  enrollment_number: '',
  class_id: '',
};
```

## Agent Lineup
| Agent | Role in this plan |
| --- | --- |
| Feature Developer | Remover campos do state e lógica de submit |
| Frontend Specialist | Simplificar UI do modal e template Excel |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Alunos existentes com dados que serão desconsiderados | Baixa | Baixo | Dados permanecem no banco, apenas não editáveis |
| Template Excel antigo incompatível | Média | Baixo | Atualizar template e documentação |

### Assumptions
- Campos removidos do formulário permanecem na tabela do banco (sem migration)
- Dados existentes não serão perdidos, apenas não editáveis via UI

## Working Phases

### Phase 1 — Simplificação do Formulário

**Arquivos a modificar:**

1. **`app/admin/alunos/page.tsx`**
   - Simplificar interface `FormData`
   - Simplificar `emptyForm`
   - Remover campos do modal: birth_date, guardian_name, guardian_phone, guardian_email, notes
   - Manter lógica de submit apenas com campos necessários
   - Atualizar template Excel para download

2. **Campos do Modal a MANTER:**
   - Nome Completo (`full_name`) - obrigatório
   - Matrícula (`enrollment_number`) - obrigatório
   - Turma (`class_id`) - obrigatório, select com turmas

3. **Campos do Modal a REMOVER:**
   - Data de Nascimento (`birth_date`)
   - Nome do Responsável (`guardian_name`)
   - Telefone do Responsável (`guardian_phone`)
   - Email do Responsável (`guardian_email`)
   - Observações (`notes`)

**Steps:**
1. Editar interface FormData e emptyForm
2. Remover inputs do modal
3. Ajustar handleSaveStudent para enviar apenas campos necessários
4. Atualizar template Excel (se aplicável)
5. Testar criação e edição de alunos

### Phase 2 — Validação

**Steps:**
1. Verificar que build passa sem erros
2. Testar criação de novo aluno
3. Testar edição de aluno existente
4. Testar importação via Excel (se template atualizado)

## Implementation Details

### Código a Remover do Modal (aproximadamente linhas 770-850)

Remover seções:
- Input de Data de Nascimento
- Input de Nome do Responsável
- Input de Telefone do Responsável
- Input de Email do Responsável
- Textarea de Observações

### Template Excel Simplificado

Colunas necessárias:
| Nome | Matrícula | Turma |
| --- | --- | --- |
| João Silva | 2024001 | 6º Ano A - Matutino |

## Evidence & Follow-up

- [x] Build passando
- [x] Formulário simplificado funcionando
- [x] Atualizar CLAUDE.md com mudanças da sessão
