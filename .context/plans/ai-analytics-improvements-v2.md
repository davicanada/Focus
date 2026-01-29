---
status: active
generated: 2026-01-23
agents:
  - type: "feature-developer"
    role: "Implementar multi-selecao com Ctrl e melhorias na AI"
  - type: "frontend-specialist"
    role: "Remover filtro de periodos e ajustar UI"
  - type: "test-writer"
    role: "Criar testes E2E para novas funcionalidades"
phases:
  - id: "phase-1"
    name: "Analise e Planejamento"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Testes e Validacao"
    prevc: "V"
---

# Melhorias AI Analytics v2

> Corrigir queries complexas, formatacao markdown, remover filtro de periodos e adicionar multi-selecao com Ctrl

## Task Snapshot
- **Primary goal:** Melhorar a experiencia do usuario com AI Analytics mais inteligente e filtros mais poderosos
- **Success signal:** AI responde corretamente queries complexas, texto sem asteriscos, multi-selecao funcionando
- **Key references:**
  - `app/admin/dashboard/page.tsx` - Dashboard principal
  - `lib/ai/shared.ts` - Prompts da AI
  - `components/analytics/AIChat.tsx` - Componente de chat

## Problemas Identificados

### 1. AI nao responde queries complexas corretamente
**Problema:** Pergunta "top 3 alunos com mais ocorrencias de cada turma" gera SQL com `LIMIT 12` que nao funciona.

**Causa:** O modelo usa LIMIT global em vez de window functions ou subqueries para ranking por grupo.

**Solucao:** Melhorar o prompt do sistema para incluir exemplos de queries com ranking por grupo usando ROW_NUMBER() ou subqueries.

```sql
-- Query correta para top N por grupo
WITH ranked AS (
  SELECT
    c.name as turma,
    s.full_name as aluno,
    COUNT(o.id) as total_ocorrencias,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COUNT(o.id) DESC) as rank
  FROM classes c
  JOIN students s ON c.id = s.class_id
  JOIN occurrences o ON s.id = o.student_id
  WHERE c.institution_id = :institution_id
  GROUP BY c.id, c.name, s.id, s.full_name
)
SELECT turma, aluno, total_ocorrencias
FROM ranked
WHERE rank <= 3
ORDER BY turma, rank;
```

### 2. Texto com asteriscos em vez de negrito
**Problema:** A resposta mostra `**texto**` em vez de renderizar como **texto**.

**Causa:** O componente AIChat esta usando `whitespace-pre-wrap` e nao renderiza markdown.

**Solucao:** Usar uma biblioteca de markdown (react-markdown) ou converter manualmente `**texto**` para `<strong>texto</strong>`.

```typescript
// Solucao simples sem dependencia
const formatMarkdown = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

// Usar dangerouslySetInnerHTML ou sanitizar com DOMPurify
```

### 3. Filtro de periodos desnecessario
**Problema:** O dropdown "Todos os periodos" no topo da pagina nao esta sendo usado de forma efetiva.

**Solucao:** Remover o componente Select e o estado `selectedQuarter` do dashboard.

**Arquivos afetados:**
- `app/admin/dashboard/page.tsx` - Remover estado e componente

### 4. Multi-selecao com Ctrl
**Problema:** Atualmente so e possivel filtrar uma categoria/severidade/mes por vez.

**Solucao:**
- Detectar quando Ctrl esta pressionado no evento de clique
- Mudar o estado de filtro de `string | undefined` para `string[]`
- Ao clicar com Ctrl, adicionar/remover do array em vez de substituir

```typescript
// Antes
interface FilterState {
  category?: string;
  severity?: string;
  month?: string;
}

// Depois
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
}

// Handler com Ctrl
const handleChartClick = (type: string, value: string, event: MouseEvent) => {
  if (event.ctrlKey) {
    // Multi-select: toggle no array
    setActiveFilters(prev => {
      const key = `${type}s` as keyof FilterState;
      const current = prev[key] || [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists
          ? current.filter(v => v !== value)
          : [...current, value]
      };
    });
  } else {
    // Single-select: substituir
    setActiveFilters(prev => ({
      ...prev,
      [`${type}s`]: [value]
    }));
  }
};
```

## Implementacao Detalhada

### Arquivo: `lib/ai/shared.ts`

#### Adicionar exemplos de queries complexas ao SCHEMA_CONTEXT

```typescript
// Adicionar ao SCHEMA_CONTEXT apos os exemplos existentes:

## Exemplos de Queries Complexas

### Top N por grupo (usar ROW_NUMBER)
Para perguntas como "top 3 alunos por turma", use window functions:
\`\`\`sql
WITH ranked AS (
  SELECT
    c.name as turma,
    s.full_name as aluno,
    COUNT(o.id) as total,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COUNT(o.id) DESC) as rank
  FROM classes c
  JOIN students s ON c.id = s.class_id
  JOIN occurrences o ON s.id = o.student_id
  WHERE c.institution_id = :institution_id
  GROUP BY c.id, c.name, s.id, s.full_name
)
SELECT turma, aluno, total FROM ranked WHERE rank <= 3;
\`\`\`

### Comparacao entre periodos
Para perguntas comparativas, use subqueries ou CTEs.

IMPORTANTE: Nunca use LIMIT para "top N por grupo" - isso retorna N total, nao N por grupo.
```

### Arquivo: `components/analytics/AIChat.tsx`

#### Renderizar markdown corretamente

```typescript
// Funcao para converter markdown bold para HTML
const formatMarkdown = (text: string): string => {
  // Converter **texto** para <strong>texto</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

// No JSX, usar:
<p
  className="text-sm text-foreground"
  dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
/>
```

### Arquivo: `app/admin/dashboard/page.tsx`

#### 1. Remover filtro de periodos

```typescript
// REMOVER estas linhas:
// const [quarters, setQuarters] = useState<Quarter[]>([]);
// const [selectedQuarter, setSelectedQuarter] = useState<string>('');
// await loadQuarters(institution.id);

// REMOVER do JSX o componente Select de periodos
```

#### 2. Modificar FilterState para arrays

```typescript
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
}

// Estado inicial
const [activeFilters, setActiveFilters] = useState<FilterState>({
  categories: [],
  severities: [],
  months: [],
  classIds: [],
  studentIds: [],
});

// Contar filtros ativos
const activeFilterCount = Object.values(activeFilters)
  .reduce((sum, arr) => sum + arr.length, 0);
```

#### 3. Modificar handlers de clique para suportar Ctrl

```typescript
const handleCategoryClick = useCallback((params: any) => {
  if (!params.name) return;
  const value = params.name;
  const isCtrl = params.event?.event?.ctrlKey || false;

  setActiveFilters(prev => {
    if (isCtrl) {
      // Multi-select: toggle
      const exists = prev.categories.includes(value);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter(v => v !== value)
          : [...prev.categories, value]
      };
    } else {
      // Single-select: se ja esta selecionado, limpar; senao, selecionar
      const isSelected = prev.categories.length === 1 && prev.categories[0] === value;
      return {
        ...prev,
        categories: isSelected ? [] : [value]
      };
    }
  });
}, []);
```

#### 4. Modificar queries para filtrar com arrays

```typescript
// Exemplo para categoria - no filtro manual:
if (filters.categories.length > 0 && !filters.categories.includes(category)) {
  return; // Skip this item
}
```

#### 5. Modificar visualizacao dos graficos para destacar multiplos

```typescript
// Para pie charts
data: categoryData.map(c => ({
  value: c.value,
  name: c.name,
  itemStyle: {
    opacity: activeFilters.categories.length === 0
      ? 1
      : activeFilters.categories.includes(c.name)
        ? 1
        : 0.3
  }
}))
```

#### 6. Mostrar instrucao de Ctrl ao usuario

```typescript
// Adicionar tooltip ou texto explicativo nas CardDescription
<CardDescription>
  Clique para filtrar - Ctrl+Clique para multi-selecao
</CardDescription>
```

## Criterios de Sucesso

- [x] AI responde corretamente "top 3 por turma" usando window functions
- [x] Texto da AI renderiza negrito sem asteriscos
- [x] Filtro de periodos removido do dashboard
- [x] Ctrl+clique permite multi-selecao nos graficos
- [x] Graficos mostram multiplos itens selecionados com destaque
- [x] Texto explicativo "Ctrl+Clique para multi-selecao" visivel
- [ ] Todos os testes E2E passando
- [x] Build passando sem erros

## Ordem de Implementacao

1. **Primeiro:** Corrigir prompt da AI (lib/ai/shared.ts) ✅
2. **Segundo:** Corrigir renderizacao markdown (components/analytics/AIChat.tsx) ✅
3. **Terceiro:** Remover filtro de periodos (app/admin/dashboard/page.tsx) ✅
4. **Quarto:** Implementar multi-selecao com Ctrl (app/admin/dashboard/page.tsx) ✅
5. **Quinto:** Criar/atualizar testes E2E
6. **Sexto:** Verificar build e testar manualmente ✅

## Resultados da Implementacao (23/01/2026)

### Mudancas Realizadas

1. **lib/ai/shared.ts** - Adicionado exemplos de queries complexas com ROW_NUMBER() OVER (PARTITION BY) para "top N por grupo"

2. **components/analytics/AIChat.tsx** - Adicionada funcao `formatMarkdown` que converte `**texto**` para `<strong>texto</strong>` usando dangerouslySetInnerHTML

3. **app/admin/dashboard/page.tsx**:
   - Removido import de Select e tipo Quarter
   - Alterado FilterState de strings opcionais para arrays
   - Adicionada funcao `matchesFilter` para filtrar com arrays
   - Implementado `handleFilterClick` com deteccao de Ctrl/Cmd key
   - Atualizado todos os chart handlers para suportar multi-selecao
   - Atualizado todos os chart options para mostrar multiplas selecoes com destaque
   - Removido Select de periodos do JSX
   - Adicionado texto "Ctrl+Clique para multi-selecao" no cabecalho
   - Removida funcao nao usada `getMonthsAgo`

**Status: IMPLEMENTADO - Build passando**

---

## Correcao Adicional (23/01/2026 - Parte 2)

### Problema: Query CTE sendo cortada
A AI gerava corretamente `WITH ranked AS (...) SELECT ...`, mas a funcao `extractSQL` cortava tudo antes do SELECT, removendo o CTE.

### Solucao Aplicada

1. **lib/ai/shared.ts - extractSQL**
   - Alterada para primeiro tentar capturar `WITH...` (CTE) antes de `SELECT`
   - Regex agora: `sql.match(/WITH[\s\S]+?(?:;|$)/i)`

2. **lib/ai/shared.ts - validateSQL**
   - Alterada para aceitar queries que comecam com `WITH` ou `SELECT`

3. **lib/ai/shared.ts - SCHEMA_CONTEXT**
   - Adicionada instrucao: "A query deve comecar com WITH (para CTEs) ou SELECT"

4. **components/analytics/AIChat.tsx**
   - Removida exibicao do SQL gerado
   - Removida exibicao da tabela de dados
   - Removidos imports e codigo nao utilizados (Copy, Check, Database, etc.)
   - Agora mostra apenas a resposta em texto natural

**Status: CORRIGIDO - Build passando**
