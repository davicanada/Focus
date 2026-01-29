---
status: ready
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Definir paleta de cores harmoniosa e implementar no dashboard"
phases:
  - id: "phase-1"
    name: "Análise e Design da Paleta"
    prevc: "P"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
  - id: "phase-3"
    name: "Validação Visual"
    prevc: "V"
---

# Harmonização de Cores dos Gráficos do Analytics Plan

> Redesenhar paleta de cores dos gráficos para maior harmonia visual e consistência

## Task Snapshot
- **Primary goal:** Criar uma paleta de cores coesa e harmoniosa para todos os gráficos do Analytics Dashboard, melhorando a experiência visual.
- **Success signal:** Todos os gráficos usam cores da mesma paleta, com contraste adequado e identidade visual consistente.
- **Key references:**
  - `app/admin/dashboard/page.tsx` - Dashboard Analytics
  - `lib/utils.ts` - Constante `CHART_COLORS`
  - [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)

## Análise do Estado Atual

### Cores Atuais em Uso

#### 1. Paleta Global (`lib/utils.ts`)
```typescript
export const CHART_COLORS = {
  primary: '#1e3a5f',    // Azul escuro
  secondary: '#3d5a80',  // Azul médio
  success: '#10b981',    // Verde (Emerald 500)
  warning: '#f59e0b',    // Amarelo/Laranja (Amber 500)
  danger: '#ef4444',     // Vermelho (Red 500)
  info: '#3b82f6',       // Azul claro (Blue 500)
  gray: '#6b7280',       // Cinza (Gray 500)
  palette: [
    '#1e3a5f', '#3d5a80', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
  ]
};
```

#### 2. Gráfico de Severidade (Hardcoded)
```typescript
color: [CHART_COLORS.warning, '#f97316', CHART_COLORS.danger]
// warning: #f59e0b (Amber 500)
// #f97316 (Orange 500)
// danger: #ef4444 (Red 500)
```
**Problema:** Transição Amarelo → Laranja → Vermelho é lógica para severidade, mas usa cor hardcoded.

#### 3. Gráfico de Nível de Ensino (Hardcoded)
```typescript
color: ['#8B5CF6', '#06B6D4', '#F59E0B', '#6B7280']
// Purple 500, Cyan 500, Amber 500, Gray 500
```
**Problema:** Cores escolhidas aleatoriamente, sem relação com a paleta principal.

#### 4. Gráfico de Turmas (Hardcoded)
```typescript
color: '#6B7280' // Cinza padrão
color: '#EF4444' // Vermelho para MAX
color: '#10B981' // Verde para MIN
```
**Problema:** Consistente com success/danger, mas usa HEX hardcoded em vez de constantes.

### Problemas Identificados

| Problema | Impacto | Gráficos Afetados |
| --- | --- | --- |
| Cores hardcoded em vez de constantes | Manutenção difícil | Severidade, Nível, Turmas |
| Paleta sem harmonia de matiz | Visual desconexo | Todos |
| Azul escuro (#1e3a5f) difícil de ver | Legibilidade reduzida | Categoria, Tendência |
| Cores competem visualmente | Confusão visual | Todos os gráficos |

## Proposta de Nova Paleta

### Conceito: Escala Monocromática com Acentos Semânticos

Usar uma **paleta baseada em azul** (cor primária do app Focus) com **acentos semânticos** para categorias especiais. A estratégia usa:

1. **Cores Analogous** - cores adjacentes no círculo cromático para harmonia
2. **Cores Semânticas** - verde/amarelo/vermelho para significado universal
3. **Consistência Tailwind** - usar cores do sistema Tailwind para facilitar manutenção

### Nova Paleta Proposta

```typescript
export const CHART_COLORS = {
  // === CORES PRIMÁRIAS (Escala de Azul - identidade Focus) ===
  primary: '#2563eb',      // Blue 600 - mais vibrante e moderno
  primaryLight: '#3b82f6', // Blue 500
  primaryDark: '#1d4ed8',  // Blue 700

  // === CORES SEMÂNTICAS (Significado universal) ===
  success: '#22c55e',      // Green 500 - verde mais vibrante
  warning: '#eab308',      // Yellow 500 - amarelo mais puro (menos laranja)
  danger: '#ef4444',       // Red 500 - manter

  // === NEUTROS ===
  gray: '#6b7280',         // Gray 500
  grayLight: '#9ca3af',    // Gray 400

  // === PALETA PARA CATEGORIAS (Cores Analogous - harmoniosas) ===
  palette: [
    '#2563eb', // Blue 600   - Azul principal
    '#0891b2', // Cyan 600   - Transição para frio
    '#0d9488', // Teal 600   - Verde-azulado
    '#059669', // Emerald 600 - Verde
    '#65a30d', // Lime 600   - Verde-amarelado
    '#ca8a04', // Yellow 600 - Amarelo
    '#ea580c', // Orange 600 - Laranja
    '#dc2626', // Red 600    - Vermelho
  ],

  // === SEVERIDADE (Gradiente semântico) ===
  severity: {
    leve: '#22c55e',    // Green 500 - Calmo
    media: '#eab308',   // Yellow 500 - Atenção
    grave: '#ef4444',   // Red 500 - Alerta
  },

  // === NÍVEL DE ENSINO (Tons complementares distintos) ===
  educationLevel: {
    infantil: '#a855f7',   // Purple 500 - Lúdico, criativo
    fundamental: '#3b82f6', // Blue 500 - Tradicional, confiável
    medio: '#14b8a6',      // Teal 500 - Maduro, transição
    custom: '#6b7280',     // Gray 500 - Neutro
  },
};
```

### Justificativa das Escolhas

#### 1. Cores Primárias Mais Vibrantes
- **Antes:** `#1e3a5f` (azul muito escuro, baixo contraste)
- **Depois:** `#2563eb` (Blue 600, vibrante mas profissional)
- **Razão:** Melhor legibilidade em backgrounds claros, visual mais moderno

#### 2. Paleta Analogous para Categorias
As 8 cores seguem uma progressão no círculo cromático:
```
Azul → Ciano → Teal → Verde → Lima → Amarelo → Laranja → Vermelho
```
Isso cria **harmonia visual natural** porque cores adjacentes compartilham matizes.

#### 3. Severidade com Semântica Universal
- **Verde** = Seguro/Baixo (leve)
- **Amarelo** = Atenção/Médio (média) - usando amarelo puro em vez de âmbar
- **Vermelho** = Perigo/Alto (grave)

#### 4. Níveis de Ensino com Identidade
- **Infantil** (Purple) = Criatividade, imaginação
- **Fundamental** (Blue) = Solidez, aprendizado estruturado
- **Médio** (Teal) = Maturidade, transição para adulto
- **Outro** (Gray) = Neutro, não categorizado

## Agent Lineup
| Agent | Role | First Focus |
| --- | --- | --- |
| Frontend Specialist | Design e implementação da paleta | Atualizar `lib/utils.ts` e aplicar nos gráficos |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Cores não agradam o usuário | Medium | Low | Preview antes de finalizar |
| Perda de semântica visual | Low | Medium | Manter verde/amarelo/vermelho |
| Contraste insuficiente | Low | Medium | Testar com ferramentas de acessibilidade |

### Dependencies
- **Internal:** Nenhuma
- **External:** Nenhuma
- **Technical:** Nenhuma

### Assumptions
- Usuário prefere paleta mais vibrante e moderna
- Cores Tailwind são adequadas para o projeto

## Working Phases

### Phase 1 — Análise e Design da Paleta (CONCLUÍDO)

**Análise Realizada:**
1. Mapeadas todas as cores hardcoded no dashboard
2. Identificados problemas de harmonia e consistência
3. Projetada nova paleta baseada em cores analogous
4. Definida semântica para severidade e níveis de ensino

### Phase 2 — Implementação

**Step 2.1: Atualizar CHART_COLORS em lib/utils.ts**
Substituir a constante atual pela nova paleta proposta.

**Step 2.2: Atualizar severityChartOption**
```typescript
// Antes
color: [CHART_COLORS.warning, '#f97316', CHART_COLORS.danger]

// Depois
color: [
  CHART_COLORS.severity.leve,
  CHART_COLORS.severity.media,
  CHART_COLORS.severity.grave
]
```

**Step 2.3: Atualizar educationLevelChartOption**
```typescript
// Antes
color: ['#8B5CF6', '#06B6D4', '#F59E0B', '#6B7280']

// Depois
color: [
  CHART_COLORS.educationLevel.infantil,
  CHART_COLORS.educationLevel.fundamental,
  CHART_COLORS.educationLevel.medio,
  CHART_COLORS.educationLevel.custom,
]
```

**Step 2.4: Atualizar classChartOption**
```typescript
// Antes
color: '#EF4444' // hardcoded
color: '#10B981' // hardcoded

// Depois
color: CHART_COLORS.danger
color: CHART_COLORS.success
```

**Step 2.5: Atualizar categoryChartOption**
Usar `CHART_COLORS.primary` para cor padrão das barras.

**Step 2.6: Atualizar monthlyChartOption**
Usar `CHART_COLORS.primary` para cor das barras.

### Phase 3 — Validação Visual

**Checklist:**
- [ ] Todos os gráficos usam cores da nova paleta
- [ ] Nenhum HEX hardcoded restante (exceto dentro de CHART_COLORS)
- [ ] Contraste adequado em todos os elementos
- [ ] Severidade mantém semântica (verde → amarelo → vermelho)
- [ ] Níveis de ensino têm cores distintas e identificáveis
- [ ] Build passa sem erros

## Rollback Plan

### Rollback Triggers
- Cores não aprovadas pelo usuário
- Problemas de acessibilidade/contraste identificados
- Feedback negativo sobre legibilidade

### Rollback Procedures
- **Ação:** Reverter alterações em `lib/utils.ts` e `dashboard/page.tsx` via git
- **Impacto:** Nenhum em dados - apenas mudança visual
- **Tempo estimado:** < 30 minutos

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot de todos os gráficos com nova paleta
- [ ] Comparativo antes/depois
- [ ] Build passando
- [ ] Feedback do usuário sobre harmonia visual
