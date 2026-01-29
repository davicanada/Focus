---
status: draft
generated: 2026-01-27
updated: 2026-01-27
agents:
  - type: "frontend-specialist"
    role: "Implementar melhorias de UI/UX nos gráficos e KPI cards"
docs:
  - "architecture.md"
phases:
  - id: "phase-1"
    name: "Labels 12px"
    prevc: "E"
  - id: "phase-2"
    name: "KPI Cards com Cross-Filtering"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Melhorias de UX no Dashboard Analytics - Labels e KPI Cards

> Padronizar labels para 12px e adicionar KPI cards reativos ao sistema de cross-filtering existente

## Task Snapshot
- **Primary goal:** Melhorar legibilidade (12px em todos os labels) e adicionar KPIs que reagem aos filtros
- **Success signal:** Labels legíveis + KPIs atualizando em tempo real conforme usuário clica nos gráficos
- **Key references:**
  - Arquivo principal: `app/admin/dashboard/page.tsx`
  - Utilitários e cores: `lib/utils.ts`

---

## Parte 1: Padronização de Labels para 12px

### Estado Atual vs Proposto

| Gráfico | fontSize Atual | fontSize Proposto | Linha no Código |
| --- | --- | --- | --- |
| Categoria (barras) - axisLabel | 10px | **12px** | ~559 |
| Categoria (barras) - dataLabel | 10px | **12px** | ~579 |
| Severidade (donut) | 11px | **12px** | ~619 |
| Nível de Ensino (donut) | 9px | **12px** | ~785 |
| Turno (donut) | 9px | **12px** | ~830 |
| Tendência Mensal - axisLabel | 10px | **12px** | ~640 |
| Tendência Mensal - dataLabel | 10px | **12px** | ~661 |
| Turmas - axisLabel | 9px | **12px** | ~709 |
| Turmas - dataLabel | 10px | **12px** | ~745 |
| Alunos - axisLabel | padrão | **12px** | ~676 |
| Alunos - dataLabel | padrão | **12px** | ~695 |

### Código a Alterar

```javascript
// ============================================
// CATEGORIA (barras horizontais)
// ============================================
// Linha ~559 - axisLabel
axisLabel: { width: 140, overflow: 'truncate', fontSize: 12 }

// Linha ~579 - data label
label: { show: true, position: 'right', formatter: '{c}', fontSize: 12 }

// ============================================
// SEVERIDADE (donut)
// ============================================
// Linhas ~615-621
label: {
  show: true,
  formatter: '{b}\n{c} ({d}%)',
  position: 'outside',
  fontSize: 12,
  lineHeight: 16,
}

// ============================================
// NÍVEL DE ENSINO (donut)
// ============================================
// Linhas ~781-786
label: {
  show: true,
  formatter: '{b}\n{c} ({d}%)',
  position: 'outside',
  fontSize: 12,
  lineHeight: 16,
}

// ============================================
// TURNO (donut)
// ============================================
// Linhas ~826-831
label: {
  show: true,
  formatter: '{b}\n{c} ({d}%)',
  position: 'outside',
  fontSize: 12,
  lineHeight: 16,
}

// ============================================
// TENDÊNCIA MENSAL (barras verticais)
// ============================================
// Linha ~640 - eixo X
axisLabel: { fontSize: 12 }

// Linha ~661 - data labels
label: { show: true, position: 'top', formatter: '{c}', fontSize: 12 }

// ============================================
// TURMAS (barras verticais)
// ============================================
// Linha ~709 - eixo X
axisLabel: { fontSize: 12, rotate: 45, interval: 0 }

// Linha ~745 - data labels
label: { show: true, position: 'top', formatter: '{c}', fontSize: 12 }

// ============================================
// ALUNOS (barras horizontais)
// ============================================
// Linha ~676 - axisLabel
axisLabel: { width: 160, overflow: 'truncate', fontSize: 12 }

// Linha ~695 - data label
label: { show: true, position: 'right', formatter: '{c}', fontSize: 12 }
```

---

## Parte 2: KPI Cards com Cross-Filtering

### Análise do Sistema de Filtros Existente

O dashboard já possui um sistema robusto de cross-filtering:

```typescript
// Estado de filtros (linha 105-113)
const [activeFilters, setActiveFilters] = useState<FilterState>({
  categories: [],      // Filtro por tipo de ocorrência
  severities: [],      // Filtro por gravidade (leve/media/grave)
  months: [],          // Filtro por mês (Jan, Fev, ...)
  classIds: [],        // Filtro por turma
  studentIds: [],      // Filtro por aluno
  educationLevels: [], // Filtro por nível (infantil/fundamental/medio)
  shifts: [],          // Filtro por turno (matutino/vespertino/...)
});
```

**Comportamento atual:**
1. Clique simples = seleciona apenas aquele item
2. Ctrl+Clique = adiciona/remove do array (multi-seleção)
3. Clique no item já selecionado sozinho = limpa o filtro
4. `loadChartData()` é chamada via useEffect quando `activeFilters` muda (linha 166-170)

**Regra importante dos gráficos:**
- Cada gráfico **exclui seu próprio filtro** ao calcular os dados
- Exemplo: O gráfico de Categoria não filtra por `filters.categories`
- Isso evita que o gráfico "suma" quando você clica nele

### Estratégia para KPIs

Os KPIs são **diferentes** dos gráficos - eles devem aplicar **TODOS** os filtros:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE DADOS                                   │
│                                                                         │
│  Usuário clica em "João Silva" no gráfico de alunos                    │
│                           ↓                                             │
│  activeFilters.studentIds = ["João Silva"]                              │
│                           ↓                                             │
│  useEffect detecta mudança → chama loadChartData()                      │
│                           ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Dentro de loadChartData():                                       │   │
│  │                                                                  │   │
│  │ GRÁFICOS: Cada um exclui seu filtro próprio                      │   │
│  │   - Gráfico de alunos: NÃO filtra por studentIds                │   │
│  │   - Outros gráficos: APLICAM filtro studentIds                  │   │
│  │                                                                  │   │
│  │ KPIs: APLICAM TODOS os filtros                                  │   │
│  │   - Total = ocorrências de "João Silva" apenas                  │   │
│  │   - % Graves = % graves de "João Silva"                         │   │
│  │   - Alunos Afetados = 1 (apenas João Silva)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementação dos KPIs

#### 1. Novo State para KPIs (adicionar após linha ~123)

```typescript
// KPI data state
const [kpiData, setKpiData] = useState({
  totalOccurrences: 0,
  uniqueClasses: 0,
  averagePerClass: 0,
  graveCount: 0,
  gravePercentage: 0,
  uniqueStudents: 0,
  totalStudents: 0,
});
```

#### 2. Cálculo dos KPIs em `loadChartData()` (adicionar antes do catch)

A chave é calcular os KPIs usando **os mesmos dados já filtrados** que alimentam os gráficos, mas aplicando TODOS os filtros:

```typescript
// ============================================
// CÁLCULO DOS KPIs (aplicando TODOS os filtros)
// ============================================

// Buscar todas as ocorrências do período (uma query centralizada)
const { data: allOccurrences } = await supabase
  .from('occurrences')
  .select(`
    id,
    student_id,
    occurrence_date,
    occurrence_type:occurrence_types(category, severity),
    student:students(full_name, class:classes(name, education_level, shift))
  `)
  .eq('institution_id', institutionId)
  .is('deleted_at', null)
  .gte('occurrence_date', startOfYear)
  .lte('occurrence_date', endOfYear);

// Aplicar TODOS os filtros para os KPIs
const filteredForKPIs = (allOccurrences || []).filter((r: any) => {
  const occDate = new Date(r.occurrence_date);
  const monthName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][occDate.getMonth()];

  // Aplicar TODOS os filtros (diferente dos gráficos que excluem o próprio)
  if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return false;
  if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return false;
  if (!matchesFilter(monthName, filters.months)) return false;
  if (!matchesFilter(r.student?.class?.name, filters.classIds)) return false;
  if (!matchesFilter(r.student?.full_name, filters.studentIds)) return false;
  if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return false;
  if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return false;

  return true;
});

// Calcular métricas
const totalOccurrences = filteredForKPIs.length;
const graveCount = filteredForKPIs.filter((r: any) => r.occurrence_type?.severity === 'grave').length;
const gravePercentage = totalOccurrences > 0 ? (graveCount / totalOccurrences) * 100 : 0;

// Alunos únicos e turmas únicas nos dados filtrados
const uniqueStudentIds = new Set(filteredForKPIs.map((r: any) => r.student_id));
const uniqueClassNames = new Set(filteredForKPIs.map((r: any) => r.student?.class?.name).filter(Boolean));

// Total de alunos (aplicando filtro de turma se houver)
const { data: allStudentsData } = await supabase
  .from('students')
  .select('id, class:classes(name)')
  .eq('institution_id', institutionId)
  .eq('is_active', true)
  .is('deleted_at', null);

const totalStudentsFiltered = (allStudentsData || []).filter((s: any) =>
  matchesFilter(s.class?.name, filters.classIds)
).length;

// Atualizar state dos KPIs
setKpiData({
  totalOccurrences,
  uniqueClasses: uniqueClassNames.size,
  averagePerClass: uniqueClassNames.size > 0 ? totalOccurrences / uniqueClassNames.size : 0,
  graveCount,
  gravePercentage,
  uniqueStudents: uniqueStudentIds.size,
  totalStudents: totalStudentsFiltered,
});
```

#### 3. Componente KPICard

```tsx
// Adicionar antes do export default (linha ~75)
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  highlight?: 'danger' | 'warning' | 'success' | 'default';
}

function KPICard({ title, value, subtitle, icon, highlight = 'default' }: KPICardProps) {
  const highlightColors = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    success: 'text-green-600',
    default: 'text-foreground',
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: '#153461' }}>
        {icon && <span className="text-white/80">{icon}</span>}
        <span className="text-xs font-medium text-white">{title}</span>
      </div>
      <div className="px-4 py-3 text-center">
        <p className={cn("text-2xl font-bold", highlightColors[highlight])}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
```

#### 4. Renderização dos KPIs (após o header, antes dos gráficos - linha ~960)

```tsx
{/* KPI Cards - Reativos aos filtros */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  <KPICard
    title="Total de Ocorrências"
    value={kpiData.totalOccurrences}
    subtitle={activeFilterCount > 0 ? 'filtrado' : `em ${selectedYear}`}
    icon={<AlertTriangle className="h-4 w-4" />}
  />
  <KPICard
    title="Média por Turma"
    value={kpiData.averagePerClass.toFixed(1)}
    subtitle={`${kpiData.uniqueClasses} turma${kpiData.uniqueClasses !== 1 ? 's' : ''}`}
    icon={<BarChart2 className="h-4 w-4" />}
  />
  <KPICard
    title="Ocorrências Graves"
    value={`${kpiData.gravePercentage.toFixed(0)}%`}
    subtitle={`${kpiData.graveCount} de ${kpiData.totalOccurrences}`}
    icon={<AlertCircle className="h-4 w-4" />}
    highlight={kpiData.gravePercentage > 30 ? 'danger' : kpiData.gravePercentage > 15 ? 'warning' : 'default'}
  />
  <KPICard
    title="Alunos Afetados"
    value={kpiData.uniqueStudents}
    subtitle={`de ${kpiData.totalStudents} aluno${kpiData.totalStudents !== 1 ? 's' : ''}`}
    icon={<Users className="h-4 w-4" />}
  />
</div>
```

#### 5. Imports necessários (linha ~1)

```typescript
import { AlertTriangle, BarChart2, AlertCircle, Users } from 'lucide-react';
```

---

## Exemplos de Comportamento Esperado

### Cenário 1: Sem filtros
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│    439     │ │    12.5    │ │    18%     │ │     87     │
│   Total    │ │   Média    │ │   Graves   │ │   Alunos   │
│ em 2026    │ │ 35 turmas  │ │ 79 de 439  │ │  de 120    │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### Cenário 2: Filtro por aluno "João Silva"
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│     12     │ │    12.0    │ │    25%     │ │      1     │
│   Total    │ │   Média    │ │   Graves   │ │   Alunos   │
│ filtrado   │ │  1 turma   │ │  3 de 12   │ │   de 1     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### Cenário 3: Filtro por mês "Mar" + severidade "grave"
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│     23     │ │    1.8     │ │   100%     │ │     18     │
│   Total    │ │   Média    │ │   Graves   │ │   Alunos   │
│ filtrado   │ │ 13 turmas  │ │ 23 de 23   │ │  de 120    │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### Cenário 4: Multi-seleção (Ctrl+Clique) em 3 turmas
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│     67     │ │    22.3    │ │    12%     │ │     28     │
│   Total    │ │   Média    │ │   Graves   │ │   Alunos   │
│ filtrado   │ │  3 turmas  │ │  8 de 67   │ │   de 45    │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

---

## Indicador Visual de Filtro Ativo

Quando há filtros ativos, o subtítulo mostra "filtrado" em vez do ano. Opcionalmente, podemos adicionar um indicador visual mais forte:

```tsx
// Alternativa: Badge de filtro ativo no card
{activeFilterCount > 0 && (
  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
)}
```

---

## Checklist de Implementação

### Fase 1: Labels 12px
- [ ] Categoria axisLabel: fontSize 12
- [ ] Categoria dataLabel: fontSize 12
- [ ] Severidade label: fontSize 12, lineHeight 16
- [ ] Nível de Ensino label: fontSize 12, lineHeight 16
- [ ] Turno label: fontSize 12, lineHeight 16
- [ ] Tendência Mensal axisLabel: fontSize 12
- [ ] Tendência Mensal dataLabel: fontSize 12
- [ ] Turmas axisLabel: fontSize 12
- [ ] Turmas dataLabel: fontSize 12
- [ ] Alunos axisLabel: fontSize 12
- [ ] Alunos dataLabel: fontSize 12

### Fase 2: KPI Cards
- [ ] Importar ícones Lucide (AlertTriangle, BarChart2, AlertCircle, Users)
- [ ] Criar state `kpiData`
- [ ] Criar query centralizada de ocorrências em `loadChartData()`
- [ ] Implementar filtro completo para KPIs (aplicando TODOS os filtros)
- [ ] Calcular totalOccurrences, graveCount, gravePercentage
- [ ] Calcular uniqueStudents, uniqueClasses, averagePerClass
- [ ] Criar componente KPICard com prop highlight
- [ ] Renderizar grid de 4 KPIs após header
- [ ] Subtítulo dinâmico ("filtrado" vs "em 2026")

### Fase 3: Validação
- [ ] Testar clique simples em cada gráfico → KPIs atualizam
- [ ] Testar Ctrl+Clique multi-seleção → KPIs refletem todos os filtros
- [ ] Testar combinação de filtros (aluno + mês + severidade)
- [ ] Testar limpar filtros → KPIs voltam ao total
- [ ] Testar mudança de ano → KPIs recalculam
- [ ] Testar responsividade (4 cols → 2 cols em tablet)

---

## Considerações de Performance

O cálculo dos KPIs adiciona uma query extra (`allOccurrences`). Para otimizar:

1. **Reusar dados existentes**: Os dados de `categoryResults`, `severityResults`, etc. já são buscados. Podemos calcular os KPIs a partir deles em vez de fazer nova query.

2. **Opção otimizada** (reutilizando `classResults` que já tem todos os campos):

```typescript
// Usar classResults que já tem todos os dados necessários
const filteredForKPIs = (classResults || []).filter((r: any) => {
  // ... aplicar todos os filtros
});
```

Isso elimina a query extra e melhora a performance.

---

## Resumo da Proposta

| Melhoria | Descrição | Complexidade |
| --- | --- | --- |
| Labels 12px | Padronizar todos os labels para 12px | Baixa |
| KPI Cards | 4 cards no topo (Total, Média, % Graves, Alunos) | Média |
| Cross-filtering | KPIs reagem a TODOS os filtros ativos | Já implementado via useEffect |
| Subtítulo dinâmico | "filtrado" quando há filtros, "em {ano}" sem filtros | Baixa |
| Highlight condicional | % Graves vermelho se > 30%, amarelo se > 15% | Baixa |
