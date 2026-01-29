---
status: concluido
generated: 2026-01-25
completed: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Design e implementacao da nova logo em SVG"
  - type: "documentation-writer"
    role: "Atualizar referencias da logo na documentacao"
phases:
  - id: "phase-1"
    name: "Aprovacao do Design"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Plano: Substituicao e Criacao de Nova Logo Focus

> Substituir a logo atual (circulos concentricos generica) por uma nova logo criativa e original que represente melhor o sistema Focus de gestao escolar

## Task Snapshot

- **Primary goal:** Criar uma identidade visual unica e memoravel para o sistema Focus
- **Success signal:** Nova logo implementada em todos os locais, testes passando, emails renderizando corretamente
- **Key references:**
  - `components/FocusLogo.tsx` - Componente principal
  - `app/icon.svg` - Favicon
  - `lib/email/sendVerificationEmail.ts` - Logo em emails

---

## Problema Atual

| Aspecto | Situacao Atual |
|---------|----------------|
| Logo | 3 circulos concentricos (target/foco) |
| Originalidade | Generica, possivelmente usada por outros apps |
| Identidade | Nao transmite contexto educacional |
| Diferenciacao | Nao destaca o produto no mercado |

---

## Arquivos a Modificar

### 1. Componente Principal
**Arquivo:** `components/FocusLogo.tsx`
- SVG inline da logo
- Usado em: Sidebar, pagina de login, pagina inicial
- Tamanhos: sm (24px), md (32px), lg (48px)
- Variantes: default (azul), white (branco)

### 2. Favicon/Icone do App
**Arquivo:** `app/icon.svg`
- SVG estatico para favicon
- Deve funcionar em 32x32 e 16x16

### 3. Logo em Emails HTML
**Arquivo:** `lib/email/sendVerificationEmail.ts`
- `focusLogo()` - versao CSS puro
- `focusLogoTable()` - versao compativel com Gmail/Outlook
- Renderizado em HTML/CSS puro (sem SVG externo)

### 4. Testes E2E
**Arquivo:** `e2e/smoke.spec.ts`
- Verifica se texto "Focus" esta visivel

---

## Conceitos de Logo Propostos

### Conceito 1: Prancheta Focus (Ideia do Usuario)

Uma prancheta de clipboard com a letra "F" formada pelo clipe superior e linhas de checklist.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="20" height="24" rx="2" fill="#2563eb"/>
  <path d="M11 2h10a2 2 0 012 2v2H9V4a2 2 0 012-2z" fill="#1e3a5f"/>
  <rect x="13" y="1" width="6" height="4" rx="1" fill="#1e3a5f"/>
  <rect x="14" y="3" width="4" height="1" fill="#60a5fa"/>
  <rect x="10" y="12" width="12" height="2" rx="1" fill="#ffffff" opacity="0.8"/>
  <rect x="10" y="17" width="10" height="2" rx="1" fill="#ffffff" opacity="0.6"/>
  <rect x="10" y="22" width="8" height="2" rx="1" fill="#ffffff" opacity="0.4"/>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Medio |
| Unicidade | Baixo |
| Favicon | Bom |
| Versatilidade | Alta |
| **Nota** | **6/10** |

---

### Conceito 2: F em Foco (Lupa)

Lente de aumento circular com a letra "F" no centro.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="22" y="22" width="8" height="3" rx="1.5" transform="rotate(45 22 22)" fill="#1e3a5f"/>
  <circle cx="14" cy="14" r="12" fill="#1e3a5f"/>
  <circle cx="14" cy="14" r="10" fill="#2563eb"/>
  <text x="14" y="19" font-family="Arial Black" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">F</text>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Medio |
| Unicidade | Baixo |
| Favicon | Otimo |
| Versatilidade | Media |
| **Nota** | **5/10** |

**Problema:** Pode confundir com icone de busca

---

### Conceito 3: Livro Aberto com F

Livro aberto visto de cima com letra F centralizada na lombada.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 8L4 4v22l12 4V8z" fill="#f8fafc" stroke="#1e3a5f" stroke-width="1"/>
  <path d="M16 8L28 4v22l-12 4V8z" fill="#f8fafc" stroke="#1e3a5f" stroke-width="1"/>
  <rect x="15" y="6" width="2" height="24" fill="#1e3a5f"/>
  <text x="16" y="21" font-family="Arial Black" font-size="12" font-weight="900" fill="#2563eb" text-anchor="middle">F</text>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Alto |
| Unicidade | Medio |
| Favicon | Bom |
| Versatilidade | Media |
| **Nota** | **7/10** |

---

### Conceito 4: Shield Focus (Escudo)

Escudo protetor moderno com letra F central - transmite seguranca e cuidado com alunos.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 2L4 6v10c0 8 12 14 12 14s12-6 12-14V6L16 2z" fill="#1e3a5f"/>
  <path d="M16 5L7 8v8c0 6 9 11 9 11s9-5 9-11V8L16 5z" fill="#2563eb"/>
  <text x="16" y="20" font-family="Arial Black" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">F</text>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Baixo |
| Unicidade | Alto |
| Favicon | Otimo |
| Versatilidade | Alta |
| **Nota** | **7/10** |

---

### Conceito 5: Dashboard Focus

Grid de dashboard com F destacado no quadrante principal e mini-graficos.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="28" height="28" rx="4" fill="#1e3a5f"/>
  <rect x="4" y="4" width="14" height="14" rx="2" fill="#2563eb"/>
  <text x="11" y="15" font-family="Arial Black" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">F</text>
  <rect x="20" y="4" width="8" height="6" rx="1" fill="#60a5fa"/>
  <rect x="20" y="12" width="8" height="6" rx="1" fill="#34d399"/>
  <rect x="4" y="20" width="8" height="8" rx="1" fill="#60a5fa"/>
  <rect x="14" y="20" width="14" height="8" rx="1" fill="#3b82f6"/>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Baixo |
| Unicidade | Medio |
| Favicon | Bom |
| Versatilidade | Alta |
| **Nota** | **6/10** |

---

### Conceito 6: F Geometrico Moderno

Letra F construida com formas geometricas + circulo de foco no canto.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="4" width="6" height="24" rx="2" fill="#2563eb"/>
  <rect x="10" y="4" width="16" height="6" rx="2" fill="#2563eb"/>
  <rect x="10" y="13" width="12" height="5" rx="2" fill="#2563eb"/>
  <circle cx="24" cy="24" r="4" fill="#1e3a5f"/>
  <circle cx="24" cy="24" r="1.5" fill="#ffffff"/>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Medio |
| Unicidade | Alto |
| Favicon | Otimo |
| Versatilidade | Muito Alta |
| **Nota** | **8/10** |

---

### Conceito 7: Clipboard F Hibrido (RECOMENDADO)

Combina prancheta simplificada com F geometrico dentro - une a ideia do usuario com design moderno.

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="7" width="22" height="23" rx="3" fill="#2563eb"/>
  <path d="M10 2h12a2 2 0 012 2v4H8V4a2 2 0 012-2z" fill="#1e3a5f"/>
  <rect x="10" y="4" width="8" height="2" rx="1" fill="#60a5fa"/>
  <rect x="8" y="11" width="16" height="16" rx="2" fill="#ffffff"/>
  <rect x="11" y="14" width="3" height="10" rx="1" fill="#1e3a5f"/>
  <rect x="11" y="14" width="8" height="3" rx="1" fill="#1e3a5f"/>
  <rect x="11" y="18" width="6" height="2" rx="1" fill="#1e3a5f"/>
</svg>
```

| Aspecto | Avaliacao |
|---------|-----------|
| Educacional | Alto |
| Unicidade | Alto |
| Favicon | Otimo |
| Versatilidade | Alta |
| **Nota** | **9/10** |

**Por que e o melhor:**
- Une a ideia original do usuario (prancheta + F)
- Design moderno e limpo
- Conexao clara com gestao/registro educacional
- Funciona bem em todos os tamanhos
- Diferenciado no mercado

---

## Comparativo Final

| # | Conceito | Educacional | Unico | Favicon | Versatil | Nota |
|---|----------|-------------|-------|---------|----------|------|
| 1 | Prancheta | Medio | Baixo | Bom | Alta | 6/10 |
| 2 | Lupa | Medio | Baixo | Otimo | Media | 5/10 |
| 3 | Livro | Alto | Medio | Bom | Media | 7/10 |
| 4 | Escudo | Baixo | Alto | Otimo | Alta | 7/10 |
| 5 | Dashboard | Baixo | Medio | Bom | Alta | 6/10 |
| 6 | F Geometrico | Medio | Alto | Otimo | Muito Alta | 8/10 |
| **7** | **Clipboard F** | **Alto** | **Alto** | **Otimo** | **Alta** | **9/10** |

---

## Paleta de Cores

| Nome | Hex | Uso |
|------|-----|-----|
| Primary Dark | `#1e3a5f` | Elementos de destaque, clipe |
| Primary | `#2563eb` | Cor principal da logo |
| Primary Light | `#60a5fa` | Detalhes, acentos |
| Success | `#34d399` | Elementos de dashboard |
| White | `#ffffff` | Fundo interno, variante escura |

---

## Fases de Implementacao

### Fase 1: Aprovacao do Design
- [x] Usuario escolhe conceito preferido (Conceito 6: F Geometrico)
- [x] Ajustes finos no SVG escolhido
- [x] Validacao visual em diferentes tamanhos

### Fase 2: Implementacao
- [x] Atualizar `components/FocusLogo.tsx` com novo SVG
- [x] Atualizar `app/icon.svg` (versao favicon)
- [x] Atualizar `lib/email/sendVerificationEmail.ts` (versao HTML/CSS)
- [x] Testar variantes claro/escuro

### Fase 3: Validacao
- [ ] Rodar testes E2E (`npm run test:e2e`)
- [ ] Enviar email de teste (`POST /api/test-email`)
- [x] Build de producao (`npm run build`) - PASSOU
- [ ] Commit das mudancas

---

## Proximos Passos

1. **Usuario escolhe** qual conceito de logo prefere (1-7)
2. **Implementacao** nos arquivos listados
3. **Testes** visuais e automatizados
4. **Deploy** da nova identidade visual

---

## Rollback

Se a nova logo causar problemas:
- Reverter commits do git
- Arquivos afetados sao apenas frontend (sem impacto em dados)
