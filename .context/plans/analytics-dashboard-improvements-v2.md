---
status: ready
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Implement chart improvements with ECharts"
  - type: "feature-developer"
    role: "Add new education level chart with cross-filtering"
phases:
  - id: "phase-1"
    name: "Discovery & Alignment"
    prevc: "P"
  - id: "phase-2"
    name: "Implementation & Iteration"
    prevc: "E"
  - id: "phase-3"
    name: "Validation & Handoff"
    prevc: "V"
---

# Melhorias nos Graficos do Analytics Dashboard Plan

> Categoria como barras, severidade com labels, novo grafico por nivel, melhorias em alunos e turmas

## Task Snapshot
- **Primary goal:** Melhorar a visualizacao e usabilidade dos graficos do Analytics Dashboard do admin, incluindo novo grafico por nivel de ensino.
- **Success signal:** Todos os graficos exibem data labels, novo grafico por nivel funciona com cross-filtering, lista de alunos permite ver todos.
- **Key references:**
  - `app/admin/dashboard/page.tsx` - Dashboard Analytics
  - `lib/constants/education.ts` - Niveis de ensino (infantil, fundamental, medio)
  - ECharts documentation para configuracoes de label

## Codebase Context

### Arquivo Principal
`app/admin/dashboard/page.tsx` - 783 linhas

### Graficos Existentes
1. **Tendencia Mensal** (`monthlyChartOption`) - Barras verticais
2. **Distribuicao por Categoria** (`categoryChartOption`) - Donut/Pie
3. **Distribuicao por Severidade** (`severityChartOption`) - Donut/Pie
4. **Alunos com Mais Ocorrencias** (`topStudentsChartOption`) - Barras horizontais (Top 10)
5. **Ocorrencias por Turma** (`classChartOption`) - Barras verticais com gradiente

### Sistema de Cross-Filtering
```typescript
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
}
```
- Cada grafico tem handler: `handleCategoryClick`, `handleSeverityClick`, etc.
- Suporta Ctrl+Click para multi-selecao

### Dados de Nivel de Ensino
- Tabela `classes` tem campo `education_level` (infantil, fundamental, medio, custom)
- Query atual ja faz join: `student:students(full_name, class:classes(name))`
- Precisa expandir join para incluir `education_level`

## Mudancas Solicitadas

### 1. Distribuicao por Categoria - Trocar para Barras Horizontais
**Atual:** Grafico de rosca (donut)
**Novo:** Grafico de barras horizontais ordenado por quantidade (maior no topo)

Configuracao ECharts:
```typescript
const categoryChartOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '15%', containLabel: true },
  xAxis: { type: 'value', show: false },  // Ocultar eixo X
  yAxis: {
    type: 'category',
    data: categoryData.sort((a, b) => a.value - b.value).map(d => d.name),
    axisLabel: { width: 100, overflow: 'truncate' }
  },
  series: [{
    type: 'bar',
    data: categoryData.sort((a, b) => a.value - b.value).map(d => d.value),
    label: {
      show: true,
      position: 'right',
      formatter: '{c}'  // Mostra quantidade
    }
  }]
};
```

### 2. Distribuicao por Severidade - Adicionar Labels e Remover Legenda
**Atual:** Donut com legenda na parte inferior
**Novo:** Donut com labels mostrando quantidade E porcentagem, sem legenda

Configuracao ECharts:
```typescript
const severityChartOption = {
  tooltip: { trigger: 'item' },
  legend: { show: false },  // REMOVER LEGENDA
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    label: {
      show: true,
      formatter: '{b}\n{c} ({d}%)',  // Nome, quantidade e porcentagem
      position: 'outside'
    },
    labelLine: { show: true },
    data: severityData.map(item => ({...}))
  }]
};
```

### 3. NOVO: Grafico por Nivel de Ensino (Donut)
**Novo grafico:** Donut mostrando ocorrencias por nivel (Ed. Infantil, Fundamental, Medio)

Mudancas necessarias:
1. **Novo state:** `educationLevelData`
2. **Novo filtro:** Adicionar `educationLevels: string[]` ao FilterState
3. **Nova query:** Incluir `education_level` no join de classes
4. **Novo handler:** `handleEducationLevelClick`
5. **Novo grafico:** `educationLevelChartOption`

Labels de nivel (de `lib/constants/education.ts`):
```typescript
const educationLevelLabels: Record<string, string> = {
  infantil: 'Ed. Infantil',
  fundamental: 'Fundamental',
  medio: 'Ensino Medio',
  custom: 'Outro'
};
```

### 4. Alunos com Mais Ocorrencias - Remover Eixo X, Adicionar Labels, Ver Todos
**Atual:** Top 10, numeros no eixo X
**Novo:** Todos os alunos, sem eixo X, com data labels, scroll se necessario

Estrategia para "ver todos":
- **Opcao escolhida:** Altura dinamica baseada na quantidade de alunos
- Formula: `height = Math.max(400, alunos.length * 30)`
- Container com `max-height` e `overflow-y: auto` para scroll

Configuracao ECharts:
```typescript
const topStudentsChartOption = {
  grid: { left: '3%', right: '15%', containLabel: true },
  xAxis: { type: 'value', show: false },  // REMOVER EIXO X
  yAxis: {
    type: 'category',
    data: allStudents.map(s => s.name).reverse()  // TODOS, nao so top 10
  },
  series: [{
    type: 'bar',
    data: allStudents.map(s => s.count).reverse(),
    label: {
      show: true,
      position: 'right',
      formatter: '{c}'  // Data label com quantidade
    }
  }]
};
```

### 5. Ocorrencias por Turma - Remover Eixo Y, Labels, Cores Simplificadas
**Atual:** Numeros no eixo Y, cores em gradiente do verde ao vermelho
**Novo:** Sem eixo Y, com data labels, apenas MAX (vermelho) e MIN (verde) coloridos

Configuracao ECharts:
```typescript
const classChartOption = {
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: {
    type: 'category',
    data: classData.map(c => c.name),
    axisLabel: { rotate: 45 }
  },
  yAxis: { type: 'value', show: false },  // REMOVER EIXO Y
  series: [{
    type: 'bar',
    data: classData.map(c => {
      const isMax = c.count === maxCount && classData.length > 1;
      const isMin = c.count === minCount && classData.length > 1 && maxCount !== minCount;
      return {
        value: c.count,
        itemStyle: {
          color: isMax ? '#EF4444' : isMin ? '#10B981' : '#6B7280'  // CINZA para o resto
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}'  // Data label
        }
      };
    })
  }]
};
```

## Agent Lineup
| Agent | Role in this plan | First responsibility focus |
| --- | --- | --- |
| Frontend Specialist | Implementar mudancas nos graficos | Configurar ECharts com novos estilos |
| Feature Developer | Adicionar grafico por nivel | Criar queries e cross-filtering |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Muitos alunos trava a UI | Medium | Medium | Usar virtualizacao ou limitar a 100 |
| Cross-filtering quebra | Low | High | Testar todos os graficos apos mudancas |

### Dependencies
- **Internal:** Nenhuma
- **External:** ECharts for React (ja instalado)
- **Technical:** Campo `education_level` na tabela classes (ja existe)

### Assumptions
- Campo `education_level` esta preenchido para todas as turmas
- Quantidade de alunos por instituicao e gerenciavel (< 500)

## Working Phases

### Phase 1 - Discovery & Alignment (CONCLUIDO)
**Analise Concluida:**
1. Identificados todos os graficos e suas configuracoes
2. Mapeado sistema de cross-filtering
3. Verificado que `education_level` existe na tabela classes

### Phase 2 - Implementation & Iteration

**Step 2.1: Atualizar FilterState**
```typescript
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
  educationLevels: string[];  // NOVO
}
```

**Step 2.2: Atualizar Queries**
Expandir join para incluir `education_level`:
```typescript
student:students(
  full_name,
  class:classes(name, education_level)  // Adicionar education_level
)
```

**Step 2.3: Criar State e Handler para Education Level**
```typescript
const [educationLevelData, setEducationLevelData] = useState<{name: string; value: number}[]>([]);
const educationLevelChartRef = useRef<any>(null);

const handleEducationLevelClick = useCallback((params: any) => {
  if (params.name) {
    const levelKey = educationLevelKeysFromLabels[params.name] || params.name;
    const isCtrl = params.event?.event?.ctrlKey || false;
    handleFilterClick('educationLevels', levelKey, isCtrl);
  }
}, [handleFilterClick]);
```

**Step 2.4: Modificar categoryChartOption**
Trocar de pie para bar horizontal com labels.

**Step 2.5: Modificar severityChartOption**
Adicionar labels com quantidade e %, remover legenda.

**Step 2.6: Modificar topStudentsChartOption**
Remover `.slice(0, 10)`, ocultar xAxis, adicionar labels.

**Step 2.7: Modificar classChartOption**
Ocultar yAxis, adicionar labels, simplificar cores.

**Step 2.8: Criar educationLevelChartOption**
Novo grafico de donut com labels.

**Step 2.9: Atualizar JSX**
Adicionar novo Card para grafico de nivel de ensino.

### Phase 3 - Validation & Handoff

**Step 3.1: Testes de Cross-Filtering**
- [ ] Clicar em categoria filtra outros graficos
- [ ] Clicar em severidade filtra outros graficos
- [ ] Clicar em nivel filtra outros graficos
- [ ] Ctrl+Click permite multi-selecao
- [ ] Botao "Limpar filtros" funciona

**Step 3.2: Testes Visuais**
- [ ] Categoria: barras horizontais ordenadas
- [ ] Severidade: labels com quantidade e %
- [ ] Alunos: scroll funciona, labels visiveis
- [ ] Turmas: apenas max/min coloridos, labels visiveis
- [ ] Nivel: donut com labels

**Step 3.3: Build**
- [ ] `npm run build` passa sem erros

## Rollback Plan

### Rollback Triggers
- Graficos nao renderizam
- Cross-filtering quebrado
- Performance ruim com muitos dados

### Rollback Procedures
#### Phase 2 Rollback
- Action: Reverter codigo para versao anterior (git revert)
- Data Impact: Nenhum - apenas mudanca de UI

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshots de todos os graficos modificados
- [ ] Screenshot do novo grafico por nivel
- [ ] Build passando
