# Plano: Novo Tipo de Usuário - Adm Viewer

## Objetivo
Criar um novo role "admin_viewer" para usuários gerenciais que precisam acompanhar métricas e gerar relatórios, sem acesso aos cadastros (turmas, alunos, professores, tipos de ocorrência).

## Perfil do Usuário
- **Público-alvo**: Diretores, coordenadores, supervisores pedagógicos
- **Necessidade**: Acompanhar métricas, gerar relatórios, configurar alertas
- **Diferencial**: Acesso às ferramentas de análise, sem acesso aos cadastros

## Abas Disponíveis (100% IDÊNTICAS ao Admin)

| Aba | Funcionalidade | Origem |
|-----|----------------|--------|
| Analytics | Gráficos interativos + AI Chat | **Cópia exata** de `/admin/dashboard` |
| Relatórios | Geração de relatórios por período | **Cópia exata** de `/admin/relatorios` |
| Alertas | Notificações + Criar/Editar regras | **Cópia exata** de `/admin/alertas` |
| Configurações | Regras de alerta + Conta | **Cópia exata** de `/admin/configuracoes` |

## Estrutura de Arquivos

### 1. Novas Páginas

```
app/viewer/
├── page.tsx                    # Dashboard inicial (redirect para analytics)
├── analytics/
│   └── page.tsx               # Cópia de admin/dashboard/page.tsx
├── relatorios/
│   ├── page.tsx               # Cópia de admin/relatorios/page.tsx
│   ├── periodo/
│   │   └── page.tsx           # Cópia de admin/relatorios/periodo/page.tsx
│   └── aluno/
│       └── page.tsx           # Cópia de admin/relatorios/aluno/page.tsx
├── alertas/
│   └── page.tsx               # Cópia exata de admin/alertas/page.tsx
└── configuracoes/
    └── page.tsx               # Cópia exata de admin/configuracoes/page.tsx
```

### 2. Modificações Necessárias

#### `types/index.ts`
```typescript
// Adicionar novo role
export type UserRole = 'master' | 'admin' | 'professor' | 'admin_viewer';
```

#### `components/layout/Sidebar.tsx`
```typescript
const viewerNavItems: NavItem[] = [
  { href: '/viewer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/viewer/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
  { href: '/viewer/alertas', label: 'Alertas', icon: Bell },
  { href: '/viewer/configuracoes', label: 'Configurações', icon: Settings },
];
```

#### Banco de Dados
- Tabela `users`: coluna `role` já aceita texto, apenas adicionar validação
- Tabela `user_institutions`: sem alteração (viewer também tem institution_id)

## Detalhamento das Páginas

### 1. Analytics (`/viewer/analytics`)
- **Fonte**: `app/admin/dashboard/page.tsx`
- **Alterações**:
  - Role check: `role !== 'admin_viewer'`
  - currentRole: `"admin_viewer"`
- **Funcionalidades mantidas**:
  - Todos os gráficos
  - Cross-filtering
  - Filtro de ano
  - AI Analytics Chat

### 2. Relatórios (`/viewer/relatorios`)
- **Fonte**: `app/admin/relatorios/` (página principal + subpáginas)
- **Alterações**: Apenas role check para 'admin_viewer'
- **Funcionalidades** (100% idênticas ao admin):
  - Página principal com opções de relatório
  - Relatório por período (bimestre/trimestre/semestre)
  - Relatório por aluno (histórico individual)
  - Exportar PDF/Excel

### 3. Alertas (`/viewer/alertas`)
- **Fonte**: `app/admin/alertas/page.tsx`
- **Alterações**: Apenas role check para 'admin_viewer'
- **Funcionalidades** (100% idênticas ao admin):
  - Ver notificações de alerta
  - Marcar como lida
  - Filtrar por status (lido/não lido)

### 4. Configurações (`/viewer/configuracoes`)
- **Fonte**: `app/admin/configuracoes/page.tsx`
- **Alterações**: Apenas role check para 'admin_viewer'
- **Funcionalidades** (100% idênticas ao admin):
  - Criar/Editar/Excluir regras de alerta
  - Ativar/Desativar regras
  - Configurações da conta

## Fluxo de Aprovação de Conta

### Opção A: Novo tipo de solicitação
```typescript
// Em AccessRequestModal.tsx
const requestTypes = [
  { value: 'professor', label: 'Professor' },
  { value: 'admin_existing', label: 'Administrador (instituição existente)' },
  { value: 'admin_new', label: 'Administrador (nova instituição)' },
  { value: 'admin_viewer', label: 'Visualizador (somente leitura)' }, // NOVO
];
```

### Opção B: Admin aprova como viewer
- Admin/Master ao aprovar solicitação escolhe o role
- Dropdown com opções: "Professor", "Admin", "Visualizador"

**Recomendação**: Opção B (mais flexível, menos solicitações no formulário)

## Permissões e Segurança

### RLS (Row Level Security)
O viewer terá as mesmas permissões do admin para as funcionalidades disponíveis:
- `occurrences`: SELECT onde institution_id = user.institution_id
- `students`: SELECT onde institution_id = user.institution_id
- `classes`: SELECT onde institution_id = user.institution_id
- `occurrence_types`: SELECT onde institution_id = user.institution_id
- `alert_notifications`: SELECT/UPDATE (todas as operações)
- `alert_rules`: SELECT/INSERT/UPDATE/DELETE (todas as operações)

### APIs
| API | Viewer pode acessar? |
|-----|---------------------|
| GET /api/dashboard/stats | ✅ Sim |
| POST /api/ai-analytics | ✅ Sim |
| GET /api/alert-notifications | ✅ Sim |
| PUT /api/alert-notifications/[id]/read | ✅ Sim |
| POST /api/alert-notifications (marcar todas) | ✅ Sim |
| GET /api/alert-rules | ✅ Sim |
| POST /api/alert-rules | ✅ Sim |
| PUT /api/alert-rules/[id] | ✅ Sim |
| DELETE /api/alert-rules/[id] | ✅ Sim |
| POST /api/occurrences | ❌ Não |
| POST /api/teachers | ❌ Não |
| CRUD /api/classes | ❌ Não |
| CRUD /api/students | ❌ Não |

## Sidebar Badge (Alertas)

O viewer também deve ver o badge de alertas não lidos:
```typescript
// Em Sidebar.tsx
useEffect(() => {
  if (role !== 'admin' && role !== 'admin_viewer') return;
  // ... fetch unread count
}, [role]);
```

## Etapas de Implementação

### Fase 1: Infraestrutura (30 min)
1. Adicionar `'admin_viewer'` ao type `UserRole`
2. Adicionar `viewerNavItems` no Sidebar.tsx
3. Atualizar lógica de badge de alertas para incluir viewer

### Fase 2: Páginas (1h)
1. Criar `app/viewer/page.tsx` (redirect para analytics)
2. Criar `app/viewer/analytics/page.tsx` (cópia do admin)
3. Criar `app/viewer/relatorios/page.tsx` (cópia do admin)
4. Criar `app/viewer/relatorios/periodo/page.tsx` (cópia do admin)
5. Criar `app/viewer/relatorios/aluno/page.tsx` (cópia do admin)
6. Criar `app/viewer/alertas/page.tsx` (cópia do admin)
7. Criar `app/viewer/configuracoes/page.tsx` (cópia do admin)

### Fase 3: Aprovação de Conta (30 min)
1. Atualizar modal de aprovação para permitir escolher role
2. Atualizar API de aprovação para aceitar role como parâmetro

### Fase 4: Testes e Validação (30 min)
1. Verificar build
2. Testar navegação
3. Testar permissões (viewer não pode acessar páginas admin)

## Checklist de Validação

- [ ] Type UserRole inclui 'admin_viewer'
- [ ] Sidebar mostra 4 itens: Analytics, Relatórios, Alertas, Configurações
- [ ] Badge de alertas funciona para viewer
- [ ] Analytics carrega corretamente (gráficos + AI Chat)
- [ ] Relatórios funcionam (por período, por aluno, PDF/Excel)
- [ ] Alertas funciona (ver, criar regras, editar regras)
- [ ] Configurações funciona (regras de alerta + conta)
- [ ] Viewer NÃO consegue acessar /admin/* (turmas, alunos, etc.)
- [ ] Viewer NÃO consegue criar ocorrências
- [ ] Viewer NÃO consegue editar cadastros
- [ ] Build passa sem erros

## Considerações Futuras

### Melhorias Opcionais
1. Dashboard inicial com resumo (total ocorrências, alertas pendentes)
2. Notificações por email para viewer quando alerta disparar
3. Comparativo de períodos nos relatórios
4. Export de dados brutos para análise externa

### Possíveis Novos Roles
- `coordinator`: Acesso a turmas específicas (filtro por série/turno)
- `guardian`: Acesso apenas aos dados do próprio filho
- `auditor`: Acesso total mas sem edição (para auditoria externa)

## Estimativa

- **Complexidade**: Média
- **Arquivos novos**: 7 páginas
- **Arquivos modificados**: 3-4 (types, Sidebar, APIs de aprovação)
- **Risco**: Baixo (funcionalidade isolada, não afeta outros roles)
