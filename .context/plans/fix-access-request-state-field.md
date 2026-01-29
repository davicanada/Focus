---
status: active
generated: 2026-01-24
agents:
  - type: "bug-fixer"
    role: "Identificar e corrigir o erro de tipo de dados"
  - type: "test-writer"
    role: "Testar todos os 3 fluxos de criacao de conta"
phases:
  - id: "phase-1"
    name: "Analise da Causa Raiz"
    prevc: "P"
  - id: "phase-2"
    name: "Correcao do Bug"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Corrigir Erro 500 no Access Request - Campo State

> Corrigir o bug onde o campo institution_state esta recebendo nome completo do estado em vez da sigla

## Task Snapshot
- **Primary goal:** Corrigir erro 500 ao criar solicitacao de acesso com nova instituicao
- **Success signal:** Todos os 3 fluxos de criacao de conta funcionando (admin_new, admin_existing, professor)
- **Key references:**
  - `components/auth/AccessRequestModal.tsx` - Formulario de solicitacao
  - `app/api/access-request/route.ts` - API de criacao
  - `e2e/account-approval.spec.ts` - Testes E2E existentes

## Analise da Causa Raiz

### Erro Identificado
```
ERROR: value too long for type character(2)
```

### Logs do Supabase
Os logs do PostgreSQL mostram 3 ocorrencias deste erro nos ultimos minutos, confirmando que o problema ocorre ao inserir dados na tabela `access_requests`.

### Schema da Tabela access_requests
| Coluna | Tipo | Tamanho |
|--------|------|---------|
| institution_state | character | 2 chars |
| institution_state_code | character | 2 chars |

### Codigo do Frontend (AccessRequestModal.tsx)
```typescript
// Linha 195 - PROBLEMA
requestBody.institution_state = addressData.state;  // "Sao Paulo" (9+ chars)

// Linha 196 - OK
requestBody.institution_state_code = addressData.stateCode;  // "SP" (2 chars)
```

### Problema
O frontend esta enviando:
- `institution_state = addressData.state` -> Nome completo (ex: "Sao Paulo") - **ERRO: coluna so aceita 2 chars**
- `institution_state_code = addressData.stateCode` -> Sigla (ex: "SP") - OK

### Solucao
Trocar `addressData.state` por `addressData.stateCode` no campo `institution_state`.

Ambos os campos (`institution_state` e `institution_state_code`) devem receber a sigla de 2 caracteres.

## Fluxos Afetados

| Fluxo | Afetado | Motivo |
|-------|---------|--------|
| admin_new | SIM | Envia dados de endereco da nova instituicao |
| admin_existing | NAO | Usa institution_id existente |
| professor | NAO | Usa institution_id existente |

## Working Phases

### Phase 1 - Analise da Causa Raiz (P) - COMPLETO

**Steps**
1. [x] Verificar logs do Supabase
2. [x] Identificar erro "value too long for type character(2)"
3. [x] Analisar schema da tabela access_requests
4. [x] Analisar codigo do AccessRequestModal
5. [x] Confirmar que o erro ocorre apenas no fluxo admin_new

### Phase 2 - Correcao do Bug (E) - COMPLETO

**Steps**
1. [x] Corrigir AccessRequestModal.tsx - usar stateCode em vez de state
2. [x] Verificar se API route precisa de ajuste (nao precisa, dados chegam corretos)
3. [x] Testar localmente o fluxo admin_new

### Phase 3 - Validacao (V) - COMPLETO

**Steps**
1. [x] Testar fluxo admin_new (nova instituicao + admin) - PASSOU
2. [x] Testar fluxo admin_existing (admin em instituicao existente) - PASSOU
3. [x] Testar fluxo professor (professor em instituicao existente) - PASSOU
4. [x] Executar testes E2E existentes - 17/17 passando
5. [x] Atualizar CLAUDE.md

## Evidence & Follow-up

Artifacts:
- [x] Logs do Supabase com erro "value too long for type character(2)"
- [x] Teste admin_new agora retorna `institution_state: "RJ"` (2 chars)
- [x] Resultado dos testes E2E: 17/17 passando + 5/5 email tests
