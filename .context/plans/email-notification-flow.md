---
status: completed
generated: 2026-01-24
agents:
  - type: "feature-developer"
    role: "Implementar fluxo de emails"
  - type: "test-writer"
    role: "Validar com testes E2E"
phases:
  - id: "phase-1"
    name: "Analise"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Implementar Fluxo de Notificacoes por Email

> Enviar emails de confirmacao ao solicitante e notificacao aos admins/master quando novas solicitacoes de acesso sao criadas

## Task Snapshot
- **Primary goal:** Implementar envio de emails quando solicitacoes de acesso sao criadas
- **Success signal:** Emails enviados corretamente para solicitante, admins e master
- **Key references:**
  - `app/api/access-request/route.ts` - API modificada
  - `lib/email/sendVerificationEmail.ts` - Funcoes de email

## Fluxo Implementado

```
Usuario faz solicitacao
    ↓
Salva no banco
    ↓
Email 1: Confirmacao para o SOLICITANTE ✅
    "Sua solicitacao foi recebida e esta em analise"
    ↓
Email 2: Notificacao para REVISORES ✅
    - Se professor/admin_existing: admins da instituicao + master
    - Se admin_new: apenas o master
    "Nova solicitacao de [Nome] aguardando aprovacao"
```

## Working Phases

### Phase 1 - Analise (P) - COMPLETO

**Componentes identificados:**
- `sendEmail()` - Funcao base para envio via Gmail SMTP
- `sendWelcomeEmail()` - Email de boas-vindas (usado na aprovacao)
- `sendAccessRequestNotification()` - Ja existia para notificar revisores
- Faltava: `sendRequestConfirmationEmail()` para confirmar ao solicitante

### Phase 2 - Implementacao (E) - COMPLETO

**Alteracoes realizadas:**

1. **`lib/email/sendVerificationEmail.ts`** (linhas 411-472):
   - Nova funcao `sendRequestConfirmationEmail()`
   - Envia email profissional com design Focus
   - Mostra tipo de acesso solicitado e nome da instituicao

2. **`app/api/access-request/route.ts`** (linhas 113-195):
   - Importou funcoes de email
   - Apos salvar solicitacao:
     - Busca nome da instituicao (se existente)
     - Envia `sendRequestConfirmationEmail()` ao solicitante
     - Se admin_new: busca masters e envia `sendAccessRequestNotification()`
     - Se professor/admin_existing: busca admins da instituicao + masters e envia notificacao
   - Tratamento de erro nao-bloqueante (emails falham silenciosamente)

### Phase 3 - Validacao (V) - COMPLETO

**Resultados:**
- [x] Build passa sem erros
- [x] Testes E2E passando (2/2 para fluxo professor)
- [x] Credenciais Gmail configuradas (`GMAIL_USER`, `GMAIL_APP_PASS`)
- [x] Logs confirmam envio: `Confirmation email sent to requester:` e `Notification email sent to reviewer:`

## Detalhes Tecnicos

### Query para buscar admins da instituicao
```typescript
// 1. Buscar user_ids dos admins
const { data: adminRelations } = await supabase
  .from('user_institutions')
  .select('user_id')
  .eq('institution_id', institution_id)
  .eq('role', 'admin');

// 2. Buscar dados dos usuarios
const { data: admins } = await supabase
  .from('users')
  .select('email, full_name')
  .in('id', adminUserIds)
  .eq('is_active', true);
```

### Query para buscar master
```typescript
const { data: masterUsers } = await supabase
  .from('users')
  .select('email, full_name')
  .eq('is_master', true)
  .eq('is_active', true);
```

## Evidence

**Arquivos modificados:**
- `lib/email/sendVerificationEmail.ts` - Nova funcao `sendRequestConfirmationEmail()`
- `app/api/access-request/route.ts` - Integracao de envio de emails
