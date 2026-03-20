---
status: reviewed
generated: 2026-03-20
agents:
  - type: "database-specialist"
    role: "Migration de constraint e limpeza de dados"
  - type: "bug-fixer"
    role: "Corrigir APIs com tratamento de usuarios inativos"
  - type: "frontend-specialist"
    role: "Modal de reativacao no frontend"
  - type: "test-writer"
    role: "Validacao E2E de todos os fluxos"
phases:
  - id: "phase-1"
    name: "Correcao do Banco de Dados"
    prevc: "E"
    agent: "database-specialist"
  - id: "phase-2"
    name: "Correcao das APIs (Backend)"
    prevc: "E"
    agent: "bug-fixer"
  - id: "phase-3"
    name: "Modal de Reativacao (Frontend)"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "phase-4"
    name: "Validacao e Deploy"
    prevc: "V"
    agent: "test-writer"
---

# Correcao Completa: Ciclo de Vida de Usuarios Inativos + UNIQUE Constraint

> Solucao "a prova de falhas" para o ciclo de vida de usuarios em user_institutions.
> Caso original: TATIANA (admin EEEFM MARINGA) nao consegue mudar role da KARINA de admin para professor (erro 500).
> Causa raiz: constraint UNIQUE (user_id, institution_id, role) conflita com registro soft-deleted.
> Escopo ampliado: corrigir TODOS os fluxos que criam/modificam user_institutions para lidar com registros inativos.

## Task Snapshot
- **Primary goal:** Tornar o sistema resiliente a registros soft-deleted em user_institutions, evitando erros 500 e duplicatas.
- **Success signal:** Todos os fluxos de cadastro, reativacao e mudanca de role funcionam mesmo com registros inativos no banco.
- **Escola afetada:** EEEFM MARINGA (id: `7849830e-2ff9-4f36-bba8-12b8e7a71ef8`)
- **Dados atuais:** 1 usuario com conflito ativo (KARINA), 10 usuarios apenas soft-deleted

## Diagnostico Completo

### Causa Raiz (caso KARINA)

KARINA tem 2 registros em `user_institutions`:

| ui_id | role | is_active | deleted_at |
|-------|------|-----------|------------|
| `a6cc27cf-...` | `professor` | false | 2026-03-12 |
| `ba01dc8c-...` | `admin` | true | null |

Constraint `UNIQUE (user_id, institution_id, role)` nao ignora soft-deleted. UPDATE para role=professor causa violacao.

### Fluxos Afetados Mapeados

| # | Fluxo | Arquivo | Problema |
|---|-------|---------|----------|
| 1 | Mudanca de role | `api/users/[id]/role/route.ts` | 500 se role destino existe como soft-deleted |
| 2 | Cadastro de professor | `api/teachers/route.ts` | Cria duplicata se email ja existe inativo |
| 3 | Aprovacao de solicitacao | `api/approve-user/route.ts` | Cria duplicata, nao verifica inativos |
| 4 | Aprovacao em massa | `api/approve-user/bulk/route.ts` | Mesmo problema + falta check de usuario existente |
| 5 | Reativacao de usuario | `api/users/[id]/reactivate/route.ts` | Bug: falta filtro `deleted_at`, pode pegar registro errado |
| 6 | Solicitacao de acesso | `api/access-request/route.ts` | Aceita solicitacao mesmo com registro inativo |

## Design da Solucao

### Principio Central
> Quando um email ja existe como inativo na instituicao, o sistema deve **detectar e oferecer reativacao** em vez de criar registro novo. Ao reativar, gera nova senha temporaria e envia email de boas-vindas.

### Decisoes de Review (7 pontos incorporados)

1. **Seguranca: tempPassword removido das respostas API** — Senha temporaria so trafega por email, nunca no body da resposta HTTP. Evita interceptacao por logs, cache ou extensoes de browser.

2. **Logica de reativacao em 3 etapas:**
   - Primeiro: buscar vinculo ATIVO (`deleted_at IS NULL`) — se existe, usuario ja esta vinculado
   - Segundo: buscar vinculo SOFT-DELETED (`deleted_at IS NOT NULL`) — se existe, reativar
   - Terceiro: se nenhum existe, criar novo registro

3. **NAO deletar registros fantasma** — A constraint parcial e suficiente para o role change. Deletar registros soft-deleted destruiria trilha de auditoria. O UPDATE no registro ativo simplesmente muda a coluna `role` sem conflito.

4. **Bulk approval refatorado** — Extrair funcao compartilhada `processApproval()` usada tanto pela aprovacao individual quanto pela em massa, incluindo verificacao de usuario existente e deteccao de inativos.

5. **`reactivateUser()` incondicional** — Sempre seta AMBOS `is_active=true` E `deleted_at=null` em `users` e `user_institutions`, independente do estado atual. Previne estados parciais (ex: users ativo mas user_institutions inativo).

6. **Senha temporaria segura** — Usar `crypto.randomBytes(12).toString('base64url')` em vez de `Math.random().toString(36)`. Atualizar em todos os pontos de geracao de senha.

7. **Consistencia `is_active` vs `deleted_at`** — `reactivateUser()` sempre seta ambos. Considerar CHECK constraint no banco: `deleted_at IS NOT NULL` implica `is_active=false`.

### Comportamento por Fluxo

#### Fluxo 1: Admin cadastra professor (`/api/teachers`)
1. Admin digita email no modal de cadastro
2. API verifica se email ja existe como inativo na instituicao (3 etapas)
3. **Se inativo encontrado:** retorna `{ status: 'inactive_found', user: { name, email, old_role } }`
4. **Frontend mostra modal:** "KARINA ja foi cadastrada como [professor] e esta inativa. Deseja reativa-la como [role selecionada]?"
5. Admin confirma → API chama `reactivateUser()`: seta `deleted_at=null, is_active=true, role=nova_role`
6. `reactivateUser()` gera senha segura + reseta Auth + envia email de boas-vindas
7. API responde `{ success: true }` (sem tempPassword no body)
8. **Se nao encontrado:** fluxo normal (cria novo)

#### Fluxo 2: Aprovacao de solicitacao (`/api/approve-user` e `/bulk`)
1. Ao aprovar, chama `processApproval()` compartilhada
2. `processApproval()` verifica se email ja tem registro no Auth (existingUser)
3. Verifica se tem vinculo inativo na instituicao (3 etapas)
4. **Se inativo encontrado:** chama `reactivateUser()` com role da solicitacao
5. **Se nao encontrado:** fluxo normal (cria user + user_institutions)
6. Resposta sem tempPassword no body

#### Fluxo 3: Mudanca de role (`/api/users/[id]/role`)
1. Constraint parcial ja permite UPDATE sem conflito com soft-deleted
2. Nenhuma mudanca adicional necessaria alem da migration
3. Manter log detalhado do erro caso ainda ocorra (codigo + detalhe do Postgres)

#### Fluxo 4: Reativacao (`/api/users/[id]/reactivate`)
1. Buscar vinculo ativo primeiro (`deleted_at IS NULL`)
2. Se nao existe ativo, buscar soft-deleted (`deleted_at IS NOT NULL`)
3. Reativar: `reactivateUser()` seta ambos `is_active=true` + `deleted_at=null`
4. Gera nova senha segura + envia email de boas-vindas

## Working Phases

### Phase 1 - Correcao do Banco de Dados
> **Agent:** `database-specialist`

**Objetivo:** Corrigir constraint UNIQUE para ignorar soft-deleted.

| # | Task | Status | Deliverable |
|---|------|--------|-------------|
| 1.1 | Migration: DROP constraint `user_institutions_user_id_institution_id_role_key` | pending | SQL |
| 1.2 | Migration: CREATE UNIQUE INDEX parcial `WHERE (deleted_at IS NULL)` | pending | SQL |
| 1.3 | Verificar que nao ha duplicatas ativas que violem a nova constraint | pending | Query |

**Migration SQL:**
```sql
-- 1. Remover constraint que nao considera soft delete
ALTER TABLE user_institutions
  DROP CONSTRAINT user_institutions_user_id_institution_id_role_key;

-- 2. Criar constraint parcial que ignora registros soft-deleted
CREATE UNIQUE INDEX idx_user_institutions_unique_role_active
  ON user_institutions (user_id, institution_id, role)
  WHERE (deleted_at IS NULL);
```

---

### Phase 2 - Correcao das APIs (Backend)
> **Agent:** `bug-fixer`

**Objetivo:** Todos os fluxos lidam corretamente com usuarios inativos.

| # | Task | Status | Deliverable |
|---|------|--------|-------------|
| 2.1 | Criar funcao utilitaria `reactivateUser()` em `lib/utils/reactivate-user.ts` | pending | Codigo |
| 2.2 | Criar funcao `processApproval()` compartilhada para approve-user e bulk | pending | Codigo |
| 2.3 | Atualizar geracao de senha para `crypto.randomBytes(12).toString('base64url')` em todos os pontos | pending | Codigo |
| 2.4 | `api/teachers/route.ts`: Verificacao 3 etapas (ativo/inativo/novo) + retorno `inactive_found` | pending | Codigo |
| 2.5 | `api/approve-user/route.ts`: Usar `processApproval()` com deteccao de inativo | pending | Codigo |
| 2.6 | `api/approve-user/bulk/route.ts`: Usar `processApproval()` (refatorar para incluir check de usuario existente) | pending | Codigo |
| 2.7 | `api/users/[id]/reactivate/route.ts`: Corrigir query 3 etapas + usar `reactivateUser()` | pending | Codigo |
| 2.8 | Remover `tempPassword` de TODAS as respostas API | pending | Codigo |

**Funcao `reactivateUser()`:**
```typescript
import crypto from 'crypto';

async function reactivateUser(serviceClient, {
  userId: string,
  userInstitutionId: string,
  institutionId: string,
  newRole: string,
  reactivatedBy: string
}): Promise<{ success: boolean }> {
  // 1. Gerar senha segura
  const tempPassword = crypto.randomBytes(12).toString('base64url');

  // 2. Reativar user_institutions (SEMPRE setar ambos)
  await serviceClient.from('user_institutions').update({
    is_active: true,
    deleted_at: null,
    role: newRole
  }).eq('id', userInstitutionId);

  // 3. Reativar users (SEMPRE setar ambos)
  await serviceClient.from('users').update({
    is_active: true,
    deleted_at: null,
    deactivation_reason: null
  }).eq('id', userId);

  // 4. Resetar senha no Supabase Auth
  await serviceClient.auth.admin.updateUserById(userId, {
    password: tempPassword
  });

  // 5. Enviar email de boas-vindas com credenciais
  await sendWelcomeEmail({ email, tempPassword, institutionName, role: newRole });

  // 6. Registrar em system_logs
  await serviceClient.from('system_logs').insert({
    user_id: reactivatedBy,
    institution_id: institutionId,
    action: 'user_reactivated',
    entity_type: 'user_institution',
    entity_id: userInstitutionId,
    details: { target_user_id: userId, new_role: newRole }
  });

  return { success: true };
}
```

---

### Phase 3 - Modal de Reativacao (Frontend)
> **Agent:** `frontend-specialist`

**Objetivo:** Admin ve modal de confirmacao quando email ja existe como inativo.

| # | Task | Status | Deliverable |
|---|------|--------|-------------|
| 3.1 | Componente `ReactivateUserModal` com info do usuario inativo + select de role | pending | Componente |
| 3.2 | Integrar no `TeacherModal`: ao verificar email (onBlur), detectar inativo | pending | Codigo |
| 3.3 | Toast de sucesso: "Usuario reativado. Email de boas-vindas enviado." | pending | Codigo |

**Fluxo do modal:**
1. Admin digita email no TeacherModal
2. On blur do campo email, chama API para verificar
3. Se inativo encontrado: abre ReactivateUserModal
   - Mostra: nome, email, role anterior, data de desativacao
   - Select para nova role (professor/admin/admin_viewer)
   - Botao "Reativar Usuario"
4. Ao confirmar: chama API de reativacao
5. Toast: "Usuario reativado com sucesso. Email de boas-vindas enviado."

---

### Phase 4 - Validacao e Deploy
> **Agent:** `test-writer`

**Objetivo:** Validar todos os cenarios de conflito.

| # | Task | Status | Deliverable |
|---|------|--------|-------------|
| 4.1 | Testar: admin muda role com registro fantasma (caso KARINA) | pending | Teste |
| 4.2 | Testar: cadastro de professor com email inativo → modal reativacao | pending | Teste |
| 4.3 | Testar: aprovacao de solicitacao com email inativo → reativa | pending | Teste |
| 4.4 | Testar: reativacao gera nova senha + envia email (sem senha no response body) | pending | Teste |
| 4.5 | Testar: constraint bloqueia duplicatas ativas | pending | Teste |
| 4.6 | Testar: bulk approval com usuario existente inativo | pending | Teste |
| 4.7 | Build passando + deploy | pending | Build |

## Rollback Plan

### Migration
```sql
DROP INDEX IF EXISTS idx_user_institutions_unique_role_active;
ALTER TABLE user_institutions
  ADD CONSTRAINT user_institutions_user_id_institution_id_role_key
  UNIQUE (user_id, institution_id, role);
```

### Codigo
- Reverter commits de API e frontend
- Funcionalidade existente continua funcionando (apenas perde deteccao de inativos)

## Success Criteria
1. TATIANA consegue alterar KARINA de admin para professor sem erro
2. Admin cadastra email inativo → modal pergunta se quer reativar
3. Reativacao gera nova senha segura e envia email de boas-vindas
4. tempPassword NUNCA aparece em response bodies
5. Aprovacao (individual e bulk) com email inativo reativa automaticamente
6. Constraint bloqueia duplicatas ativas mas permite soft-deleted
7. `is_active` e `deleted_at` sempre consistentes
8. Build passando sem erros
