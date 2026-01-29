---
status: concluido
generated: 2026-01-25
completed: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Converter PNG para SVG e implementar componentes"
phases:
  - id: "phase-1"
    name: "Analise e Conversao SVG"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Plano: Logo Oficial Focus (PNG para SVG)

> Converter a logo PNG fornecida pelo usuario em SVG vetorial e implementar em todos os locais do sistema

## Arquivo Original

**Arquivo:** `New-Logo.png`

## Analise da Logo

### Elementos Visuais Identificados

```
┌────────────────────────────────────┐
│           ┌─────────┐              │
│           │  FOCUS  │              │  ← Texto "FOCUS" (branco, bold)
│           └─────────┘              │
│                                    │
│         ┌─────────────┐            │
│        ╱               ╲           │  ← Escudo/Livro aberto
│       │   ┌───────┐    │           │
│       │   │  ◯    │────┤           │  ← Lupa com "F" dentro
│       │   │  F    │    │           │
│       │   └───────┘    │           │
│       │   ═══════════  │           │  ← Linhas horizontais (dados/texto)
│       │   ═══════════  │           │
│        ╲             ╱             │
│         └───────────┘              │
│                                    │
│        Gestao Escolar              │  ← Subtitulo (branco)
│                                    │
└────────────────────────────────────┘
         Fundo: Azul escuro (#2d3a5c)
         Badge circular 3D com sombra
```

### Cores Identificadas

| Elemento | Cor Aproximada | Hex |
|----------|----------------|-----|
| Fundo do badge | Azul marinho escuro | `#2d3a5c` |
| Texto/Icone | Branco | `#ffffff` |
| Sombra | Preto com opacidade | `rgba(0,0,0,0.3)` |

### Significado dos Elementos

| Elemento | Significado |
|----------|-------------|
| Escudo | Protecao, seguranca dos alunos |
| Livro aberto | Educacao, conhecimento |
| Lupa | Foco, atencao, monitoramento |
| Letra "F" | Inicial de "Focus" |
| Linhas horizontais | Dados, registros, documentacao |
| Circulo 3D | Modernidade, aplicativo |

---

## Arquivos a Modificar

### 1. Componente Principal
**Arquivo:** `components/FocusLogo.tsx`
- Versao completa: Icone + "Focus" + "Gestao Escolar"
- Versao simplificada: Apenas icone (para sidebar colapsado)
- Variantes: default (fundo azul), white (sem fundo, icone branco)

### 2. Favicon
**Arquivo:** `app/icon.svg`
- Versao simplificada do icone (sem texto)
- Deve funcionar em 32x32 e 16x16
- Apenas escudo+lupa+F

### 3. Emails HTML
**Arquivo:** `lib/email/sendVerificationEmail.ts`
- Versao CSS puro do icone
- Compativel com Gmail/Outlook
- Header com fundo azul

### 4. Assets Estaticos (NOVO)
**Arquivo:** `public/logo.png` ou `public/logo.svg`
- Manter PNG original para uso em documentos
- SVG para uso web

---

## SVG Proposto para o Icone

### Versao Completa (com badge circular)

```svg
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Sombra do badge -->
  <ellipse cx="52" cy="90" rx="35" ry="8" fill="rgba(0,0,0,0.2)"/>

  <!-- Badge circular com gradiente -->
  <circle cx="50" cy="45" r="42" fill="url(#badgeGradient)"/>

  <!-- Escudo/Livro base -->
  <path d="M30 28 L50 22 L70 28 L70 55 C70 60 60 68 50 72 C40 68 30 60 30 55 Z"
        fill="none" stroke="#ffffff" stroke-width="2.5"/>

  <!-- Pagina do livro (lado esquerdo) -->
  <path d="M32 30 L48 25 L48 52 C48 56 40 62 32 52 Z"
        fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>

  <!-- Lupa -->
  <circle cx="52" cy="40" r="10" fill="none" stroke="#ffffff" stroke-width="2.5"/>
  <line x1="59" y1="47" x2="66" y2="54" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Letra F dentro da lupa -->
  <text x="52" y="44" font-family="Arial Black, sans-serif" font-size="12"
        font-weight="900" fill="#ffffff" text-anchor="middle">F</text>

  <!-- Linhas de texto/dados -->
  <line x1="38" y1="56" x2="62" y2="56" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <line x1="40" y1="62" x2="60" y2="62" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

  <!-- Gradiente do badge -->
  <defs>
    <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3d4a6c"/>
      <stop offset="100%" style="stop-color:#2d3a5c"/>
    </linearGradient>
  </defs>
</svg>
```

### Versao Favicon (simplificada, sem badge)

```svg
<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Escudo -->
  <path d="M6 8 L16 5 L26 8 L26 20 C26 23 21 27 16 29 C11 27 6 23 6 20 Z"
        fill="#2d3a5c" stroke="#2d3a5c" stroke-width="1"/>

  <!-- Lupa -->
  <circle cx="16" cy="14" r="5" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <line x1="20" y1="18" x2="23" y2="21" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>

  <!-- F -->
  <text x="16" y="16" font-family="Arial" font-size="6" font-weight="bold"
        fill="#ffffff" text-anchor="middle">F</text>

  <!-- Linhas -->
  <line x1="10" y1="22" x2="22" y2="22" stroke="#ffffff" stroke-width="1" opacity="0.8"/>
  <line x1="11" y1="25" x2="21" y2="25" stroke="#ffffff" stroke-width="1" opacity="0.6"/>
</svg>
```

---

## Variantes do Componente

### 1. Logo Completa (sidebar expandido, pagina inicial)
- Badge circular azul
- Icone branco
- Texto "Focus" em branco
- Subtitulo "Gestao Escolar"

### 2. Logo Compacta (sidebar colapsado)
- Apenas icone (escudo+lupa+F)
- Sem texto
- Fundo azul ou transparente

### 3. Logo para Fundo Claro
- Icone com fundo azul (badge)
- Ou icone azul sem fundo

### 4. Logo para Fundo Escuro (emails)
- Icone branco
- Texto branco

---

## Fases de Implementacao

### Fase 1: Conversao e Criacao do SVG
- [x] Criar SVG vetorial baseado no PNG (New-Logo2.png - versao flat)
- [x] Testar em diferentes tamanhos
- [x] Criar versao favicon (simplificada)
- [x] Validar cores com usuario (#2d3a5f azul escuro)

### Fase 2: Implementacao no Codigo
- [x] Atualizar `components/FocusLogo.tsx`
  - Adicionada variante com badge circular
  - Adicionada prop `showText` para controlar texto
  - Mantido suporte a tamanhos (sm, md, lg)
  - Texto "Gestao Escolar" como subtitulo
- [x] Atualizar `app/icon.svg` (favicon com escudo azul)
- [x] Atualizar `lib/email/sendVerificationEmail.ts`
- [x] Salvar PNG original em `public/logo.png`

### Fase 3: Validacao
- [x] Build de producao - PASSOU
- [ ] Teste visual no navegador
- [ ] Teste de email
- [ ] Testes E2E

---

## Decisoes Pendentes

1. **Badge 3D ou Flat?**
   - PNG tem efeito 3D com sombra
   - SVG pode ser flat (mais leve) ou simular 3D

2. **Texto no componente?**
   - Incluir "FOCUS" e "Gestao Escolar" no SVG?
   - Ou manter texto separado como elemento HTML?

3. **Favicon colorido ou monocromatico?**
   - Escudo azul com icone branco (como PNG)
   - Ou versao simplificada

---

## Proximos Passos

1. **Aprovar SVG proposto** - Usuario valida se o SVG reproduz fielmente o PNG
2. **Implementar componente** - Atualizar FocusLogo.tsx
3. **Atualizar favicon** - icon.svg
4. **Atualizar emails** - sendVerificationEmail.ts
5. **Build e teste** - Validar tudo funciona
