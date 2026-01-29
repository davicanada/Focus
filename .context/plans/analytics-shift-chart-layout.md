# Plano: Gráfico de Turno + Reorganização do Layout Analytics

## Objetivo
Adicionar um novo gráfico de rosca mostrando ocorrências por turno (Matutino, Vespertino, Noturno, Integral) e reorganizar o layout dos gráficos conforme especificado.

## Layout Desejado

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tendência Mensal (barras)                     │
│                        Janeiro - Dezembro                        │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐  ┌────────────────────────────────┐
│  Distribuição por Categoria │  │  Distribuição por Severidade   │
│      (barras horizontais)   │  │         (rosca/donut)          │
└────────────────────────────┘  └────────────────────────────────┘

┌────────────────────────────┐  ┌────────────────────────────────┐
│   Por Nível de Ensino      │  │       Por Turno (NOVO)         │
│       (rosca/donut)        │  │         (rosca/donut)          │
└────────────────────────────┘  └────────────────────────────────┘

┌────────────────────────────┐  ┌────────────────────────────────┐
│  Alunos com Ocorrências    │  │    Ocorrências por Turma       │
│    (barras horizontais)    │  │      (barras verticais)        │
└────────────────────────────┘  └────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 Alunos sem Ocorrências (tabela)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Dados Disponíveis

### Turnos (lib/constants/education.ts)
```typescript
export const SHIFTS = [
  { value: 'matutino', label: 'Matutino' },
  { value: 'vespertino', label: 'Vespertino' },
  { value: 'noturno', label: 'Noturno' },
  { value: 'integral', label: 'Integral' }
] as const;
```

### Campo no Banco
- Tabela `classes` tem campo `shift` (string opcional)
- Valores: 'matutino', 'vespertino', 'noturno', 'integral'

## Alterações Necessárias

### 1. Atualizar FilterState Interface
**Arquivo:** `app/admin/dashboard/page.tsx`

```typescript
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
  educationLevels: string[];
  shifts: string[];  // NOVO
}
```

### 2. Adicionar Cores para Turnos
**Arquivo:** `lib/utils.ts`

```typescript
export const CHART_COLORS = {
  // ... existentes ...
  shift: {
    matutino: '#3b82f6',    // Blue 500 - manhã/sol nascendo
    vespertino: '#f97316',  // Orange 500 - tarde/pôr do sol
    noturno: '#8b5cf6',     // Violet 500 - noite/lua
    integral: '#10b981',    // Emerald 500 - dia todo/verde
  },
};
```

### 3. Adicionar Mapeamentos de Labels
**Arquivo:** `app/admin/dashboard/page.tsx`

```typescript
const shiftLabels: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  noturno: 'Noturno',
  integral: 'Integral',
};

const shiftKeysFromLabels: Record<string, string> = {
  'Matutino': 'matutino',
  'Vespertino': 'vespertino',
  'Noturno': 'noturno',
  'Integral': 'integral',
};
```

### 4. Adicionar State para Dados do Gráfico
```typescript
const [shiftData, setShiftData] = useState<{ name: string; value: number }[]>([]);
```

### 5. Atualizar Queries para Incluir shift
Na query principal, garantir que o `shift` está sendo selecionado:
```typescript
.select(`
  *,
  student:students(
    full_name,
    class:classes(name, shift, education_level)
  ),
  occurrence_type:occurrence_types(category, severity)
`)
```

### 6. Criar useEffect para Agregar Dados por Turno
```typescript
useEffect(() => {
  if (!rawData.length) {
    setShiftData([]);
    return;
  }

  const shiftCounts: Record<string, number> = {};

  rawData.forEach((r) => {
    // Aplicar filtros ativos (exceto shifts)
    if (!matchesFilter(r.occurrence_type?.category, activeFilters.categories)) return;
    if (!matchesFilter(r.occurrence_type?.severity, activeFilters.severities)) return;
    // ... outros filtros ...

    const shift = r.student?.class?.shift || 'nao_informado';
    shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
  });

  const data = Object.entries(shiftCounts)
    .map(([key, value]) => ({
      name: shiftLabels[key] || 'Não Informado',
      value,
    }))
    .sort((a, b) => b.value - a.value);

  setShiftData(data);
}, [rawData, activeFilters, selectedYear]);
```

### 7. Criar Handler de Clique
```typescript
const handleShiftClick = (params: any, event?: any) => {
  const clickedLabel = params.name;
  const key = shiftKeysFromLabels[clickedLabel];
  if (!key) return;

  const isCtrlClick = event?.event?.ctrlKey || event?.event?.metaKey;

  setActiveFilters((prev) => {
    if (isCtrlClick) {
      // Toggle no array
      const newShifts = prev.shifts.includes(key)
        ? prev.shifts.filter((s) => s !== key)
        : [...prev.shifts, key];
      return { ...prev, shifts: newShifts };
    } else {
      // Single select/deselect
      const newShifts = prev.shifts.length === 1 && prev.shifts[0] === key
        ? []
        : [key];
      return { ...prev, shifts: newShifts };
    }
  });
};
```

### 8. Criar Configuração do Gráfico ECharts
```typescript
const shiftChartOption = {
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)',
  },
  legend: { show: false },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      selectedMode: 'multiple',
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{c} ({d}%)',
        fontSize: 11,
        lineHeight: 14,
      },
      labelLine: {
        show: true,
        length: 10,
        length2: 5,
      },
      emphasis: {
        label: { fontSize: 13, fontWeight: 'bold' },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
      data: shiftData.map((item) => {
        const key = shiftKeysFromLabels[item.name];
        const isSelected = activeFilters.shifts.length === 0 ||
          activeFilters.shifts.includes(key);
        return {
          name: item.name,
          value: item.value,
          itemStyle: {
            color: CHART_COLORS.shift[key as keyof typeof CHART_COLORS.shift] || '#6b7280',
            opacity: isSelected ? 1 : 0.3,
          },
        };
      }),
    },
  ],
};
```

### 9. Reorganizar Layout JSX

**Antes (3 colunas em lg):**
```tsx
<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Categoria */}
  {/* Severidade */}
  {/* Nível de Ensino */}
</div>
```

**Depois (2 colunas, 2 linhas):**
```tsx
{/* Linha 1: Categoria + Severidade */}
<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
  <Card>{/* Distribuição por Categoria */}</Card>
  <Card>{/* Distribuição por Severidade */}</Card>
</div>

{/* Linha 2: Nível de Ensino + Turno */}
<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
  <Card>{/* Por Nível de Ensino */}</Card>
  <Card>{/* Por Turno (NOVO) */}</Card>
</div>
```

### 10. Atualizar clearAllFilters
```typescript
const clearAllFilters = () => {
  setActiveFilters({
    categories: [],
    severities: [],
    months: [],
    classIds: [],
    studentIds: [],
    educationLevels: [],
    shifts: [],  // NOVO
  });
};
```

### 11. Atualizar matchesFilter em Todos os Gráficos
Cada gráfico que filtra dados precisa incluir a verificação de turno:
```typescript
if (!matchesFilter(r.student?.class?.shift, activeFilters.shifts)) return;
```

## Arquivos a Modificar

1. **`lib/utils.ts`**
   - Adicionar `shift` em `CHART_COLORS`

2. **`app/admin/dashboard/page.tsx`**
   - Adicionar `shifts` ao `FilterState`
   - Adicionar mapeamentos `shiftLabels` e `shiftKeysFromLabels`
   - Adicionar state `shiftData`
   - Adicionar useEffect para agregar por turno
   - Adicionar `handleShiftClick`
   - Adicionar `shiftChartOption`
   - Reorganizar layout JSX
   - Atualizar todos os filtros para incluir `shifts`
   - Atualizar `clearAllFilters`

## Ordem de Implementação

1. Adicionar cores em `lib/utils.ts`
2. Atualizar `FilterState` interface
3. Adicionar constantes de mapeamento (labels)
4. Adicionar state `shiftData`
5. Criar useEffect de agregação por turno
6. Criar handler de clique
7. Criar configuração do gráfico ECharts
8. Atualizar todos os useEffects existentes para filtrar por turno
9. Reorganizar layout JSX
10. Testar cross-filtering entre todos os gráficos

## Considerações

- **Turmas sem turno:** Mostrar como "Não Informado" com cor cinza
- **Cross-filtering:** O filtro de turno deve afetar todos os outros gráficos
- **Responsividade:** Em mobile (< 768px), todos ficam em 1 coluna
- **Cores:** Usar paleta semântica (manhã=azul, tarde=laranja, noite=roxo, integral=verde)

## Estimativa de Complexidade
- **Médio-Alta:** Envolve modificar múltiplos pontos do código de analytics
- **Risco:** Baixo, pois segue padrões já estabelecidos no dashboard

## Validação
- [ ] Gráfico de turno aparece com dados corretos
- [ ] Cross-filtering funciona em ambas direções
- [ ] Ctrl+Click permite multi-seleção
- [ ] Layout responsivo funciona em mobile/tablet/desktop
- [ ] Filtro "Limpar filtros" inclui turno
- [ ] Badge de filtros ativos conta turno
