---
status: completed
generated: 2026-01-25
completed: 2026-01-24
agents:
  - type: "feature-developer"
    role: "Implementar fluxo completo de recuperação de senha"
  - type: "test-writer"
    role: "Criar testes E2E para validar fluxo"
phases:
  - id: "phase-1"
    name: "Planejamento"
    prevc: "P"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Fluxo de Esqueci Minha Senha

> Implementar funcionalidade completa de recuperação de senha com email e redefinição

## Task Snapshot
- **Primary goal:** Usuário deve conseguir redefinir sua senha via email
- **Success signal:** Fluxo completo funcionando - solicita, recebe email, redefine senha, loga
- **Key references:**
  - `components/auth/LoginForm.tsx` - Formulário de login (adicionar botão)
  - `lib/email/sendVerificationEmail.ts` - Funções de email existentes
  - `app/api/forgot-password/route.ts` - Nova API (a criar)
  - `app/reset-password/page.tsx` - Nova página (a criar)

## Fluxo Completo

```
Landing Page (LoginForm)
    ↓
Usuário clica "Esqueci minha senha"
    ↓
Modal abre → Digita email
    ↓
POST /api/forgot-password
    ↓
Gera token + salva no banco
    ↓
Envia email com link de reset
    ↓
Usuário clica no link do email
    ↓
GET /reset-password?token=XXX
    ↓
Página de redefinição de senha
    ↓
POST /api/reset-password
    ↓
Atualiza senha no Supabase Auth
    ↓
Redireciona para login
```

## Working Phases

### Phase 1 - Planejamento (P) - COMPLETO ✅

**Componentes necessários:**
1. Modal de "Esqueci minha senha" (`ForgotPasswordModal.tsx`)
2. API de solicitação (`/api/forgot-password`)
3. Página de redefinição (`/reset-password`)
4. API de redefinição (`/api/reset-password`)
5. Funções de email para reset

**Tabela para tokens:**
- Adicionadas colunas `reset_token` e `reset_token_expires` na tabela `users`
- Migration aplicada via Supabase MCP

### Phase 2 - Implementação (E) - COMPLETO ✅

**Tarefa 1: Botão no LoginForm** ✅
- Adicionado link "Esqueci minha senha" abaixo de "Solicitar acesso"
- Callback `onForgotPassword` para abrir modal

**Tarefa 2: ForgotPasswordModal** ✅
- Input de email com validação
- Botão de enviar com loading state
- Estados de sucesso e erro
- Arquivo: `components/auth/ForgotPasswordModal.tsx`

**Tarefa 3: API /api/forgot-password** ✅
- Gera token único com crypto.randomUUID()
- Salva token e expiração (1 hora) na tabela users
- Envia email com link de reset
- Retorna sempre sucesso (previne enumeração de emails)
- Arquivo: `app/api/forgot-password/route.ts`

**Tarefa 4: Página /reset-password** ✅
- Recebe token via URL
- Valida token com API GET
- Formulário para nova senha com confirmação
- Validação de força (mínimo 8 caracteres)
- Toggle para mostrar/esconder senha
- Arquivo: `app/reset-password/page.tsx`

**Tarefa 5: API /api/reset-password** ✅
- GET: Valida token e expiração
- POST: Atualiza senha via `supabase.auth.admin.updateUserById()`
- Limpa token após uso
- Arquivo: `app/api/reset-password/route.ts`

**Tarefa 6: Email Template** ✅
- Design consistente com outros emails (header gradiente azul)
- Botão verde "Redefinir Senha"
- Aviso de expiração (1 hora)
- Função: `sendPasswordResetEmail()` em `lib/email/sendVerificationEmail.ts`

### Phase 3 - Validação (V) - COMPLETO ✅

**Testes E2E (16/16 passando):**
- [x] Modal abre ao clicar "Esqueci minha senha"
- [x] Mostra erro para email vazio
- [x] Mostra erro para email inválido (sem ponto no domínio)
- [x] API retorna sucesso para email válido (previne enumeração)
- [x] API retorna sucesso para email inexistente (previne enumeração)
- [x] Mostra mensagem de sucesso após enviar email válido
- [x] Página de reset mostra "Link Inválido" para token ruim
- [x] Página de reset mostra "Link Inválido" sem token

**Arquivo de testes:** `e2e/forgot-password.spec.ts`

## Evidence

**Arquivos criados:**
- `components/auth/ForgotPasswordModal.tsx`
- `app/api/forgot-password/route.ts`
- `app/api/reset-password/route.ts`
- `app/reset-password/page.tsx`
- `app/api/setup/migrate-reset-password/route.ts`
- `e2e/forgot-password.spec.ts`

**Arquivos modificados:**
- `components/auth/LoginForm.tsx` - Adicionado `onForgotPassword` prop e botão
- `app/page.tsx` - Adicionado estado e modal ForgotPasswordModal
- `lib/email/sendVerificationEmail.ts` - Adicionada função `sendPasswordResetEmail()`

**Migration aplicada:**
- `add_reset_token_columns` - Adiciona `reset_token` e `reset_token_expires` à tabela users

## Resultado Final

Funcionalidade completa de "Esqueci minha senha" implementada e testada:
- Build passando
- 16 testes E2E passando (chromium + mobile)
- Email de reset enviado via Nodemailer/Gmail SMTP
- Token expira em 1 hora
- Previne enumeração de emails (sempre retorna sucesso)
