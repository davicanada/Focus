# Plano: Redesign Analytics Tab v2 - Conforme Imagem

## Referência Visual (New-Analytics-Tab.png)

### Layout Exato

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Focus    [Sidebar]           Administrador            [Jônatas Maced Edgar] │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────────────────────┐
│ ▓▓ Tendência Mensal - 2026 │  │ ▓▓ Distribuição por Categoria               │
│    Ocorrências por mês...   │  │    Por tipo (clique para filtrar)           │
├─────────────────────────────┤  ├───────────────────────┬─────────────────────┤
│                             │  │ Atraso        ██████  │                     │
│   ██ ██ ██ ██ ██ ██ ...    │  │ Briga         ████    │      🔵 Donut       │
│   Jan Feb Mar ...           │  │ Desrespeito   ███     │    Severidade       │
│                             │  │ ...           ██      │  (sem título vis.)  │
└─────────────────────────────┘  └───────────────────────┴─────────────────────┘

┌─────────────────────────────────────────────┐  ┌────────────────────────────┐
│ ▓▓ Por Nível de Ensino  │ ▓▓ Por Turno     │  │ ▓▓ Ocorrências por Turma   │
│    Por nível (clique)   │    Por período   │  │    Max/Média/Min (clique)  │
├─────────────────────────┼──────────────────┤  ├────────────────────────────┤
│                         │                  │  │ 1º Ano A      █████████   │
│      🔵 Donut           │      🔵 Donut   │  │ 2º Ano B      ████████    │
│   labels externos       │   labels ext.    │  │ 3º Ano A      ███████     │
└─────────────────────────┴──────────────────┘  └────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────────────────────┐
│ ▓▓ Alunos com Ocorrências  │  │ ▓▓ Alunos sem Ocorrências                   │
│    X alunos (clique)        │  │    X alunos sem registro                    │
├─────────────────────────────┤  ├─────────────────────────────────────────────┤
│ [Gráfico barras horiz.]     │  │ [Tabela: Aluno | Turma]                     │
└─────────────────────────────┘  └─────────────────────────────────────────────┘
```

## Mudanças Necessárias

### 1. Row 1: Tendência Mensal + Distribuição por Categoria

**Card Esquerdo: Tendência Mensal**
- Título: "Tendência Mensal - {ano}"
- Subtítulo: "Ocorrências por mês (clique para filtrar)"
- Gráfico de barras verticais

**Card Direito: Distribuição por Categoria (COMBINADO)**
- Título: "Distribuição por Categoria"
- Subtítulo: "Por tipo (clique para filtrar)"
- **Layout interno em 2 colunas:**
  - Esquerda: Gráfico de barras horizontais (categorias)
  - Direita: Donut de severidade (SEM título visível, apenas integrado)

### 2. Row 2: Donuts lado a lado + Ocorrências por Turma

**Card Esquerdo: 2 Donuts lado a lado**
- Dividido em 2 seções com headers separados:
  - "Por Nível de Ensino" | "Por Turno"
- Cada um com seu donut com labels externos (quantidade + %)

**Card Direito: Ocorrências por Turma**
- Gráfico de barras horizontais
- Cores: máximo (vermelho), mínimo (verde), resto (azul)

### 3. Row 3: Alunos

**Card Esquerdo: Alunos com Ocorrências**
- Gráfico de barras horizontais

**Card Direito: Alunos sem Ocorrências**
- Tabela compacta

### 4. Ajustes nos Donuts

**TODOS os donuts devem ter:**
```typescript
label: {
  show: true,
  formatter: '{b}\n{c} ({d}%)',
  position: 'outside',
  fontSize: 10,
  lineHeight: 12,
},
labelLine: { show: true, length: 8, length2: 4 },
```

### 5. Cores (conforme imagem)

A imagem mostra tons de azul consistentes:
- Barras: escala de azul (mais escuro = mais ocorrências)
- Headers: #153461 (azul escuro)
- Donuts: escala de azul

## Arquivos a Modificar

1. `app/admin/dashboard/page.tsx` - Layout JSX completo

## Implementação

### Estrutura JSX Final

```tsx
{/* Row 1: Tendência Mensal + Categoria/Severidade combinados */}
<div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
  {/* Tendência Mensal */}
  <AnalyticsCard title="..." subtitle="...">
    <ReactECharts ... />
  </AnalyticsCard>

  {/* Categoria + Severidade DENTRO do mesmo card */}
  <AnalyticsCard title="Distribuição por Categoria" subtitle="Por tipo (clique para filtrar)">
    <div className="grid grid-cols-2 gap-2">
      {/* Barras horizontais categorias */}
      <ReactECharts ... />
      {/* Donut severidade (sem título) */}
      <ReactECharts ... />
    </div>
  </AnalyticsCard>
</div>

{/* Row 2: Donuts (Nível + Turno) + Turmas */}
<div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
  {/* Card com 2 donuts lado a lado (headers internos) */}
  <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
    <div className="grid grid-cols-2">
      {/* Seção Nível */}
      <div>
        <div className="px-3 py-2 bg-[#153461]">
          <h3 className="text-xs font-semibold text-white">Por Nível de Ensino</h3>
          <p className="text-[10px] text-white/70">Por nível (clique para filtrar)</p>
        </div>
        <div className="p-2">
          <ReactECharts ... />
        </div>
      </div>
      {/* Seção Turno */}
      <div className="border-l">
        <div className="px-3 py-2 bg-[#153461]">
          <h3 className="text-xs font-semibold text-white">Por Turno</h3>
          <p className="text-[10px] text-white/70">Por período (clique para filtrar)</p>
        </div>
        <div className="p-2">
          <ReactECharts ... />
        </div>
      </div>
    </div>
  </div>

  {/* Ocorrências por Turma */}
  <AnalyticsCard title="..." subtitle="...">
    <ReactECharts ... />
  </AnalyticsCard>
</div>

{/* Row 3: Alunos com + sem ocorrências */}
<div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
  <AnalyticsCard title="Alunos com Ocorrências" ...>
    ...
  </AnalyticsCard>
  <AnalyticsCard title="Alunos sem Ocorrências" ...>
    <table>...</table>
  </AnalyticsCard>
</div>
```

## Validação

- [ ] Row 1: Tendência + (Categoria + Severidade juntos)
- [ ] Row 2: (Nível | Turno) + Turmas
- [ ] Row 3: Alunos com + Alunos sem
- [ ] Donuts com labels externos (quantidade + %)
- [ ] Cross-filtering funcionando
- [ ] Headers azul escuro #153461
