---
status: completed
generated: 2026-01-28
completed: 2026-01-28
agents:
  - type: "frontend-specialist"
    role: "Implementar componentes de feedback visual e integrar em todas as páginas"
phases:
  - id: "phase-1"
    name: "Diagnóstico e Solução"
    prevc: "P"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Plano: Feedback Visual de Navegação para Todas as Roles

> Implementar feedback visual claro quando o usuário clica em um link de navegação, mostrando que a página está carregando

## Task Snapshot
- **Primary goal:** Usuário ver feedback imediato ao clicar em qualquer link de navegação
- **Success signal:** Ao clicar em um link, aparecer indicador visual (spinner/overlay) até a página carregar
- **Constraint:** Não alterar lógica de negócio, apenas adicionar feedback visual

---

## Diagnóstico do Problema Atual

### Por que o feedback não funciona?

1. **Todas as páginas são Client Components (`'use client'`)**
   - Os arquivos `loading.tsx` do Next.js são para **Server Components com streaming**
   - Client Components renderizam imediatamente, então `loading.tsx` não é usado

2. **Estado de loading interno em cada página**
   - Cada página tem seu próprio `const [isLoading, setIsLoading] = useState(true)`
   - O spinner aparece DENTRO da página, não durante a transição

3. **NProgress funciona mas é sutil**
   - A barra no topo funciona, mas é fina (4px) e pode passar despercebida
   - Não há feedback no ponto onde o usuário clicou

### Arquitetura Atual

```
Usuário clica no link (Sidebar)
        ↓
ProgressLink dispara startProgress() → NProgress barra no topo (sutil)
        ↓
Next.js carrega o componente da página
        ↓
Página renderiza com isLoading=true → Spinner DENTRO da página
        ↓
Dados carregam → isLoading=false → Conteúdo aparece
```

**Problema:** Entre o clique e o spinner da página aparecer, não há feedback claro.

---

## Solução Proposta

### Abordagem: Overlay de Loading Global

Criar um **overlay de carregamento global** que aparece **imediatamente ao clicar** em um link de navegação e desaparece quando a página está pronta.

### Arquitetura da Solução

```
Usuário clica no link (Sidebar)
        ↓
ProgressLink dispara:
  1. startProgress() → NProgress barra no topo
  2. showLoadingOverlay() → Overlay escurece + spinner central (NOVO)
        ↓
Next.js carrega o componente da página
        ↓
NavigationProgress detecta mudança de rota
        ↓
hideLoadingOverlay() → Overlay desaparece
        ↓
Página renderiza normalmente
```

---

## Fase 1: Criar Componente de Overlay Global

### 1.1 Criar `LoadingOverlay.tsx`

**Arquivo:** `components/LoadingOverlay.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Estado global para controlar o overlay
let showOverlayFn: ((show: boolean) => void) | null = null;

export function showLoadingOverlay() {
  showOverlayFn?.(true);
}

export function hideLoadingOverlay() {
  showOverlayFn?.(false);
}

export function LoadingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    showOverlayFn = setVisible;
    return () => {
      showOverlayFn = null;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
```

### 1.2 Atualizar `NavigationProgress.tsx`

**Arquivo:** `components/NavigationProgress.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { hideLoadingOverlay } from './LoadingOverlay';

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.15,
  speed: 400,
});

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Quando a rota muda, esconde o overlay e completa o NProgress
    NProgress.done();
    hideLoadingOverlay();
  }, [pathname, searchParams]);

  return null;
}

export function startProgress() {
  NProgress.start();
}

export function stopProgress() {
  NProgress.done();
}
```

### 1.3 Atualizar `ProgressLink.tsx`

**Arquivo:** `components/ProgressLink.tsx`

```tsx
'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { startProgress } from './NavigationProgress';
import { showLoadingOverlay } from './LoadingOverlay';
import { cn } from '@/lib/utils';

interface ProgressLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

export function ProgressLink({
  href,
  children,
  className,
  activeClassName,
  onClick,
  ...props
}: ProgressLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (typeof href === 'string' && pathname.startsWith(href) && href !== '/');

  const handleClick = () => {
    if (pathname !== href) {
      startProgress();
      showLoadingOverlay(); // NOVO: Mostra overlay imediatamente
    }
    onClick?.();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
```

### 1.4 Adicionar Overlay ao Layout

**Arquivo:** `app/layout.tsx`

Adicionar dentro do body, após NavigationProgress:
```tsx
<LoadingOverlay />
```

---

## Fase 2: Testes

### Rotas a testar

| Role | Rotas |
|------|-------|
| Admin | /admin, /admin/turmas, /admin/alunos, /admin/professores, /admin/tipos-ocorrencias, /admin/trimestres, /admin/anos-letivos, /admin/analytics, /admin/relatorios, /admin/alertas, /admin/configuracoes |
| Professor | /professor, /professor/registrar, /professor/ocorrencias, /professor/analytics |
| Viewer | /viewer, /viewer/analytics, /viewer/relatorios, /viewer/alertas, /viewer/configuracoes |
| Master | /master |
| Comum | /settings |

### Checklist de Teste

- [ ] **Admin:** Testar navegação entre todas as páginas
- [ ] **Professor:** Testar navegação entre todas as páginas
- [ ] **Viewer:** Testar navegação entre todas as páginas
- [ ] **Master:** Testar navegação no painel
- [ ] **Mobile:** Testar em viewport pequeno (sidebar fecha + overlay aparece)

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `components/LoadingOverlay.tsx` | CRIAR |
| `components/NavigationProgress.tsx` | MODIFICAR |
| `components/ProgressLink.tsx` | MODIFICAR |
| `app/layout.tsx` | MODIFICAR (adicionar LoadingOverlay) |

---

## Critérios de Sucesso

1. Ao clicar em qualquer link de navegação, overlay aparece em < 100ms
2. Overlay desaparece quando a página está pronta
3. Não há flash ou flicker entre estados
4. Funciona em todas as roles (admin, professor, viewer, master)
5. Funciona em mobile e desktop
6. Barra de progresso no topo + overlay central = feedback duplo
