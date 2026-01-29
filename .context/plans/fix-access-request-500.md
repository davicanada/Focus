---
status: completed
generated: 2026-01-24
agents:
  - type: "bug-fixer"
    role: "Identificar e corrigir a causa do erro 500"
  - type: "test-writer"
    role: "Validar correcao com testes E2E"
phases:
  - id: "phase-1"
    name: "Diagnostico"
    prevc: "P"
  - id: "phase-2"
    name: "Correcao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Corrigir Erro 500 no Cadastro de Novas Contas

> POST /api/access-request retorna 500 ao criar professor ou admin_existing

## Task Snapshot
- **Primary goal:** Corrigir erro 500 ao criar solicitacoes de acesso
- **Success signal:** Todos os 3 fluxos funcionando (admin_new, admin_existing, professor)
- **Key references:**
  - `components/auth/AccessRequestModal.tsx` - Frontend
  - `app/api/access-request/route.ts` - API
  - `e2e/account-approval.spec.ts` - Testes E2E

## Causa Raiz Identificada

### Erro
```
code: '23503' (foreign_key_violation)
message: 'insert or update on table "access_requests" violates foreign key constraint "access_requests_institution_id_fkey"'
details: 'Key (institution_id)=(af919ee1-ccc8-49be-9f58-e51ed9fb9d75) is not present in table "institutions".'
```

### Problema
Os testes E2E e possivelmente o cache do servidor estavam usando um `institution_id` hardcoded (`af919ee1-ccc8-49be-9f58-e51ed9fb9d75`) que foi deletado do banco de dados.

A instituicao real no banco era: `a5469bc2-dee5-461c-8e3a-f98cf8c386af`

### Solucao
Modificar os testes E2E para buscar o `institution_id` dinamicamente via API `/api/institutions/public` em vez de usar IDs hardcoded.

## Working Phases

### Phase 1 - Diagnostico (P) - COMPLETO

**Steps**
1. [x] Adicionar logging detalhado a API
2. [x] Executar testes E2E com Playwright para reproduzir erro
3. [x] Capturar codigo de erro Postgres: `23503` (FK violation)
4. [x] Verificar instituicao real no banco via MCP Supabase

### Phase 2 - Correcao (E) - COMPLETO

**Alteracoes:**

1. `e2e/account-approval.spec.ts`:
   - Removido `TEST_INSTITUTION_ID` hardcoded
   - Adicionada funcao `getTestInstitutionId()` para buscar via API
   - Adicionado `test.beforeAll` para carregar ID dinamicamente
   - Corrigido assertion para usar `'obrigat'` (compativel com acentos)

2. `e2e/ai-analytics.spec.ts`:
   - Removido `TEST_INSTITUTION_ID` hardcoded
   - Adicionada funcao `getTestInstitutionId()`
   - Modificada `aiRequest()` para usar `testInstitutionId` dinamico

3. `e2e/ai-validation.spec.ts`:
   - Removido `TEST_INSTITUTION_ID` hardcoded
   - Adicionada funcao `getTestInstitutionId()`
   - Adicionado `test.beforeAll` para carregar ID dinamicamente

### Phase 3 - Validacao (V) - COMPLETO

**Steps**
1. [x] Limpar cache do Next.js e matar processo na porta 3000
2. [x] Executar testes E2E: 34/34 passando
3. [x] Build passa com sucesso

## Evidence & Follow-up

**Resultado:**
- Todos os 34 testes de account-approval passando
- Build passando sem erros
- Fluxos professor, admin_existing e admin_new funcionando

**Arquivos modificados:**
- `e2e/account-approval.spec.ts`
- `e2e/ai-analytics.spec.ts`
- `e2e/ai-validation.spec.ts`
- `app/api/access-request/route.ts` (logging removido apos debug)
