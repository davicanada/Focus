---
status: ready
generated: 2026-02-07
---

# Corrigir Validacao de Tipo de Acao na Devolutiva

> Corrigir erro "Tipo de acao invalido" ao registrar devolutiva com tipos personalizados criados pelo admin

## Problema Identificado

### Sintoma
Ao registrar uma devolutiva com um tipo de acao personalizado (ex: "Atraso"), o sistema retorna erro:
```
"Tipo de acao invalido"
```

### Causa Raiz
Descompasso entre frontend e API na validacao de tipos de acao:

| Componente | O que envia/espera |
|------------|-------------------|
| **Frontend** (`AddFeedbackModal.tsx:173`) | Envia `type.name` (ex: `"Atraso"`, `"Conversa com aluno"`) |
| **API** (`route.ts:101-106`) | Valida contra constantes hardcoded (ex: `student_talk`, `guardian_contact`) |

### Fluxo Atual (Quebrado)
```
1. Admin cria tipo "Atraso" no banco -> feedback_action_types.name = "Atraso"
2. Modal carrega tipos do banco -> dropdown exibe "Atraso"
3. Usuario seleciona "Atraso" -> form envia action_type: "Atraso"
4. API valida: FEEDBACK_ACTION_TYPES["Atraso"] -> undefined
5. API retorna: "Tipo de acao invalido" (ERRO)
```

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/constants/feedback.ts` | Define constantes hardcoded (12 tipos padrao) |
| `types/index.ts:10-22` | Define `FeedbackActionType` union type |
| `app/api/occurrences/[id]/feedbacks/route.ts:101-106` | **Validacao que causa o erro** |
| `components/occurrences/AddFeedbackModal.tsx:168-179` | **Frontend que envia o name** |

## Solucao Proposta

### Estrategia: Validar contra banco de dados

Modificar a API para validar tipos de acao consultando a tabela `feedback_action_types` do banco, em vez de validar contra constantes hardcoded.

**Vantagens:**
- Codigo mais simples (uma fonte de verdade)
- Funciona com tipos padrao e customizados
- Admin tem controle total sobre tipos validos
- Tipos inativos sao rejeitados automaticamente

**Pre-requisito:** Tipos padrao ja existem no banco (criados pela migration)

## Codigo da Correcao

### Arquivo: `app/api/occurrences/[id]/feedbacks/route.ts`

**Localizar (linhas 101-106):**
```typescript
// Verificar se o tipo de acao e valido
if (!FEEDBACK_ACTION_TYPES[action_type as FeedbackActionType]) {
  return NextResponse.json(
    { error: 'Tipo de acao invalido' },
    { status: 400 }
  );
}
```

**Substituir por:**
```typescript
// Verificar se o tipo de acao existe no banco (padrao ou personalizado)
const { data: validActionType } = await supabase
  .from('feedback_action_types')
  .select('id')
  .eq('institution_id', userInstitution.institution_id)
  .eq('name', action_type)
  .eq('is_active', true)
  .single();

if (!validActionType) {
  return NextResponse.json(
    { error: 'Tipo de acao invalido' },
    { status: 400 }
  );
}
```

**Nota:** Remover o import de `FEEDBACK_ACTION_TYPES` se nao for mais necessario.

## Passos de Implementacao

### Fase 1: Correcao da API
1. Abrir `app/api/occurrences/[id]/feedbacks/route.ts`
2. Localizar linhas 101-106 (validacao atual)
3. Substituir por validacao contra banco de dados
4. Remover import nao utilizado de `FEEDBACK_ACTION_TYPES`

### Fase 2: Verificacao
1. Testar com tipo padrao (ex: "Conversa com aluno")
2. Testar com tipo customizado (ex: "Atraso")
3. Testar com tipo inexistente (deve dar erro)
4. Testar com tipo inativo (deve dar erro)

### Fase 3: Build
1. Rodar `npm run build` para verificar TypeScript
2. Verificar que nao ha erros de compilacao

## Verificacoes Pos-Correcao

- [ ] Registrar devolutiva com tipo padrao funciona
- [ ] Registrar devolutiva com tipo customizado funciona
- [ ] Tipos inativos sao rejeitados
- [ ] Tipos de outra instituicao sao rejeitados
- [ ] Build TypeScript passa sem erros
- [ ] Marcar ocorrencia como resolvida funciona
