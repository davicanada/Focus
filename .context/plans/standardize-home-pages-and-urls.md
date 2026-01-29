---
status: completed
generated: 2026-01-28
agents:
  - type: "feature-developer"
    role: "Criar pagina Visao Geral do viewer e renomear labels"
  - type: "refactoring-specialist"
    role: "Mover pasta admin/dashboard para admin/analytics"
  - type: "test-writer"
    role: "Atualizar testes E2E com novas URLs"
phases:
  - id: "phase-1"
    name: "Analise de Impacto"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Padronizar Home Pages e URLs do Sistema

> Renomear home pages para "Visao Geral", criar home page do viewer, e corrigir URL do Analytics do admin

## Task Snapshot
- **Primary goal:** Padronizar nomenclatura e URLs em todo o sistema
- **Success signal:** Todas as home pages chamam "Visao Geral" e a URL do Analytics do admin e `/admin/analytics`
- **Key references:**
  - Sidebar: `components/layout/Sidebar.tsx`
  - Admin Home: `app/admin/page.tsx`
  - Professor Home: `app/professor/page.tsx`
  - Viewer Home: `app/viewer/page.tsx` (atual: redirect)
  - Admin Analytics: `app/admin/dashboard/page.tsx` (renomear para `/admin/analytics`)

---

## Analise do Estado Atual

### 1. Labels nas Home Pages

| Role | Pagina | Label no Sidebar | Label na Pagina | Status |
|------|--------|------------------|-----------------|--------|
| Admin | `/admin` | "Visao Geral" | "Visao Geral" | OK |
| Professor | `/professor` | "Dashboard" | "Bem-vindo, {name}!" | CORRIGIR sidebar |
| Viewer | `/viewer` | (nao existe) | (redirect para analytics) | CRIAR pagina |

### 2. URLs do Analytics

| Role | URL Atual | URL Esperada | Status |
|------|-----------|--------------|--------|
| Admin | `/admin/dashboard` | `/admin/analytics` | CORRIGIR |
| Professor | `/professor/analytics` | `/professor/analytics` | OK |
| Viewer | `/viewer/analytics` | `/viewer/analytics` | OK |

### 3. Referencias a `/admin/dashboard` no Codigo

**Arquivos que precisam ser alterados:**

| Arquivo | Linha | Uso | Acao |
|---------|-------|-----|------|
| `components/layout/Sidebar.tsx` | 55 | Link no menu admin | Alterar href |
| `app/admin/page.tsx` | 194 | "Ver Analytics" quick action | Alterar href |

**Testes E2E que precisam ser atualizados:**

| Arquivo | Ocorrencias | Acao |
|---------|-------------|------|
| `e2e/analytics-dashboard.spec.ts` | 7 | Trocar URL |
| `e2e/ai-timezone.spec.ts` | 1 | Trocar URL |
| `e2e/ai-analytics.spec.ts` | 2 | Trocar URL |

**Arquivos de documentacao (nao quebram build):**
- `CLAUDE.md` - Referencias historicas (opcional atualizar)
- `.context/plans/*.md` - Planos antigos (nao alterar)

---

## Plano de Implementacao

### Fase 1: Renomear Label do Professor (Sidebar)

**Arquivo:** `components/layout/Sidebar.tsx`

**Linha 62 - Antes:**
```typescript
{ href: '/professor', label: 'Dashboard', icon: LayoutDashboard },
```

**Linha 62 - Depois:**
```typescript
{ href: '/professor', label: 'Visao Geral', icon: LayoutDashboard },
```

**Impacto:** Nenhum (apenas texto visual)

---

### Fase 2: Criar Pagina "Visao Geral" do Viewer

**Arquivo a modificar:** `app/viewer/page.tsx`

**Estado atual:** Apenas redirect para `/viewer/analytics`

**Estado desejado:** Pagina completa similar ao admin, com:

1. **Stats Cards** (3 cards):
   - Total de Ocorrencias
   - Ocorrencias do Mes
   - % Ocorrencias Graves

2. **Quick Actions** (apenas 2 botoes):
   - "Ver Analytics" -> `/viewer/analytics`
   - "Gerar Relatorio" -> `/viewer/relatorios`

3. **Ocorrencias Recentes** (lista read-only)

**Atualizar Sidebar** (`components/layout/Sidebar.tsx`):

**Linha 68-73 - Antes:**
```typescript
const viewerNavItems: NavItem[] = [
  { href: '/viewer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/viewer/relatorios', label: 'Relatorios', icon: FileSpreadsheet },
  { href: '/viewer/alertas', label: 'Alertas', icon: Bell },
  { href: '/viewer/configuracoes', label: 'Configuracoes', icon: Settings },
];
```

**Linha 68-74 - Depois:**
```typescript
const viewerNavItems: NavItem[] = [
  { href: '/viewer', label: 'Visao Geral', icon: LayoutDashboard },
  { href: '/viewer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/viewer/relatorios', label: 'Relatorios', icon: FileSpreadsheet },
  { href: '/viewer/alertas', label: 'Alertas', icon: Bell },
  { href: '/viewer/configuracoes', label: 'Configuracoes', icon: Settings },
];
```

---

### Fase 3: Mover Analytics do Admin de `/admin/dashboard` para `/admin/analytics`

**Passo 1:** Renomear pasta
```
app/admin/dashboard/ -> app/admin/analytics/
```

**Passo 2:** Atualizar Sidebar

**Linha 55 - Antes:**
```typescript
{ href: '/admin/dashboard', label: 'Analytics', icon: BarChart3 },
```

**Linha 55 - Depois:**
```typescript
{ href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
```

**Passo 3:** Atualizar Quick Action na home do admin

**`app/admin/page.tsx` linha 194 - Antes:**
```typescript
href="/admin/dashboard"
```

**Depois:**
```typescript
href="/admin/analytics"
```

**Passo 4:** Atualizar testes E2E

Arquivos a modificar (buscar e substituir `/admin/dashboard` por `/admin/analytics`):
- `e2e/analytics-dashboard.spec.ts` - 7 ocorrencias
- `e2e/ai-timezone.spec.ts` - 1 ocorrencia
- `e2e/ai-analytics.spec.ts` - 2 ocorrencias

---

## Checklist de Implementacao

### Fase 1: Label do Professor
- [x] Alterar `components/layout/Sidebar.tsx` linha 62: "Dashboard" -> "Visao Geral"

### Fase 2: Pagina Visao Geral do Viewer
- [x] Reescrever `app/viewer/page.tsx` com conteudo completo (nao mais redirect)
- [x] Adicionar link "Visao Geral" no `viewerNavItems` do Sidebar (linha 68)

### Fase 3: URL do Analytics do Admin
- [x] Renomear pasta `app/admin/dashboard/` -> `app/admin/analytics/`
- [x] Atualizar `components/layout/Sidebar.tsx` linha 55
- [x] Atualizar `app/admin/page.tsx` linha 194
- [x] Atualizar `e2e/analytics-dashboard.spec.ts` (7 ocorrencias)
- [x] Atualizar `e2e/ai-timezone.spec.ts` (1 ocorrencia)
- [x] Atualizar `e2e/ai-analytics.spec.ts` (2 ocorrencias)

### Validacao
- [x] Build passa sem erros (`npm run build`)
- [x] Sidebar do professor mostra "Visao Geral"
- [x] Viewer tem pagina "Visao Geral" funcional
- [x] URL `/admin/analytics` carrega corretamente
- [x] URL `/admin/dashboard` retorna 404 (pasta removida)
- [ ] Testes E2E passam (pendente execucao manual)

---

## Impacto

| Aspecto | Impacto |
|---------|---------|
| Performance | Nenhum |
| Banco de dados | Nenhum (sem migration) |
| Breaking changes | Nenhum para usuarios (apenas URLs internas) |
| Arquivos criados | 0 |
| Arquivos movidos | 1 pasta (admin/dashboard -> admin/analytics) |
| Arquivos modificados | ~6 (Sidebar, admin/page, viewer/page, 3 testes E2E) |

---

## Rollback

Se algo der errado:

1. **Git revert** dos commits feitos
2. **Renomear pasta** de volta: `app/admin/analytics/` -> `app/admin/dashboard/`
3. **Restaurar** viewer redirect original

Risco de rollback: **BAIXO** - todas as mudancas sao simples renomeacoes e nao afetam dados.
