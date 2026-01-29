---
status: ready
generated: 2026-01-23
agents:
  - type: "feature-developer"
    role: "Implementar componentes e logica de cadastro de professores"
  - type: "frontend-specialist"
    role: "Criar interface do formulario e modal de cadastro"
  - type: "database-specialist"
    role: "Garantir integridade das operacoes no Supabase"
  - type: "security-auditor"
    role: "Validar fluxo de criacao de usuarios e permissoes RLS"
docs:
  - "project-overview.md"
  - "architecture.md"
  - "security.md"
phases:
  - id: "phase-1"
    name: "Analise e Correcoes no Fluxo Existente"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao do Cadastro Direto pelo Admin"
    prevc: "E"
  - id: "phase-3"
    name: "Testes e Validacao"
    prevc: "V"
---

# Plano: Cadastro de Professores

> Implementar duas formas de adicionar professores ao sistema:
> 1. **Solicitacao de acesso** (professor solicita, master/admin aprova) - JA EXISTE
> 2. **Cadastro direto pelo admin** (admin cadastra diretamente) - A IMPLEMENTAR

## Task Snapshot

- **Primary goal:** Garantir que existam duas formas funcionais de adicionar professores ao sistema
- **Success signal:** Professor consegue solicitar acesso E admin consegue cadastrar diretamente
- **Key references:**
  - Modal de solicitacao: `components/auth/AccessRequestModal.tsx`
  - API de solicitacao: `app/api/access-request/route.ts`
  - API de aprovacao: `app/api/approve-user/route.ts`
  - Painel Master: `app/master/page.tsx`
  - Pagina de professores: `app/admin/professores/page.tsx`

---

## Status Atual do Sistema

### FLUXO 1: Solicitacao de Acesso (JA IMPLEMENTADO)

```
Professor acessa tela de login
        ↓
Clica em "Solicitar Acesso"
        ↓
Preenche: nome, email, telefone, seleciona instituicao
        ↓
POST /api/access-request → cria registro com status 'pending'
        ↓
Master acessa painel → aba "Solicitacoes"
        ↓
Clica "Aprovar" → POST /api/approve-user
        ↓
Sistema cria usuario no Auth + users + user_institutions
        ↓
[TODO] Envia email de boas-vindas com senha temporaria
```

**Componentes existentes:**
| Arquivo | Status | Descricao |
|---------|--------|-----------|
| `components/auth/AccessRequestModal.tsx` | OK | Modal completo com validacoes |
| `app/api/access-request/route.ts` | OK | POST cria, GET lista |
| `app/api/approve-user/route.ts` | PARCIAL | Aprova/rejeita, mas TODO no email |
| `app/master/page.tsx` | OK | Aba "Solicitacoes" com aprovar/rejeitar |

**O que falta no Fluxo 1:**
- [ ] Enviar email de boas-vindas com senha temporaria (linha 179-180 do approve-user)
- [ ] Enviar notificacao ao master quando nova solicitacao chega (linha 112-113 do access-request)

---

### FLUXO 2: Cadastro Direto pelo Admin (A IMPLEMENTAR)

```
Admin acessa painel → "Professores"
        ↓
Clica em "Adicionar Professor"
        ↓
Preenche: nome, email
        ↓
POST /api/teachers → cria usuario diretamente
        ↓
Sistema cria usuario no Auth + users + user_institutions
        ↓
Envia email de boas-vindas
        ↓
Professor aparece na lista
```

**O que falta no Fluxo 2:**
- [ ] API route `app/api/teachers/route.ts`
- [ ] Modal `components/teachers/TeacherModal.tsx`
- [ ] Botao "Adicionar Professor" na pagina
- [ ] Botao de editar em cada linha

---

## Contexto do Banco de Dados (Supabase)

### Tabelas Envolvidas

#### `users`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK, referencia auth.users.id |
| email | varchar | Email unico do usuario |
| full_name | varchar | Nome completo |
| is_active | boolean | Se o usuario esta ativo |
| is_master | boolean | Se e super admin |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

#### `user_institutions`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para users.id |
| institution_id | uuid | FK para institutions.id |
| role | varchar | 'admin' ou 'professor' (CHECK constraint) |
| is_active | boolean | Se o vinculo esta ativo |
| created_at | timestamptz | Data de criacao |

#### `access_requests`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| email | varchar | Email do solicitante |
| full_name | varchar | Nome completo |
| phone | varchar | Telefone |
| request_type | varchar | 'admin_new', 'admin_existing', 'professor' |
| institution_id | uuid | FK (para instituicao existente) |
| status | varchar | 'pending', 'approved', 'rejected' |
| reviewed_by | uuid | FK para users.id |
| reviewed_at | timestamptz | Data da revisao |

---

## Working Phases

### Phase 1 — Correcoes no Fluxo Existente (P)

**Objetivo:** Garantir que o fluxo de solicitacao de acesso funciona completamente.

**Steps:**

1. [ ] Implementar envio de email de boas-vindas em `app/api/approve-user/route.ts`
   - Usar funcao `sendWelcomeEmail` de `lib/email/sendVerificationEmail.ts`
   - Incluir senha temporaria no email

2. [ ] Implementar notificacao ao master em `app/api/access-request/route.ts`
   - Usar funcao `sendAccessRequestNotification`
   - Enviar para todos os usuarios master

3. [ ] Testar fluxo completo:
   - Professor solicita acesso
   - Master recebe notificacao (email)
   - Master aprova
   - Professor recebe email com senha
   - Professor faz login

**Codigo para adicionar em approve-user (linha 179):**
```typescript
// Enviar email de boas-vindas
try {
  await sendWelcomeEmail({
    email: accessRequest.email,
    full_name: accessRequest.full_name,
    tempPassword,
  });
} catch (emailError) {
  console.error('Error sending welcome email:', emailError);
  // Nao falhar a operacao se o email falhar
}
```

**Entregaveis:**
- [ ] Email de boas-vindas funcionando
- [ ] Notificacao ao master funcionando
- [ ] Fluxo testado end-to-end

**Commit Checkpoint:** `git commit -m "fix(auth): implement welcome email in approve-user flow"`

---

### Phase 2 — Cadastro Direto pelo Admin (E)

**Objetivo:** Implementar CRUD de professores no painel do admin.

#### 2.1 Tipo TypeScript

**Arquivo:** `types/index.ts`

```typescript
export interface TeacherFormData {
  full_name: string;
  email: string;
}
```

#### 2.2 API Route - Criar Professor

**Arquivo:** `app/api/teachers/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email/sendVerificationEmail';

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, institution_id } = await request.json();

    // Validar dados
    if (!full_name || !email || !institution_id) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    // Verificar se email ja existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email ja cadastrado no sistema' }, { status: 409 });
    }

    // Gerar senha temporaria
    const tempPassword = Math.random().toString(36).slice(-8) +
                         Math.random().toString(36).slice(-8).toUpperCase();

    // Criar usuario no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) throw authError;

    // Inserir em users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        is_active: true,
        is_master: false,
      });

    if (userError) {
      // Rollback: deletar do Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw userError;
    }

    // Inserir em user_institutions
    const { error: uiError } = await supabaseAdmin
      .from('user_institutions')
      .insert({
        user_id: authData.user.id,
        institution_id,
        role: 'professor',
        is_active: true,
      });

    if (uiError) {
      // Rollback
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw uiError;
    }

    // Enviar email de boas-vindas
    try {
      await sendWelcomeEmail({ email, full_name, tempPassword });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'Professor cadastrado com sucesso'
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Erro ao criar professor' }, { status: 500 });
  }
}
```

#### 2.3 API Route - Editar Professor

**Arquivo:** `app/api/teachers/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// PUT - Atualizar nome do professor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { full_name } = await request.json();
    const userId = params.id;

    if (!full_name) {
      return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient();

    const { error } = await supabaseAdmin
      .from('users')
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ error: 'Erro ao atualizar professor' }, { status: 500 });
  }
}
```

#### 2.4 Componente Modal

**Arquivo:** `components/teachers/TeacherModal.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { isValidEmail } from '@/lib/utils';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  institutionId: string;
  teacher?: {
    id: string;
    user: {
      id: string;
      full_name: string;
      email: string;
    };
  };
}

export function TeacherModal({
  isOpen,
  onClose,
  onSuccess,
  institutionId,
  teacher
}: TeacherModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isEditing = !!teacher;

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.user.full_name);
      setEmail(teacher.user.email);
    } else {
      setFullName('');
      setEmail('');
    }
    setEmailError('');
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Preencha o nome completo');
      return;
    }

    if (!isEditing) {
      if (!email.trim()) {
        toast.error('Preencha o email');
        return;
      }
      if (!isValidEmail(email)) {
        setEmailError('Email invalido');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isEditing) {
        // Atualizar
        const response = await fetch(`/api/teachers/${teacher.user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: fullName.trim() }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao atualizar');
        }

        toast.success('Professor atualizado com sucesso');
      } else {
        // Criar
        const response = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            institution_id: institutionId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao cadastrar');
        }

        toast.success('Professor cadastrado! Email de boas-vindas enviado.');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Professor' : 'Adicionar Professor'}
      description={isEditing ? 'Atualize os dados do professor' : 'Preencha os dados para cadastrar um novo professor'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo do professor"
            disabled={isLoading}
            required
          />
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              placeholder="email@exemplo.com"
              disabled={isLoading}
              required
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              O professor recebera um email com instrucoes de acesso
            </p>
          </div>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {isEditing ? 'Salvando...' : 'Cadastrando...'}
              </>
            ) : (
              isEditing ? 'Salvar' : 'Cadastrar'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
```

#### 2.5 Atualizar Pagina de Professores

**Arquivo:** `app/admin/professores/page.tsx`

Adicoes necessarias:
- Importar `TeacherModal`
- Estado para controlar modal: `showModal`, `selectedTeacher`
- Botao "Adicionar Professor" no header
- Botao de editar (icone Pencil) em cada linha
- Integrar modal

**Steps:**

1. [ ] Criar tipo `TeacherFormData` em `types/index.ts`
2. [ ] Criar `app/api/teachers/route.ts` (POST)
3. [ ] Criar `app/api/teachers/[id]/route.ts` (PUT)
4. [ ] Criar `components/teachers/TeacherModal.tsx`
5. [ ] Atualizar `app/admin/professores/page.tsx`:
   - Adicionar botao "Adicionar Professor"
   - Adicionar botao editar em cada linha
   - Integrar modal

**Entregaveis:**
- API routes funcionais
- Modal de cadastro/edicao
- Pagina atualizada com CRUD completo

**Commit Checkpoint:** `git commit -m "feat(teachers): implement direct teacher registration by admin"`

---

### Phase 3 — Testes e Validacao (V)

**Objetivo:** Garantir que ambos os fluxos funcionam corretamente.

**Testes do Fluxo 1 (Solicitacao):**
1. [ ] Professor solicita acesso
2. [ ] Master recebe notificacao (se implementado)
3. [ ] Master aprova solicitacao
4. [ ] Professor recebe email de boas-vindas
5. [ ] Professor faz login com senha temporaria
6. [ ] Professor ve apenas sua instituicao

**Testes do Fluxo 2 (Cadastro Direto):**
1. [ ] Admin clica "Adicionar Professor"
2. [ ] Admin preenche nome e email
3. [ ] Sistema valida email (nao duplicado)
4. [ ] Professor criado aparece na lista
5. [ ] Professor recebe email de boas-vindas
6. [ ] Professor faz login
7. [ ] Admin edita nome do professor
8. [ ] Admin desativa professor

**Checklist Final:**
- [ ] Ambos os fluxos funcionam
- [ ] Emails sao enviados corretamente
- [ ] Validacoes funcionam (email duplicado, campos obrigatorios)
- [ ] RLS garante isolamento por instituicao
- [ ] Build passa sem erros (`npm run build`)

**Commit Checkpoint:** `git commit -m "test(teachers): validate both registration flows"`

---

## Resumo dos Arquivos

### Existentes (modificar)
| Arquivo | Modificacao |
|---------|-------------|
| `app/api/approve-user/route.ts` | Adicionar envio de email de boas-vindas |
| `app/api/access-request/route.ts` | Adicionar notificacao ao master |
| `app/admin/professores/page.tsx` | Adicionar botoes e modal |
| `types/index.ts` | Adicionar `TeacherFormData` |

### Novos (criar)
| Arquivo | Descricao |
|---------|-----------|
| `app/api/teachers/route.ts` | POST para criar professor |
| `app/api/teachers/[id]/route.ts` | PUT para editar professor |
| `components/teachers/TeacherModal.tsx` | Modal de cadastro/edicao |

---

## Estimativas

| Fase | Esforco | Tempo |
|------|---------|-------|
| Phase 1 - Correcoes no Fluxo Existente | 2h | 0.5-1 dia |
| Phase 2 - Cadastro Direto | 4h | 1-2 dias |
| Phase 3 - Testes | 2h | 0.5 dia |
| **Total** | **8h** | **2-3 dias** |

---

## Proximos Passos Imediatos

1. `git checkout -b feature/cadastro-professores`
2. Adicionar envio de email em `approve-user/route.ts`
3. Testar fluxo de solicitacao de acesso
4. Criar API `/api/teachers`
5. Criar modal `TeacherModal.tsx`
6. Atualizar pagina de professores
7. `npm run build`
8. Criar PR para review
