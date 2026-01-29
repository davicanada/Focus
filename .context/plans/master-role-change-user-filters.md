---
status: ready
generated: 2026-01-28
agents:
  - type: "feature-developer"
    role: "Implementar a UI de mudanca de role e filtros no painel master"
  - type: "frontend-specialist"
    role: "Garantir UX consistente com o painel admin existente"
phases:
  - id: "phase-1"
    name: "Analise e Preparacao"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Testes e Validacao"
    prevc: "V"
---

# Mudanca de Role pelo Master + Filtros de Usuarios

> Adicionar funcionalidade de mudanca de role no painel master e implementar filtros avancados (nome, instituicao, role) na listagem de usuarios

## Task Snapshot
- **Primary goal:** Permitir que o usuario master possa alterar a role de qualquer usuario do sistema (assim como o admin ja faz), e melhorar a UX da listagem de usuarios com filtros avancados.
- **Success signal:**
  1. Master consegue alterar role de usuarios via modal (igual ao admin)
  2. Listagem de usuarios filtra por nome, instituicao e role em tempo real
  3. Build passa sem erros
- **Key references:**
  - API existente: `app/api/users/[id]/role/route.ts` (ja suporta master)
  - UI de referencia: `app/admin/professores/page.tsx` (modal de role change)
  - Painel master: `app/master/page.tsx` (onde implementar)

## Codebase Context

### Analise do Codigo Existente

#### 1. API de Mudanca de Role (`app/api/users/[id]/role/route.ts`)
- **Status:** JA SUPORTA MASTER
- A API ja verifica `is_master` antes de verificar se e admin
- Aceita roles: `admin`, `professor`, `admin_viewer`
- Valida que instituicao precisa de pelo menos 1 admin
- Registra alteracoes no `system_logs`

```typescript
// Linha 60-79 - Ja implementado:
const isMaster = currentUser?.is_master === true;
if (!isMaster) {
  // verifica se e admin da instituicao
}
```

#### 2. Painel Admin (`app/admin/professores/page.tsx`)
- Tem modal completo de mudanca de role (linhas 606-674)
- Usa `Select` com opcoes: professor, admin_viewer, admin
- Mostra avisos contextuais (promocao/rebaixamento)
- Funcao `handleRoleChange()` chama `PUT /api/users/${userId}/role`

#### 3. Painel Master (`app/master/page.tsx`)
- **Aba Usuarios (linha 591-671):**
  - Lista todos os usuarios com `user_institutions`
  - Mostra: Nome, Email, Tipo/Role, Status
  - Acao atual: apenas toggle ativo/inativo (Power button)
  - **FALTA:** botao de mudanca de role e filtros

### Estrutura de Dados

```typescript
interface UserWithInstitutions extends User {
  user_institutions: Array<{
    role: string;
    institution: Institution;
  }>;
}
```

## Working Phases

### Phase 1 — Analise e Preparacao (PREVC: P)

**Checklist de Preparacao:**
- [x] Verificar que API ja suporta master (confirmado)
- [x] Analisar modal de role do admin como referencia
- [x] Identificar componentes reutilizaveis (Modal, Select, Badge)
- [x] Mapear estados necessarios para filtros

**Componentes a Reutilizar:**
- `Modal` e `ModalFooter` de `@/components/ui/modal`
- `Select` de `@/components/ui/select`
- `Badge` de `@/components/ui/badge`
- `Input` de `@/components/ui/input`
- Funcoes `getRoleBadgeVariant()` e `getRoleLabel()` do admin

### Phase 2 — Implementacao (PREVC: E)

#### 2.1 Adicionar Imports
```typescript
// Adicionar aos imports existentes
import { UserCog } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
```

#### 2.2 Adicionar Estados de Filtro
```typescript
// Novos estados no master/page.tsx (apos linha 66)
const [filterName, setFilterName] = useState('');
const [filterInstitution, setFilterInstitution] = useState('');
const [filterRole, setFilterRole] = useState('');
```

#### 2.3 Adicionar Estados do Modal de Role
```typescript
// Estados para modal de mudanca de role (apos estados de filtro)
const [showRoleModal, setShowRoleModal] = useState(false);
const [roleChangeTarget, setRoleChangeTarget] = useState<{
  user: UserWithInstitutions;
  userInstitution: { role: string; institution: Institution };
} | null>(null);
const [newRole, setNewRole] = useState('');
const [changingRole, setChangingRole] = useState(false);
```

#### 2.4 Adicionar Funcoes Auxiliares
```typescript
// Funcoes auxiliares (antes do return)
const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin': return 'default';
    case 'admin_viewer': return 'secondary';
    case 'professor': return 'outline';
    default: return 'outline';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Administrador';
    case 'admin_viewer': return 'Visualizador';
    case 'professor': return 'Professor';
    default: return role;
  }
};
```

#### 2.5 Implementar Logica de Filtro
```typescript
// Usuarios filtrados (usar useMemo para performance)
const filteredUsers = useMemo(() => {
  return users.filter(user => {
    // Filtro por nome
    if (filterName && !user.full_name.toLowerCase().includes(filterName.toLowerCase())) {
      return false;
    }

    // Filtro por instituicao
    if (filterInstitution) {
      const hasInstitution = user.user_institutions?.some(ui =>
        ui.institution?.name?.toLowerCase().includes(filterInstitution.toLowerCase())
      );
      if (!hasInstitution) return false;
    }

    // Filtro por role
    if (filterRole) {
      if (filterRole === 'master') {
        if (!user.is_master) return false;
      } else {
        const hasRole = user.user_institutions?.some(ui => ui.role === filterRole);
        if (!hasRole) return false;
      }
    }

    return true;
  });
}, [users, filterName, filterInstitution, filterRole]);
```

#### 2.6 Funcao de Mudanca de Role
```typescript
const handleRoleChange = async () => {
  if (!roleChangeTarget || !newRole) return;

  const { user, userInstitution } = roleChangeTarget;

  if (newRole === userInstitution.role) {
    toast.error('Selecione uma funcao diferente da atual');
    return;
  }

  setChangingRole(true);
  try {
    const response = await fetch(`/api/users/${user.id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: userInstitution.institution.id,
        new_role: newRole,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      toast.success(result.message || 'Funcao alterada com sucesso!');
      setShowRoleModal(false);
      setRoleChangeTarget(null);
      setNewRole('');
      loadUsers();
    } else {
      toast.error(result.error || 'Erro ao alterar funcao');
    }
  } catch (error) {
    console.error('Error changing role:', error);
    toast.error('Erro ao alterar funcao');
  } finally {
    setChangingRole(false);
  }
};
```

#### 2.7 UI dos Filtros (CardContent da aba Users, antes da tabela)
```tsx
{/* Filtros */}
<div className="flex flex-col sm:flex-row gap-4 mb-4">
  <div className="flex-1">
    <Input
      placeholder="Filtrar por nome..."
      value={filterName}
      onChange={(e) => setFilterName(e.target.value)}
    />
  </div>
  <div className="flex-1">
    <Input
      placeholder="Filtrar por instituicao..."
      value={filterInstitution}
      onChange={(e) => setFilterInstitution(e.target.value)}
    />
  </div>
  <div className="w-full sm:w-48">
    <Select
      value={filterRole}
      onChange={(e) => setFilterRole(e.target.value)}
    >
      <option value="">Todas as funcoes</option>
      <option value="master">Master</option>
      <option value="admin">Administrador</option>
      <option value="admin_viewer">Visualizador</option>
      <option value="professor">Professor</option>
    </Select>
  </div>
</div>
```

#### 2.8 Atualizar Contagem no CardDescription
```tsx
// Mudar de users.length para filteredUsers.length
<CardDescription>
  {filteredUsers.length} de {users.length} usuario(s)
</CardDescription>
```

#### 2.9 Usar filteredUsers na Tabela
```tsx
// Trocar users.map por filteredUsers.map
{filteredUsers.map((user) => (
  // ... conteudo existente
))}
```

#### 2.10 Adicionar Botao UserCog na Coluna Acoes
```tsx
// Na coluna Acoes, para usuarios NAO master com user_institutions
{!user.is_master && user.user_institutions?.length > 0 && (
  <div className="flex gap-1">
    {user.user_institutions.map((ui, idx) => (
      <Button
        key={idx}
        variant="ghost"
        size="icon"
        onClick={() => {
          setRoleChangeTarget({ user, userInstitution: ui });
          setNewRole(ui.role);
          setShowRoleModal(true);
        }}
        title={`Alterar funcao em ${ui.institution?.name}`}
      >
        <UserCog className="h-4 w-4" />
      </Button>
    ))}
  </div>
)}
```

#### 2.11 Modal de Mudanca de Role (antes do fechamento do DashboardLayout)
```tsx
{/* Role Change Modal */}
<Modal
  isOpen={showRoleModal}
  onClose={() => {
    setShowRoleModal(false);
    setRoleChangeTarget(null);
    setNewRole('');
  }}
  title="Alterar Funcao do Usuario"
  description={roleChangeTarget ?
    `Alterar funcao de ${roleChangeTarget.user.full_name} em ${roleChangeTarget.userInstitution.institution?.name}` :
    ''
  }
>
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Funcao Atual</Label>
      <div>
        <Badge variant={getRoleBadgeVariant(roleChangeTarget?.userInstitution.role || '')}>
          {getRoleLabel(roleChangeTarget?.userInstitution.role || '')}
        </Badge>
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="newRole">Nova Funcao</Label>
      <Select
        id="newRole"
        value={newRole}
        onChange={(e) => setNewRole(e.target.value)}
        disabled={changingRole}
      >
        <option value="professor">Professor</option>
        <option value="admin_viewer">Visualizador</option>
        <option value="admin">Administrador</option>
      </Select>
    </div>

    {roleChangeTarget?.userInstitution.role === 'admin' && newRole !== 'admin' && (
      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Atencao:</strong> Ao remover a funcao de Administrador, este usuario
        perdera acesso as funcionalidades de gestao.
      </div>
    )}

    {newRole === 'admin' && roleChangeTarget?.userInstitution.role !== 'admin' && (
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
        <strong>Atencao:</strong> Ao promover para Administrador, este usuario tera
        acesso completo a gestao da instituicao.
      </div>
    )}
  </div>

  <ModalFooter>
    <Button
      variant="outline"
      onClick={() => {
        setShowRoleModal(false);
        setRoleChangeTarget(null);
        setNewRole('');
      }}
      disabled={changingRole}
    >
      Cancelar
    </Button>
    <Button
      onClick={handleRoleChange}
      disabled={changingRole || newRole === roleChangeTarget?.userInstitution.role}
    >
      {changingRole ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Alterando...
        </>
      ) : (
        'Confirmar Alteracao'
      )}
    </Button>
  </ModalFooter>
</Modal>
```

### Phase 3 — Testes e Validacao (PREVC: V)

**Checklist de Validacao:**
- [ ] Build passa sem erros (`npm run build`)
- [ ] Filtro por nome funciona (case-insensitive)
- [ ] Filtro por instituicao funciona
- [ ] Filtro por role funciona (incluindo master)
- [ ] Combinacao de filtros funciona
- [ ] Modal de role abre corretamente
- [ ] Mudanca de role salva no banco
- [ ] Toast de sucesso/erro aparece
- [ ] Log registrado em system_logs
- [ ] Validacao "precisa de 1 admin" funciona (API)

**Cenarios de Teste Manual:**
1. Master altera professor -> admin
2. Master altera admin -> professor (com mais de 1 admin)
3. Master tenta remover ultimo admin (deve mostrar erro)
4. Filtrar por "Maria" mostra apenas usuarios com Maria no nome
5. Filtrar por "Escola Exemplo" mostra apenas usuarios dessa instituicao
6. Filtrar por "professor" mostra apenas professores
7. Combinar filtros: nome + instituicao

## Resumo das Alteracoes

| Arquivo | Alteracao |
| --- | --- |
| `app/master/page.tsx` | Adicionar filtros, modal de role, e botao UserCog |

**Estimativa:** ~200 linhas de codigo adicionadas

## Riscos e Mitigacao

| Risco | Probabilidade | Mitigacao |
| --- | --- | --- |
| API nao suporta master | Baixa | API ja verificada - suporta |
| Performance com muitos usuarios | Media | useMemo nos filtros |
| Conflito de roles | Baixa | API valida minimo 1 admin |

## Rollback Plan
- Se houver problemas, reverter o commit do `master/page.tsx`
- API nao sera alterada (ja funciona)
- Nenhuma migration de banco necessaria
- Tempo estimado de rollback: < 5 minutos
