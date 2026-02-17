---
status: filled
generated: 2026-02-16
phases:
  - id: "phase-1"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-2"
    name: "Validacao"
    prevc: "V"
---

# Subcategoria obrigatoria + remover acao "Caso resolvido" redundante

## Problema 1 — Subcategoria opcional ao criar tipo de ocorrencia

### Situacao atual
- No modal de tipo de ocorrencia (`tipos-ocorrencias/page.tsx`), o dropdown de subcategoria tem "Nenhuma" como primeira opcao (`<option value="">Nenhuma</option>`, linha 566)
- `handleSave()` converte valor vazio para `null`: `subcategory_id: formData.subcategory_id || null` (linha 173)
- Resultado: admin pode criar tipos sem subcategoria

### Correcao
1. **Remover opcao "Nenhuma"** do dropdown
2. **Adicionar placeholder**: `<option value="" disabled>Selecione uma subcategoria...</option>`
3. **Adicionar validacao** em `handleSave()`: se `!formData.subcategory_id`, mostrar `toast.error('Subcategoria e obrigatoria')`
4. **formData** ja inicializa com `subcategory_id: ''` — ok

### Arquivo
- `app/admin/tipos-ocorrencias/page.tsx` — handleSave (linhas 158-203) e dropdown (linhas 551-573)

---

## Problema 2 — Acao "Caso resolvido" redundante

### Situacao atual
- Em `lib/constants/feedback.ts` linha 16: `resolved: { label: 'Caso resolvido', icon: 'CheckCircle' }`
- Em `components/occurrences/AddFeedbackModal.tsx` linha 199: checkbox "Marcar ocorrencia como Resolvida"
- O tipo de acao "Caso resolvido" **NAO muda o status** da ocorrencia — so o checkbox faz isso
- Confusao: admin seleciona "Caso resolvido" achando que resolve, mas se nao marcar o checkbox, status fica "Em andamento"
- Redundancia: dois mecanismos para o mesmo conceito

### Analise
Os tipos de acao representam **O QUE FOI FEITO** (conversa, advertencia, encaminhamento). "Caso resolvido" e um **RESULTADO/STATUS**, nao uma acao. Nao faz sentido estar na lista de acoes.

### Opcoes

**Opcao A — Remover "Caso resolvido" da lista de acoes (Recomendada)**
- Remover `resolved` de `FEEDBACK_ACTION_TYPES` em `lib/constants/feedback.ts`
- Remover `'resolved'` do type `FeedbackActionType` em `types/index.ts`
- Desativar o registro no banco (`feedback_action_types`) via `is_active = false`
- Manter o checkbox "Marcar como Resolvida" que ja funciona corretamente
- Feedbacks existentes que usaram "resolved" continuam no historico com label "Caso resolvido"

**Opcao B — Manter "Caso resolvido" mas auto-resolver**
- Quando admin seleciona "Caso resolvido", auto-marcar o checkbox
- Mantem dois mecanismos mas vincula um ao outro
- Mais complexo, mais confuso

**Opcao C — Remover checkbox, usar so "Caso resolvido"**
- Remover checkbox, detectar no backend se action_type === 'resolved' e setar status
- Esconde funcionalidade dentro de uma opcao de dropdown — menos intuitivo

### Recomendacao: Opcao A
- Mais limpa: cada conceito tem um unico mecanismo
- Tipos de acao = ACOES realizadas (conversa, advertencia, etc.)
- Resolver = CHECKBOX explicito (marcar sim/nao)
- Sem ambiguidade para o usuario

---

## Arquivos Impactados

| Arquivo | Mudanca |
|---------|---------|
| `app/admin/tipos-ocorrencias/page.tsx` | Remover "Nenhuma", validacao obrigatoria |
| `lib/constants/feedback.ts` | Remover `resolved` de FEEDBACK_ACTION_TYPES |
| `types/index.ts` | Remover `'resolved'` de FeedbackActionType |

---

## Pontos para Discussao

1. **Subcategoria obrigatoria**: Concorda em remover "Nenhuma" e bloquear salvamento sem subcategoria?
2. **Tipos existentes**: Ja existem tipos de ocorrencia sem subcategoria no banco? Se sim, devemos forcar edicao deles?
3. **"Caso resolvido"**: Prefere Opcao A (remover da lista), B (auto-resolver) ou C (remover checkbox)?
4. **Historico**: Feedbacks antigos com tipo "resolved" — manter label "Caso resolvido" na visualizacao?
