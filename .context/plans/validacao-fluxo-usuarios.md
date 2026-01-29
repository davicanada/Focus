---
status: active
generated: 2026-01-24
agents:
  - type: "test-writer"
    role: "Criar testes E2E abrangentes para todo o fluxo"
  - type: "security-auditor"
    role: "Verificar seguranca da autenticacao e emails"
  - type: "backend-specialist"
    role: "Validar integracao Supabase Auth e Resend"
phases:
  - id: "phase-1"
    name: "Auditoria e Descoberta"
    prevc: "P"
  - id: "phase-2"
    name: "Correcoes e Testes"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao Final"
    prevc: "V"
---

# Validacao do Fluxo de Confirmacao de Usuarios e Instituicoes

> Validar e testar o fluxo completo de solicitacao de acesso, aprovacao de usuarios, criacao de instituicoes e envio de emails

## Task Snapshot
- **Primary goal:** Garantir que todo o fluxo de onboarding de usuarios funcione corretamente end-to-end
- **Success signal:** Todos os testes E2E passando, emails sendo enviados (ou logados em dev), usuarios conseguindo logar apos aprovacao
- **Key references:**
  - `app/api/access-request/route.ts` - Criacao de solicitacoes
  - `app/api/approve-user/route.ts` - Aprovacao/rejeicao de usuarios
  - `lib/email/sendVerificationEmail.ts` - Envio de emails via Resend
  - `e2e/account-approval.spec.ts` - Testes E2E existentes

## Componentes do Sistema

### 1. Tabelas do Banco de Dados (Supabase)

| Tabela | Registros | Funcao |
|--------|-----------|--------|
| `access_requests` | 32 | Solicitacoes de acesso pendentes/processadas |
| `users` | 17 | Usuarios do sistema |
| `user_institutions` | 16 | Relacionamento usuario-instituicao com role |
| `institutions` | 5 | Instituicoes cadastradas |

### 2. APIs Envolvidas

| Endpoint | Metodo | Funcao |
|----------|--------|--------|
| `/api/access-request` | POST | Criar nova solicitacao de acesso |
| `/api/access-request` | GET | Listar solicitacoes pendentes |
| `/api/approve-user` | POST | Aprovar ou rejeitar solicitacao |
| `/api/teachers` | POST | Criar professor diretamente (admin) |

### 3. Integracao Supabase Auth

- **Criacao de usuario:** `supabase.auth.admin.createUser()` com `email_confirm: true`
- **Login:** `supabase.auth.signInWithPassword()`
- **Service Role:** Usado para operacoes administrativas
- **Status:** ✅ Funcionando (logs mostram user_signedup e login bem-sucedidos)

### 4. Integracao Resend (Email)

- **SDK:** `resend` package instalado
- **Funcao:** `sendWelcomeEmail(email, name, tempPassword)`
- **Status Atual:** Modo sandbox (erro 403 - precisa dominio verificado)
- **Workaround:** Emails sendo logados no console em desenvolvimento

## Problemas Identificados

### P1: Resend em Modo Sandbox
**Severidade:** Media (nao bloqueia desenvolvimento)
**Descricao:** O Resend retorna erro 403 porque so pode enviar para o email do proprietario da conta em modo sandbox.
```
Resend error: {
  statusCode: 403,
  name: 'validation_error',
  message: 'You can only send testing emails to your own email address'
}
```
**Solucao:**
- Para producao: Verificar dominio em resend.com/domains
- Para desenvolvimento: Manter modo mock com log no console

### P2: Notificacao ao Master Nao Implementada
**Severidade:** Baixa
**Descricao:** TODO no codigo - master nao recebe email quando nova solicitacao e criada
**Arquivo:** `app/api/access-request/route.ts`

### P3: Rate Limiting Nao Implementado
**Severidade:** Media
**Descricao:** Nao ha protecao contra spam de solicitacoes de acesso
**Risco:** Possivel abuso do endpoint de solicitacao

## Fluxo Completo a Validar

```
1. SOLICITACAO (Usuario Anonimo)
   |-- Acessa pagina de login
   |-- Clica em "Solicitar Acesso"
   |-- Preenche formulario (AccessRequestModal)
   |   |-- Tipo: professor | admin_existing | admin_new
   |   |-- Dados pessoais (nome, email, telefone)
   |   +-- Instituicao (existente ou nova com endereco)
   +-- POST /api/access-request
       |-- Valida duplicatas
       |-- Valida email unico
       +-- Insere em access_requests (status: pending)

2. REVISAO (Master)
   |-- Acessa /master
   |-- Visualiza solicitacoes pendentes
   +-- Para cada solicitacao:
       |-- APROVAR: POST /api/approve-user {action: 'approve'}
       |   |-- Cria instituicao (se admin_new)
       |   |-- Cria usuario no Supabase Auth
       |   |-- Cria registro em users
       |   |-- Cria registro em user_institutions
       |   |-- Atualiza access_request (status: approved)
       |   +-- Envia email de boas-vindas
       +-- REJEITAR: POST /api/approve-user {action: 'reject'}
           +-- Atualiza access_request (status: rejected, reason)

3. PRIMEIRO LOGIN (Usuario Aprovado)
   |-- Recebe email com credenciais temporarias
   |-- Acessa pagina de login
   |-- Faz login com senha temporaria
   +-- (Opcional) Altera senha
```

## Testes E2E Existentes

**Arquivo:** `e2e/account-approval.spec.ts`

| # | Teste | Status |
|---|-------|--------|
| 1 | Criar solicitacao professor para instituicao existente | ✅ |
| 2 | Criar solicitacao admin para instituicao existente | ✅ |
| 3 | Criar solicitacao admin para nova instituicao | ✅ |
| 4 | Rejeitar solicitacao duplicada | ✅ |
| 5 | Master aprova professor e usuario consegue logar | ✅ |
| 6 | Master rejeita com motivo | ✅ |
| 7 | Aprovacao de admin_new cria instituicao | ✅ |
| 8 | Email de boas-vindas e logado na aprovacao | ✅ |

## Testes Adicionais Implementados

### T1: Validacao de Campos Obrigatorios
- [x] Testar POST sem email
- [x] Testar POST sem nome
- [x] Testar POST sem request_type
- [x] Testar POST com email vazio

### T2: Validacao de Formato
- [ ] Email invalido (nao implementado - API aceita qualquer formato)
- [ ] Telefone formato invalido (nao implementado - campo opcional)
- [ ] Estado com mais de 2 caracteres (nao implementado - campo opcional)

### T3: Seguranca
- [x] Tentar aprovar request inexistente
- [x] Tentar aprovar request ja processada
- [x] Tentar aprovar sem request_id
- [x] Tentar aprovar sem reviewer_id
- [x] Tentar aprovar com action invalida

### T4: Fluxo UI Completo
- [ ] Abrir modal de solicitacao
- [ ] Preencher campos
- [ ] Submeter formulario
- [ ] Verificar mensagem de sucesso

### T5: Rollback em Caso de Falha
- [ ] Simular falha apos criar usuario Auth
- [ ] Verificar que usuario Auth e deletado
- [ ] Verificar que access_request permanece pending

## Criterios de Sucesso

- [x] Todos os 8 testes existentes passando
- [x] Novos testes de validacao passando (4 testes T1)
- [x] Novos testes de seguranca passando (5 testes T3)
- [x] Build passando (apenas warnings, sem erros)
- [x] Documentacao atualizada

**Total: 17 testes E2E passando** ✅

## Variaveis de Ambiente Necessarias

```bash
# Supabase (Obrigatorio)
NEXT_PUBLIC_SUPABASE_URL=https://jtxfqsojicjtabtslqvf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Admin operations

# Email (Opcional em dev)
RESEND_API_KEY=re_...  # Para envio real de emails

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Working Phases

### Phase 1 - Auditoria e Descoberta (P) ✅

**Steps**
1. [x] Mapear todos os componentes do fluxo
2. [x] Verificar status do Supabase Auth (funcionando)
3. [x] Verificar status do Resend (modo sandbox)
4. [x] Analisar logs do Supabase (ultimas 24h)
5. [x] Identificar gaps nos testes existentes
6. [x] Executar testes existentes e documentar resultados

### Phase 2 - Correcoes e Testes (E) ✅

**Steps**
1. [x] Adicionar testes de validacao de campos obrigatorios (4 testes)
2. [x] Adicionar testes de seguranca (5 testes)
3. [x] Verificar cobertura de todos os cenarios (17 testes passando)

### Phase 3 - Validacao Final (V) ✅

**Steps**
1. [x] Executar suite completa de testes (17/17 passando)
2. [x] Verificar build de producao (sucesso, apenas warnings)
3. [x] Atualizar CLAUDE.md com resultados
4. [x] Documentar evidencias de sucesso

## Logs do Supabase Auth (Ultimas 24h)

Operacoes recentes confirmadas:
- ✅ Login via password funcionando
- ✅ Criacao de usuario via service_role funcionando
- ✅ Usuarios de teste criados e logando com sucesso
- ✅ Nenhum erro de autenticacao nos logs

## Evidence & Follow-up

Artifacts a coletar:
- [ ] Resultados dos testes E2E
- [ ] Screenshots do fluxo funcionando
- [ ] Logs de email (console em dev)
