---
status: ready
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Implementar filtro de ano, ajustes nos graficos e responsividade do sidebar"
  - type: "feature-developer"
    role: "Implementar logica de filtragem por ano e ajuste do grafico mensal"
phases:
  - id: "phase-1"
    name: "Analise e Design"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Analytics - Filtro de Ano + Melhorias nos Graficos Plan

> Adicionar filtro de ano, ajustar grafico mensal para Jan-Dez, corrigir truncamento de categorias e responsividade com sidebar

## Task Snapshot
- **Primary goal:** Melhorar a aba Analytics com filtro de ano, grafico mensal completo (Jan-Dez), e corrigir problema de largura dos graficos quando sidebar e colapsado.
- **Success signal:**
  - Slicer de ano no topo filtra todos os dados
  - Grafico mensal mostra Jan a Dez do ano selecionado
  - Nomes das categorias aparecem completos
  - Graficos expandem quando sidebar e colapsado
- **Key references:**
  - `app/admin/dashboard/page.tsx` - Dashboard Analytics
  - `components/layout/Sidebar.tsx` - Sidebar com estado `collapsed`
  - `components/layout/DashboardLayout.tsx` - Layout principal

## Codebase Context

### 1. Estado Atual do Grafico Mensal (linhas 185-221)
```typescript
// Atualmente: ultimos 6 meses dinamicos
for (let i = 5; i >= 0; i--) {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  // ...
}
```

**Problema:** Mostra apenas 6 meses, nao o ano completo.

### 2. Estado Atual do Grafico de Categoria (linhas 436-467)
```typescript
const categoryChartOption = {
  yAxis: {
    axisLabel: { width: 120, overflow: 'truncate' }, // MUITO PEQUENO
  },
  // ...
};
```

**Problema:** `width: 120` trunca nomes como "Conversa Durante a Aula" para "Conversa Durante...".

### 3. Estado Atual do Sidebar (Sidebar.tsx linhas 59-105)
```typescript
const [collapsed, setCollapsed] = useState(false);
// ...
collapsed ? 'md:w-16' : 'md:w-64',
```

**Problema:** O estado `collapsed` e local ao Sidebar, mas o `DashboardLayout` tem `pl-64` fixo:
```typescript
// DashboardLayout.tsx linha 49
"pl-0 md:pl-64", // NAO RESPONDE ao collapsed
```

### 4. FilterState Atual (linha 18-26)
```typescript
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
  educationLevels: string[];
}
```

**Falta:** `year: number` para filtro de ano.

## Mudancas Solicitadas

### 1. Filtro de Ano (Slicer) no Topo
- Adicionar state `selectedYear` com default = ano atual
- Adicionar select/dropdown no topo da pagina
- Opcoes: anos com dados (ex: 2024, 2025, 2026)
- Filtrar TODOS os dados pelo ano selecionado

### 2. Grafico de Tendencia Mensal
- **Antes:** Ultimos 6 meses dinamicos
- **Depois:** Janeiro a Dezembro do ano selecionado
- Remover numeros do eixo Y (`yAxis: { show: false }`)
- Adicionar data labels em cada coluna

### 3. Grafico de Distribuicao por Categoria
- Aumentar `axisLabel.width` de 120 para 200+
- Considerar nomes completos ou tooltip
- Ajustar altura para comportar todas as categorias

### 4. Responsividade com Sidebar Colapsado
- Levantar estado `collapsed` para DashboardLayout
- Passar `collapsed` como prop para Sidebar
- Ajustar padding do main content: `pl-64` -> `pl-16` quando colapsado
- Graficos devem expandir para ocupar espaco extra

## Agent Lineup
| Agent | Role | First Focus |
| --- | --- | --- |
| Frontend Specialist | Layout e responsividade | Sidebar collapse + graficos expandiveis |
| Feature Developer | Logica de filtragem | Filtro de ano + grafico mensal Jan-Dez |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Queries ficam lentas com ano completo | Low | Medium | Usar Promise.all para paralelizar |
| Labels de categoria ultrapassam container | Medium | Low | Usar tooltip para nomes muito longos |
| Cross-filtering quebra com novo filtro | Low | High | Testar todos os graficos apos mudanca |

### Dependencies
- **Internal:** Nenhuma - apenas mudancas de frontend
- **External:** Nenhuma
- **Technical:** Dados historicos devem existir para anos anteriores

### Assumptions
- Dados de ocorrencias existem para o ano atual e possivelmente anos anteriores
- Usuario quer ver ano completo mesmo que meses futuros tenham 0 ocorrencias

## Working Phases

### Phase 1 - Analise e Design (CONCLUIDO)

**Analise Realizada:**
1. Identificado como monthlyData e calculado (ultimos 6 meses)
2. Encontrado problema de largura do categoryChartOption
3. Identificado que `collapsed` e local ao Sidebar
4. Mapeada estrutura do DashboardLayout

### Phase 2 - Implementacao

**Step 2.1: Levantar Estado Collapsed para DashboardLayout**

```typescript
// DashboardLayout.tsx
export function DashboardLayout({ ... }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // NOVO

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar
        role={currentRole}
        institutionName={currentInstitution?.name}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}              // NOVO
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} // NOVO
      />

      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "md:pl-16" : "md:pl-64", // DINAMICO
        // ...
      )}>
```

```typescript
// Sidebar.tsx - receber collapsed como prop
interface SidebarProps {
  role: UserRole;
  institutionName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;           // NOVO
  onToggleCollapse?: () => void; // NOVO
}

export function Sidebar({
  role, institutionName, isOpen, onClose,
  collapsed = false, onToggleCollapse  // NOVO
}: SidebarProps) {
  // Remover: const [collapsed, setCollapsed] = useState(false);
  // Usar props em vez de state local
```

**Step 2.2: Adicionar Filtro de Ano no Dashboard**

```typescript
// app/admin/dashboard/page.tsx

// Novo state para ano selecionado
const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

// Gerar opcoes de anos (atual + 2 anteriores)
const yearOptions = [
  new Date().getFullYear(),
  new Date().getFullYear() - 1,
  new Date().getFullYear() - 2,
];

// JSX do slicer no topo (antes do Monthly Trend)
<div className="flex items-center gap-4 mb-6">
  <label className="text-sm font-medium">Ano:</label>
  <select
    value={selectedYear}
    onChange={(e) => setSelectedYear(Number(e.target.value))}
    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    {yearOptions.map(year => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>
</div>
```

**Step 2.3: Modificar Logica do Grafico Mensal para Jan-Dez**

```typescript
// ANTES: ultimos 6 meses
for (let i = 5; i >= 0; i--) {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  // ...
}

// DEPOIS: Janeiro a Dezembro do ano selecionado
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
  const startOfMonth = new Date(selectedYear, monthIndex, 1);
  const endOfMonth = new Date(selectedYear, monthIndex + 1, 0);

  const monthQuery = supabase
    .from('occurrences')
    .select(`...`)
    .eq('institution_id', institutionId)
    .gte('occurrence_date', startOfMonth.toISOString())
    .lte('occurrence_date', endOfMonth.toISOString());

  const { data: monthResults } = await monthQuery;

  months.push({
    month: monthNames[monthIndex],
    count: filteredCount,
  });
}
```

**Step 2.4: Ajustar monthlyChartOption - Remover Eixo Y, Adicionar Labels**

```typescript
const monthlyChartOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: monthlyData.map(d => d.month),
  },
  yAxis: {
    type: 'value',
    show: false  // OCULTAR EIXO Y
  },
  series: [{
    data: monthlyData.map(d => ({
      value: d.count,
      itemStyle: { /* ... */ },
    })),
    type: 'bar',
    label: {
      show: true,
      position: 'top',
      formatter: '{c}',  // DATA LABEL
      fontSize: 11,
    },
  }],
};
```

**Step 2.5: Ajustar categoryChartOption - Aumentar Largura dos Labels**

```typescript
const categoryChartOption = {
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: {
    left: '3%',
    right: '12%',  // Reduzir margem direita
    bottom: '3%',
    containLabel: true
  },
  xAxis: { type: 'value', show: false },
  yAxis: {
    type: 'category',
    data: sortedCategoryData.map(d => d.name),
    axisLabel: {
      width: 180,           // AUMENTAR de 120 para 180
      overflow: 'truncate',
      fontSize: 11,         // Fonte um pouco menor se necessario
    },
  },
  series: [{
    type: 'bar',
    data: sortedCategoryData.map(item => ({ /* ... */ })),
    label: {
      show: true,
      position: 'right',
      formatter: '{c}',
    },
    barMaxWidth: 20,  // Limitar largura maxima das barras
  }],
};
```

**Step 2.6: Filtrar Outros Dados pelo Ano Selecionado**

Todas as queries devem adicionar filtro de data pelo ano:
```typescript
const startOfYear = new Date(selectedYear, 0, 1).toISOString();
const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();

// Em cada query:
.gte('occurrence_date', startOfYear)
.lte('occurrence_date', endOfYear)
```

**Step 2.7: Adicionar selectedYear como Dependencia do useEffect**

```typescript
useEffect(() => {
  if (currentInstitution?.id) {
    loadData(currentInstitution.id, activeFilters);
  }
}, [currentInstitution, activeFilters, selectedYear]); // Adicionar selectedYear
```

### Phase 3 - Validacao

**Step 3.1: Testes Manuais**
- [ ] Slicer de ano aparece no topo
- [ ] Mudar ano recarrega todos os dados
- [ ] Grafico mensal mostra Jan a Dez
- [ ] Grafico mensal sem numeros no eixo Y
- [ ] Grafico mensal com data labels
- [ ] Nomes de categoria aparecem completos (ou quase)
- [ ] Colapsar sidebar expande area dos graficos
- [ ] Cross-filtering continua funcionando

**Step 3.2: Build**
- [ ] `npm run build` passa sem erros
- [ ] `npx tsc --noEmit` sem erros

## Rollback Plan

### Rollback Triggers
- Performance muito degradada com 12 queries mensais
- Layout quebra com sidebar colapsado
- Filtro de ano nao funciona corretamente

### Rollback Procedures
- **Acao:** Reverter alteracoes via git
- **Impacto:** Nenhum em dados - apenas mudanca de UI
- **Tempo:** < 10 minutos

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot do slicer de ano
- [ ] Screenshot do grafico mensal Jan-Dez com labels
- [ ] Screenshot das categorias com nomes completos
- [ ] Screenshot comparando sidebar expandido vs colapsado
- [ ] Build passando

## Codigo JSX Final do Slicer

```tsx
{/* Year Filter - Top of Analytics */}
<div className="flex flex-wrap items-center gap-4 mb-6">
  <div className="flex items-center gap-2">
    <label htmlFor="year-filter" className="text-sm font-medium text-muted-foreground">
      Ano:
    </label>
    <select
      id="year-filter"
      value={selectedYear}
      onChange={(e) => setSelectedYear(Number(e.target.value))}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {yearOptions.map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>
  </div>

  {/* Filtros ativos existentes */}
  {activeFilterCount > 0 && (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} ativo{activeFilterCount !== 1 ? 's' : ''}
      </span>
      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
        Limpar filtros
      </Button>
    </div>
  )}
</div>
```
