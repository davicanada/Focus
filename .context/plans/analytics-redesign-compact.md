# Plano: Redesign da Aba Analytics - Layout Compacto

## Referência Visual
Baseado na imagem `New-Analytics-Tab.png`:
- Layout mais compacto em grid 2x2
- Headers de cards com fundo azul escuro (#153461)
- Cores suaves em tons de azul
- Tipografia menor e mais limpa
- Cross-filtering mantido

## Layout Desejado

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Header: Administrador]                          [Jônatas Maciel Edgar] │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ ▓▓ Tendência Mensal - 2026    │  │ ▓▓ Distribuição por Categoria      │
│    Ocorrências por mês         │  │    Por tipo (clique para filtrar)  │
├────────────────────────────────┤  ├────────────────────────────────────┤
│                                │  │                                    │
│   ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓    │  │   Atraso          ████████████    │
│   Jan Feb Mar Apr...           │  │   Desrespeito     ████████        │
│                                │  │   Briga           ██████          │
└────────────────────────────────┘  └────────────────────────────────────┘

┌────────────────────────────────┐  ┌────────────────────────────────────┐
│ ▓▓ Por Nível │ ▓▓ Por Turno   │  │ ▓▓ Ocorrências por Turma           │
│              │                 │  │    Severidade: max/média/min       │
├──────────────┼─────────────────┤  ├────────────────────────────────────┤
│    🔵        │      🔵        │  │   1º Ano A        ████████████     │
│   Donut      │     Donut      │  │   2º Ano B        ██████████       │
└──────────────┴─────────────────┘  └────────────────────────────────────┘
```

## Mudanças de Design

### 1. Nova Paleta de Cores (Tons de Azul Suave)

**Cores Primárias (harmonizadas com #153461):**
```typescript
export const ANALYTICS_COLORS = {
  // Header dos cards
  headerBg: '#153461',      // Azul escuro (identidade Focus)
  headerText: '#ffffff',    // Branco

  // Barras dos gráficos - Escala de azul suave
  bars: {
    primary: '#4A90D9',     // Azul médio suave
    secondary: '#7BB3E8',   // Azul claro
    tertiary: '#A8D0F5',    // Azul muito claro
    light: '#D4E8FA',       // Azul quase branco
  },

  // Severidade (manter semântico mas mais suave)
  severity: {
    grave: '#E57373',       // Vermelho suave
    media: '#FFD54F',       // Amarelo suave
    leve: '#81C784',        // Verde suave
  },

  // Donuts - tons de azul
  donut: [
    '#153461',   // Azul escuro
    '#2E5A8E',   // Azul médio escuro
    '#4A90D9',   // Azul médio
    '#7BB3E8',   // Azul claro
    '#A8D0F5',   // Azul muito claro
  ],
};
```

### 2. Componente Card com Header Azul

**Criar novo componente `AnalyticsCard`:**
```tsx
interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

function AnalyticsCard({ title, subtitle, children, className }: AnalyticsCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="bg-[#153461] px-4 py-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="text-xs text-white/70">{subtitle}</p>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
```

### 3. Layout Grid Compacto

**Estrutura JSX:**
```tsx
<div className="space-y-4">
  {/* Header com filtros */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-bold">Analytics</h1>
    </div>
    <div className="flex items-center gap-2">
      {/* Year filter + Clear filters */}
    </div>
  </div>

  {/* Row 1: Tendência + Categoria */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <AnalyticsCard title="Tendência Mensal - 2026" subtitle="Ocorrências por mês (clique para filtrar)">
      {/* Bar chart */}
    </AnalyticsCard>
    <AnalyticsCard title="Distribuição por Categoria" subtitle="Por tipo (clique para filtrar)">
      {/* Horizontal bars */}
    </AnalyticsCard>
  </div>

  {/* Row 2: Donuts lado a lado + Turmas */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Card com 2 donuts lado a lado */}
    <div className="grid grid-cols-2 gap-4">
      <AnalyticsCard title="Por Nível de Ensino" subtitle="Por nível (clique para filtrar)">
        {/* Donut pequeno */}
      </AnalyticsCard>
      <AnalyticsCard title="Por Turno" subtitle="Por período (clique para filtrar)">
        {/* Donut pequeno */}
      </AnalyticsCard>
    </div>
    <AnalyticsCard title="Ocorrências por Turma" subtitle="Severidade: max/média/min (clique para filtrar)">
      {/* Horizontal bars */}
    </AnalyticsCard>
  </div>
</div>
```

### 4. Ajustes nos Gráficos

**Tendência Mensal (Bar Chart):**
- Cor única: `#4A90D9` (azul suave)
- Altura: 200px (mais compacto)
- Labels menores: fontSize 10
- Grid mais limpo

**Distribuição por Categoria (Horizontal Bars):**
- Gradiente de azuis: mais escuro = mais ocorrências
- Barras mais finas: barMaxWidth 15
- Labels inline à direita
- Altura dinâmica mas menor

**Por Nível de Ensino / Por Turno (Donuts):**
- Escala de azuis (não cores diferentes)
- Raio menor: ['35%', '65%']
- Labels: apenas porcentagem
- Legenda abaixo compacta
- Altura: 180px

**Ocorrências por Turma (Horizontal Bars):**
- Cor única ou gradiente de azuis
- Indicador visual para max (vermelho suave) e min (verde suave)
- Barras mais finas

### 5. Remover do Layout

- **Gráfico "Alunos com Ocorrências"**: Mover para seção inferior ou remover
- **Gráfico "Distribuição por Severidade"**: Informação já está implícita na legenda de turmas
- **Tabela "Alunos sem Ocorrências"**: Mover para seção inferior ou modal
- **AI Chat**: Manter abaixo como seção separada

### 6. Tipografia Compacta

```css
/* Títulos dos cards */
.card-title {
  font-size: 14px;    /* de 18px para 14px */
  font-weight: 600;
}

/* Subtítulos */
.card-subtitle {
  font-size: 11px;    /* de 14px para 11px */
  opacity: 0.7;
}

/* Labels dos gráficos */
.chart-label {
  font-size: 10px;    /* de 12px para 10px */
}
```

## Arquivos a Modificar

1. **`lib/utils.ts`**
   - Adicionar `ANALYTICS_COLORS` com nova paleta

2. **`app/admin/dashboard/page.tsx`**
   - Criar componente `AnalyticsCard`
   - Reorganizar layout para grid 2x2
   - Atualizar cores dos gráficos
   - Reduzir alturas e fontes
   - Remover/mover seções extras

3. **`app/globals.css`** (opcional)
   - Adicionar classes utilitárias se necessário

## Ordem de Implementação

1. Adicionar nova paleta de cores em `lib/utils.ts`
2. Criar componente `AnalyticsCard` inline no arquivo
3. Reorganizar layout JSX
4. Atualizar `monthlyChartOption` com cores suaves
5. Atualizar `categoryChartOption` com gradiente azul
6. Atualizar donuts (educationLevel + shift) com escala azul
7. Atualizar `classChartOption` com indicadores suaves
8. Remover/mover gráficos extras (alunos, severidade, tabela)
9. Ajustar tamanhos e fontes
10. Testar cross-filtering

## Considerações

- **Cross-filtering**: DEVE ser mantido - apenas mudança visual
- **Responsividade**: Grid colapsa para 1 coluna em mobile
- **Acessibilidade**: Manter contraste adequado nos headers
- **Performance**: Menos gráficos = carregamento mais rápido

## Validação

- [ ] Layout 2x2 funcionando em desktop
- [ ] Headers azul escuro (#153461)
- [ ] Cores suaves em tons de azul
- [ ] Cross-filtering funcionando em todos os gráficos
- [ ] Layout responsivo em mobile
- [ ] Tipografia menor e mais limpa
