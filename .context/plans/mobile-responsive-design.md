---
status: completed
generated: 2026-01-24
phases:
  - id: "phase-1"
    name: "Layout Responsivo Base"
    prevc: "E"
  - id: "phase-2"
    name: "Páginas do Professor"
    prevc: "E"
  - id: "phase-3"
    name: "Páginas Admin e Master"
    prevc: "E"
  - id: "phase-4"
    name: "Testes Playwright"
    prevc: "V"
---

# Plano: Melhoria do Design Mobile do App Focus

> Otimizar a experiência mobile do app, com foco principal nas páginas do Professor para uso rápido em sala de aula

## Objetivo Principal
Professores precisam registrar ocorrências rapidamente usando celulares na sala de aula. O design mobile deve ser otimizado para:
- Acesso rápido ao formulário de registro
- Interface touch-friendly com botões grandes
- Navegação simplificada com menu hamburger
- Carregamento rápido e responsivo

## Análise do Estado Atual

### Problemas Identificados

#### 1. DashboardLayout.tsx (linha 39)
```tsx
<div className="pl-64 transition-all duration-300">
```
- **Problema**: `pl-64` fixo (256px) sem breakpoint mobile
- **Impacto**: Conteúdo fica cortado em telas < 768px

#### 2. Sidebar.tsx (linha 76-82)
```tsx
<aside className="fixed left-0 top-0 z-40 h-screen bg-sidebar...">
```
- **Problema**: Sidebar sempre visível, sem toggle mobile
- **Impacto**: Ocupa 100% da tela em mobile

#### 3. TopBar.tsx
- Tem `hidden md:block` para nome/email do usuário (bom)
- **Falta**: Botão hamburger para abrir sidebar mobile

#### 4. Páginas do Professor
- `registrar/page.tsx`: Grid `lg:grid-cols-2` funciona bem
- `ocorrencias/page.tsx`: Tabela não tem scroll horizontal

## Plano de Implementação

### Fase 1: Layout Responsivo Base

#### 1.1 Atualizar DashboardLayout.tsx
- Adicionar state `sidebarOpen` para controle mobile
- Mudar `pl-64` para `md:pl-64 pl-0`
- Passar `sidebarOpen` e `setSidebarOpen` para Sidebar e TopBar

#### 1.2 Atualizar Sidebar.tsx
- Adicionar props `isOpen` e `onClose`
- Em mobile (< md): overlay com backdrop escuro
- Em desktop (>= md): comportamento atual mantido
- Fechar ao clicar em link (mobile only)

#### 1.3 Atualizar TopBar.tsx
- Adicionar botão hamburger (Menu icon) visível apenas em mobile
- Prop `onMenuClick` para abrir sidebar

### Fase 2: Páginas do Professor (PRIORIDADE MÁXIMA)

#### 2.1 professor/registrar/page.tsx
- Grid responsivo já funciona (`lg:grid-cols-2`) ✓
- Ajustes:
  - Botões touch-friendly (min-height: 44px)
  - Input de busca otimizado
  - Badges de alunos selecionados com wrap

#### 2.2 professor/ocorrencias/page.tsx
- Adicionar wrapper `overflow-x-auto` na tabela
- Ajustar filtros para empilhamento vertical em mobile

#### 2.3 professor/page.tsx (Dashboard)
- Stats cards em 2 colunas (`grid-cols-2`) em mobile

### Fase 3: Páginas Admin e Master

#### 3.1 Padrões Gerais
- Tabelas com `overflow-x-auto` wrapper
- Modais `max-h-[90vh]` em mobile

#### 3.2 Páginas específicas
- admin/alunos: tabela responsiva
- admin/turmas: tabela responsiva
- master/page: tabs com scroll horizontal

### Fase 4: Testes Playwright

#### 4.1 Configuração de Viewports Mobile
```typescript
// playwright.config.ts - adicionar projeto mobile
{ name: 'mobile', use: { viewport: { width: 375, height: 667 } } }
```

#### 4.2 Arquivo de Teste
- `e2e/mobile-responsive.spec.ts`
- Testar menu hamburger
- Testar registro de ocorrência em mobile
- Verificar scroll horizontal em tabelas

## Breakpoints Tailwind
- `sm`: 640px
- `md`: 768px (breakpoint principal mobile/desktop)
- `lg`: 1024px

## Componentes a Modificar

| Arquivo | Alteração | Prioridade |
|---------|-----------|------------|
| components/layout/DashboardLayout.tsx | State mobile, pl responsivo | Alta |
| components/layout/Sidebar.tsx | Overlay mobile, props | Alta |
| components/layout/TopBar.tsx | Hamburger button | Alta |
| app/professor/ocorrencias/page.tsx | overflow-x-auto tabela | Alta |
| app/professor/page.tsx | grid-cols-2 mobile | Média |
| app/admin/*/page.tsx | overflow-x-auto tabelas | Média |
| playwright.config.ts | viewport mobile | Alta |

## Critérios de Sucesso
1. Menu hamburger funciona em viewport < 768px
2. Sidebar abre como overlay em mobile
3. Todas as tabelas têm scroll horizontal em mobile
4. Testes Playwright passam em viewport 375x667
5. Professor consegue registrar ocorrência facilmente no celular
