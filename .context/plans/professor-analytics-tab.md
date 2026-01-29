# Plano: Analytics Tab para Painel do Professor

## Objetivo
Clonar a aba Analytics do painel de administrador para o painel do professor - **CÓPIA 100% IDÊNTICA**.

## O que será feito
- **CÓPIA EXATA** - sem nenhuma modificação nas queries
- Professor verá **TODAS** as ocorrências da instituição (igual ao admin)
- Mesmos gráficos, mesmas cores, mesmo cross-filtering
- AI Analytics incluído
- Única mudança: verificação de role para 'professor'

## Arquivos a Criar/Modificar

### 1. Nova Página: `app/professor/analytics/page.tsx`
- Cópia adaptada de `app/admin/dashboard/page.tsx`
- Todas as queries filtradas por `registered_by = userId`
- Mesmo layout visual e funcionalidades de cross-filtering

### 2. Atualizar Sidebar: `components/layout/Sidebar.tsx`
- Adicionar link para Analytics no menu do professor
- Posição: após "Minhas Ocorrências"

```typescript
const professorNavItems: NavItem[] = [
  { href: '/professor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/professor/registrar', label: 'Registrar Ocorrência', icon: PlusCircle },
  { href: '/professor/ocorrencias', label: 'Minhas Ocorrências', icon: List },
  { href: '/professor/analytics', label: 'Analytics', icon: BarChart3 }, // NOVO
];
```

## Modificações nas Queries (Professor)

Todas as queries devem incluir o filtro `registered_by = userId`:

### Query de Categorias
```typescript
const categoryQuery = supabase
  .from('occurrences')
  .select(`
    occurrence_type:occurrence_types(category, severity),
    student:students(full_name, class:classes(name, education_level, shift))
  `)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  .is('deleted_at', null)
  .gte('occurrence_date', startOfYear)
  .lte('occurrence_date', endOfYear);
```

### Query de Severidade
```typescript
const severityQuery = supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  ...
```

### Query de Tendência Mensal
```typescript
const yearOccurrencesQuery = supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  ...
```

### Query de Top Alunos
```typescript
const topStudentsQuery = supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  ...
```

### Query de Turmas
```typescript
const classesQuery = supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  ...
```

### Query de Nível de Ensino
```typescript
const educationLevelQuery = supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  ...
```

### Query de Turno
```typescript
const shiftQuery = supabase
  .from('occurrences')
  .select(...)
  .eq('institution_id', institutionId)
  .eq('registered_by', userId) // FILTRO DO PROFESSOR
  ...
```

### Query de Alunos sem Ocorrências
- **Importante**: Esta query mostra alunos que NÃO têm ocorrências registradas **pelo professor**
- Não é o mesmo que alunos sem nenhuma ocorrência na instituição

```typescript
// Buscar IDs de alunos com ocorrências do professor
const studentIdsWithOccurrences = new Set(
  topStudentsData.map(s => s.id)
);

// Filtrar alunos sem ocorrências do professor
const studentsWithout = allStudents.filter(
  s => !studentIdsWithOccurrences.has(s.id)
);
```

## Componentes Compartilhados

Os seguintes componentes já existem e serão reutilizados:
- `AnalyticsCard` (definido inline em dashboard/page.tsx - considerar extrair)
- `AIChat` (se quiser incluir para professores)
- `ReactECharts` (dynamic import)
- Constantes de cores: `ANALYTICS_COLORS`, `categorySeverityColors`, etc.

## Considerações de UX

### Título da Página
- Admin: "Analytics"
- Professor: "Minhas Estatísticas" ou "Analytics - Minhas Ocorrências"

### Subtítulos dos Cards
Ajustar para refletir que são dados do professor:
- "Ocorrências por mês (que você registrou)"
- "Por tipo (suas ocorrências)"
- "Alunos com ocorrências (registradas por você)"
- "Alunos sem ocorrências (registradas por você)"

### AI Chat
- **INCLUÍDO** - Cópia exata do componente AIChat
- O AI já responde baseado nos dados da instituição, funcionará normalmente

## Etapas de Implementação

### Fase 1: Criar a página
1. Copiar `app/admin/dashboard/page.tsx` para `app/professor/analytics/page.tsx`
2. Mudar verificação de role de 'admin' para 'professor'
3. **NENHUMA** modificação nas queries

### Fase 2: Atualizar navegação
1. Adicionar link "Analytics" no `professorNavItems` no Sidebar.tsx

### Fase 3: Verificar build

## Checklist de Validação

- [ ] Página carrega sem erros
- [ ] Gráficos mostram apenas ocorrências do professor
- [ ] Cross-filtering funciona entre todos os gráficos
- [ ] Filtro de ano funciona
- [ ] Navegação no sidebar funciona
- [ ] Layout responsivo (mobile)
- [ ] Build passa sem erros
- [ ] Cores consistentes com admin analytics

## Estimativa de Complexidade

- **Complexidade**: Média
- **Arquivos afetados**: 2 (1 novo + 1 modificação)
- **Risco**: Baixo (funcionalidade isolada, não afeta admin)

## Notas Adicionais

### Possíveis Melhorias Futuras
1. Extrair `AnalyticsCard` para componente reutilizável em `components/analytics/`
2. Criar hook `useAnalyticsData` para compartilhar lógica de queries
3. Adicionar comparativo mensal (mês atual vs mês anterior)
4. Adicionar meta de ocorrências para o professor acompanhar

### Segurança
- RLS já garante que professores só acessam dados de sua instituição
- Filtro `registered_by` é adicional para limitar ao escopo do professor
- Não há risco de vazamento de dados de outros professores
