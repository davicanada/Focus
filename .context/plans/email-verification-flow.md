---
status: completed
generated: 2026-01-24
agents:
  - type: "feature-developer"
    role: "Implementar fluxo de verificação de email"
  - type: "test-writer"
    role: "Validar com testes E2E"
phases:
  - id: "phase-1"
    name: "Análise e Migração"
    prevc: "P"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Corrigir Fluxo de Verificação de Email

> Implementar verificação de email ANTES de notificar admins/master sobre novas solicitações

## Task Snapshot
- **Primary goal:** Garantir que apenas emails verificados gerem notificações para admins/master
- **Success signal:** Fluxo completo funcionando com verificação por email
- **Key references:**
  - `app/api/access-request/route.ts` - Criação de solicitação
  - `app/api/verify-email/route.ts` - Nova API de verificação (a criar)
  - `lib/email/sendVerificationEmail.ts` - Funções de email

## Fluxo Correto (Novo)

```
Usuário preenche formulário de solicitação
    ↓
Salva no banco com status = 'pending_verification'
    ↓
Gera token único + envia email de verificação
    "Confirme seu email clicando no link abaixo"
    ↓
Usuário clica no link de verificação
    ↓
API /api/verify-email valida o token
    ↓
Marca email_verified = true, status = 'pending'
    ↓
AGORA envia notificações para:
    - Admins da instituição (se professor/admin_existing)
    - Master (sempre)
```

## Problema Anterior

O fluxo antigo enviava notificações IMEDIATAMENTE após a solicitação, sem verificar se o email era válido. Isso permitia:
- Spam de solicitações com emails falsos
- Notificações desnecessárias para admins/master
- Nenhuma garantia de que o solicitante é real

## Working Phases

### Phase 1 - Análise e Migração (P) - COMPLETO

**Alterações no banco (via MCP Supabase):**
- [x] Coluna `email_verified` (boolean, default false)
- [x] Coluna `verification_token` (varchar 255)
- [x] Coluna `verification_sent_at` (timestamptz)
- [x] Coluna `email_verified_at` (timestamptz)
- [x] Novo status `pending_verification` no check constraint
- [x] Índice em `verification_token` para buscas rápidas

### Phase 2 - Implementação (E) - COMPLETO

**Arquivos modificados:**

1. **`lib/email/sendVerificationEmail.ts`**: ✅
   - [x] Nova função `sendEmailVerificationLink(email, name, token)`
   - [x] Template com link de verificação com botão verde
   - [x] Link aponta para `/api/verify-email?token=XXX`

2. **`app/api/access-request/route.ts`**: ✅
   - [x] Gera token único (`crypto.randomUUID()`)
   - [x] Salva com status = 'pending_verification'
   - [x] Envia email de verificação (NÃO notificações)
   - [x] Removido envio de notificações deste endpoint

3. **`app/api/verify-email/route.ts`** (NOVO): ✅
   - [x] Recebe token via query string
   - [x] Valida token no banco
   - [x] Marca email_verified = true, status = 'pending'
   - [x] Envia notificações para admins/master
   - [x] Redireciona para página de sucesso

4. **`app/verify-email/page.tsx`** (NOVO): ✅
   - [x] Página de confirmação com 4 estados: success, already_verified, already_processed, error
   - [x] Mensagem explicando próximos passos
   - [x] Design responsivo com ícones

### Phase 3 - Validação (V) - PENDENTE

**Testes:**
- [ ] E2E: Solicitação cria registro com status 'pending_verification'
- [ ] E2E: Email de verificação é enviado
- [ ] E2E: Clicar no link muda status para 'pending'
- [ ] E2E: Notificações SÓ são enviadas após verificação
- [ ] E2E: Token inválido retorna erro
- [ ] E2E: Token já usado retorna erro

## Detalhes Técnicos

### Geração de Token
```typescript
const verificationToken = crypto.randomUUID();
```

### Link de Verificação
```
https://seu-dominio.com/api/verify-email?token=UUID
```

### Expiração (opcional futuro)
Tokens poderiam expirar após 24h, mas não implementaremos isso na primeira versão.

## Evidence

**Migration aplicada:**
- `add_email_verification_to_access_requests`

**Arquivos a modificar:**
- `lib/email/sendVerificationEmail.ts`
- `app/api/access-request/route.ts`
- `app/api/verify-email/route.ts` (novo)
- `app/verify-email/page.tsx` (novo)
