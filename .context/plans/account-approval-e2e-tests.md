---
status: active
generated: 2026-01-24
agents:
  - type: "test-writer"
    role: "Criar testes E2E com Playwright"
  - type: "bug-fixer"
    role: "Corrigir problemas encontrados nos testes"
phases:
  - id: "phase-1"
    name: "Analise e Preparacao"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao dos Testes"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao e Documentacao"
    prevc: "V"
---

# Testes E2E para Fluxo de Aprovacao de Contas e Instituicoes

> Implementar testes E2E com Playwright para validar todo o fluxo de aprovacao de novas contas e instituicoes, incluindo verificacao de emails do Supabase Auth e Resend

## Task Snapshot
- **Primary goal:** Validar que o fluxo completo de solicitacao e aprovacao de contas funciona corretamente
- **Success signal:** Todos os testes E2E passando, emails sendo enviados corretamente
- **Key references:**
  - `app/api/access-request/route.ts` - API de solicitacao de acesso
  - `app/api/approve-user/route.ts` - API de aprovacao de usuarios
  - `lib/email/sendVerificationEmail.ts` - Envio de emails com Resend
  - `components/auth/AccessRequestModal.tsx` - Modal de solicitacao
  - `app/master/page.tsx` - Painel master para aprovacao

## Arquitetura Atual do Fluxo

### 1. Tipos de Solicitacao
```
admin_new     -> Nova instituicao + administrador (com endereco do Google Places)
admin_existing -> Administrador para instituicao existente
professor     -> Professor para instituicao existente
```

### 2. Fluxo de Aprovacao
```
Usuario solicita acesso
    |
    v
POST /api/access-request (cria registro com status='pending')
    |
    v
Master ve solicitacao no painel (/master)
    |
    v
Master aprova ou rejeita
    |
    v
POST /api/approve-user
    |
    +--[Se admin_new]--> Cria instituicao
    |
    +--[Todos]--------> Cria usuario no Supabase Auth
    |                   Cria registro em 'users'
    |                   Cria registro em 'user_institutions'
    |
    v
Envia email de boas-vindas com senha temporaria (Resend)
```

### 3. Status Atual dos Emails

| Componente | Status | Observacao |
|------------|--------|------------|
| Supabase Auth | Configurado | `email_confirm: true` (auto-confirma, nao envia email) |
| Resend Welcome Email | **DESATIVADO** | Codigo comentado em `lib/email/sendVerificationEmail.ts` |
| Notificacao de Nova Solicitacao | **NAO IMPLEMENTADO** | TODO no codigo |

## Plano de Testes E2E

### Fase 1 - Preparacao

#### 1.1 Verificar Configuracao do Resend
- [ ] Verificar se `RESEND_API_KEY` esta configurada no `.env.local`
- [ ] Ativar envio de emails (descomentar codigo)
- [ ] Configurar dominio verificado no Resend (ou usar modo sandbox)

#### 1.2 Criar Dados de Teste
- [ ] Criar emails de teste que nao existam no banco
- [ ] Preparar dados de instituicao ficticia

### Fase 2 - Implementacao dos Testes

#### 2.1 Testes de Solicitacao de Acesso
```typescript
// e2e/access-request.spec.ts

test('Solicitar acesso como professor para instituicao existente')
test('Solicitar acesso como admin para instituicao existente')
test('Solicitar acesso como admin para nova instituicao')
test('Rejeitar solicitacao com email duplicado')
test('Rejeitar solicitacao com email ja cadastrado')
```

#### 2.2 Testes de Aprovacao
```typescript
// e2e/account-approval.spec.ts

test('Master aprova solicitacao de professor')
test('Master aprova solicitacao de admin existente')
test('Master aprova solicitacao de admin nova instituicao')
test('Master rejeita solicitacao com motivo')
test('Usuario aprovado consegue fazer login')
```

#### 2.3 Testes de Email
```typescript
// e2e/email-notifications.spec.ts

test('Email de boas-vindas enviado apos aprovacao')
test('Email contem senha temporaria')
test('Email contem link para o sistema')
// Nota: Testar emails requer integracao com API do Resend ou mock
```

### Fase 3 - Validacao

#### 3.1 Verificar no Supabase
- [ ] Logs de autenticacao
- [ ] Registros criados corretamente
- [ ] RLS funcionando

#### 3.2 Verificar Emails
- [ ] Logs do Resend (ou console.log se mock)
- [ ] Conteudo do email correto

## Arquivos a Criar/Modificar

### Novos Arquivos
```
e2e/
  access-request.spec.ts    # Testes de solicitacao
  account-approval.spec.ts  # Testes de aprovacao
```

### Arquivos a Modificar
```
lib/email/sendVerificationEmail.ts  # Ativar Resend (descomentar)
app/api/access-request/route.ts     # Implementar notificacao para master
```

## Dependencias Externas

### Supabase
- **Projeto:** jtxfqsojicjtabtslqvf
- **Tabelas envolvidas:** access_requests, users, user_institutions, institutions
- **Auth:** Criacao de usuarios via admin API

### Resend
- **Status:** Instalado (`resend ^6.8.0`)
- **API Key:** Precisa configurar `RESEND_API_KEY`
- **Dominio:** Precisa verificar dominio ou usar sandbox

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Rate limiting do Resend | Usar modo sandbox para testes |
| Emails indo para spam | Verificar dominio no Resend |
| Testes flaky por timing | Usar `waitFor` e retries |
| Dados de teste poluindo banco | Limpar dados apos cada teste |

## Criterios de Sucesso

- [x] Testes de solicitacao de acesso passando
- [x] Testes de aprovacao passando
- [x] Email de boas-vindas sendo enviado (logado no console)
- [x] Usuario aprovado consegue fazer login
- [x] Nenhum erro no console durante os testes
- [x] Build passando

## Comandos Uteis

```bash
# Rodar testes de aprovacao
npx playwright test e2e/account-approval.spec.ts

# Rodar com UI para debug
npx playwright test e2e/account-approval.spec.ts --ui

# Ver logs do Resend
# Dashboard: https://resend.com/emails
```

## Resultados dos Testes (24/01/2026)

### Testes Passando: 8/8

| Teste | Status | Observacao |
|-------|--------|------------|
| Create access request as professor | PASSOU | Solicitacao criada com status pending |
| Create access request as admin_existing | PASSOU | Vinculo com instituicao existente |
| Create access request for new institution | PASSOU | Dados de endereco salvos corretamente |
| Reject duplicate pending request | PASSOU | Erro retornado para email duplicado |
| Master approve professor + login | PASSOU | Usuario criado e login funcionou |
| Master reject with reason | PASSOU | Status e motivo atualizados |
| Approval of admin_new creates institution | PASSOU | Nova instituicao criada |
| Verify welcome email is logged | PASSOU | Email logado no console |

### Logs do Servidor

Os emails estao sendo processados corretamente:
```
Email would be sent: {
  to: 'test.xxx@example.com',
  subject: 'Bem-vindo ao Focus - Suas credenciais de acesso',
  html: '... conteudo com nome, email e senha ...'
}
Welcome email sent to: test.xxx@example.com
```

### Status dos Emails

| Componente | Status | Acao Necessaria |
|------------|--------|-----------------|
| Supabase Auth | OK | `email_confirm: true` (auto-confirma) |
| Resend Welcome Email | MOCK | Ativar descomentar codigo em `lib/email/sendVerificationEmail.ts` |
| Notificacao Nova Solicitacao | TODO | Implementar em `app/api/access-request/route.ts` |

### Proximos Passos

1. **Ativar Resend (opcional):**
   - Descomentar linhas 4-7 e 22-42 em `lib/email/sendVerificationEmail.ts`
   - Configurar `RESEND_API_KEY` no `.env.local`
   - Verificar dominio no Resend ou usar sandbox

2. **Implementar notificacao de novas solicitacoes:**
   - Criar funcao para notificar master/admin quando nova solicitacao chega
   - Usar `sendAccessRequestNotification()` ja preparada

**Status: FASE 2 CONCLUIDA - Testes E2E implementados e passando**
