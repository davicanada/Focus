---
status: completed
generated: 2026-02-04
agents:
  - type: "feature-developer"
    role: "Add professor column to devolutiva reports"
phases:
  - id: "phase-1"
    name: "Análise"
    prevc: "P"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Adicionar Professor da Ocorrência ao Relatório de Devolutivas

## Contexto

O relatório de devolutivas mostra informações sobre feedbacks/ações tomadas em ocorrências. Atualmente exibe:
- Data da Devolutiva
- Aluno
- Turma
- Tipo de Ocorrência
- Tipo de Ação
- Comentários
- Usuário (quem registrou a devolutiva)

**Falta:** O professor que **registrou a ocorrência original** não está sendo exibido.

## Análise dos Dados

### Dois Usuários Diferentes
1. **`registered_by_name`** - Professor que CRIOU/REGISTROU a ocorrência original
2. **`performed_by_name`** - Usuário que registrou a devolutiva/feedback

### Estado Atual
- **API** (`app/api/reports/devolutiva/route.ts`): JÁ retorna `registered_by_name` ✅
- **Interface** `OccurrenceReportData`: JÁ tem `registered_by_name` ✅
- **Interface** `FeedbackRow`: NÃO tem `registered_by_name` ❌
- **Tabelas**: NÃO exibem o professor da ocorrência ❌
- **Excel/PDF**: NÃO incluem o professor da ocorrência ❌

## Plano de Implementação

### Fase 1: Atualizar Interface FeedbackRow

**Arquivo:** `app/admin/relatorios/devolutiva/page.tsx`

Adicionar campo `registered_by_name` à interface:

```typescript
interface FeedbackRow {
  occurrence_id: string;
  occurrence_date: string;
  student_name: string;
  class_name: string;
  occurrence_type: string;
  severity: string;
  status: OccurrenceStatus;
  registered_by_name: string;  // NOVO - professor da ocorrência
  feedback_date: string;
  action_type: string;
  description: string | null;
  performed_by_name: string | null;
}
```

### Fase 2: Atualizar Função getFeedbackRows()

Passar `registered_by_name` ao criar cada row:

```typescript
rows.push({
  // ... campos existentes
  registered_by_name: occ.registered_by_name,  // NOVO
  // ...
});
```

### Fase 3: Atualizar Tabela "Por Atualização"

Adicionar coluna "Professor" entre "Turma" e "Tipo Ocorrência":

| Data Devolutiva | Aluno | Turma | **Professor** | Tipo Ocorrência | Tipo de Ação | Comentários | Usuário |
|-----------------|-------|-------|---------------|-----------------|--------------|-------------|---------|

### Fase 4: Atualizar View "Por Ocorrência"

Adicionar professor no header da ocorrência:

```
{student_name} | {class_name} | {occurrence_type} | {date} | Prof: {registered_by_name} | {status}
```

### Fase 5: Atualizar Export Excel "Por Atualização"

**Headers atuais:**
```
['Data Devolutiva', 'Aluno', 'Turma', 'Tipo Ocorrência', 'Tipo de Ação', 'Comentários', 'Usuário']
```

**Headers novos:**
```
['Data Devolutiva', 'Aluno', 'Turma', 'Professor', 'Tipo Ocorrência', 'Tipo de Ação', 'Comentários', 'Usuário Devolutiva']
```

- Adicionar coluna "Professor" (col 4)
- Renomear "Usuário" para "Usuário Devolutiva" para clareza
- Ajustar larguras das colunas

### Fase 6: Atualizar Export Excel "Por Ocorrência"

Adicionar professor no header de cada ocorrência:
```
"{date} - {student_name} ({class_name}) - {occurrence_type} - Prof: {registered_by_name}"
```

### Fase 7: Atualizar Export PDF "Por Atualização"

**Headers atuais:**
```
['Data Devolutiva', 'Aluno', 'Turma', 'Tipo Ocorr.', 'Tipo Ação', 'Comentários', 'Usuário']
```

**Headers novos:**
```
['Data Devol.', 'Aluno', 'Turma', 'Professor', 'Tipo Ocorr.', 'Tipo Ação', 'Coment.', 'Usuário Dev.']
```

- Abreviar alguns headers para caber 8 colunas
- Ajustar `columnStyles` para larguras apropriadas

### Fase 8: Atualizar Export PDF "Por Ocorrência"

Adicionar professor no header de cada grupo:
```
"{date} - {student_name} ({class_name}) - {occurrence_type} - Prof: {registered_by_name}"
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `app/admin/relatorios/devolutiva/page.tsx` | Interface, função, tabelas, exports |

## Checklist de Validação

- [x] Interface `FeedbackRow` com `registered_by_name`
- [x] Função `getFeedbackRows()` passando o campo
- [x] Tabela "Por Atualização" com coluna Professor
- [x] View "Por Ocorrência" com professor no header
- [x] Excel "Por Atualização" com coluna Professor
- [x] Excel "Por Ocorrência" com professor no header
- [x] PDF "Por Atualização" com coluna Professor
- [x] PDF "Por Ocorrência" com professor no header
- [x] Build passando
- [ ] Teste manual verificando dados corretos

## Implementação Concluída (04/02/2026)

### Alterações Realizadas

| Local | Alteração |
|-------|-----------|
| Interface `FeedbackRow` | Adicionado campo `registered_by_name` |
| Função `getFeedbackRows()` | Passa `occ.registered_by_name` ao criar rows |
| Tabela "Por Atualização" | Nova coluna "Professor" entre Turma e Tipo Ocorrência |
| View "Por Ocorrência" | Adicionado "Prof: {nome}" no header da ocorrência |
| Excel "Por Atualização" | Nova coluna "Professor" (col 4), 8 colunas total |
| Excel "Por Ocorrência" | Professor no header: "... - Prof: {nome}" |
| PDF "Por Atualização" | Nova coluna "Professor", headers abreviados |
| PDF "Por Ocorrência" | Professor no header: "... - Prof: {nome}" |

### Status
- ✅ Build passando
