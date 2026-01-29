---
status: ready
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Implementar layout responsivo de 3 colunas e otimizacoes mobile"
  - type: "mobile-specialist"
    role: "Validar e testar experiencia mobile"
phases:
  - id: "phase-1"
    name: "Analise do Layout Atual"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao e Testes"
    prevc: "V"
---

# Analytics Dashboard Layout - Desktop 3 Columns + Mobile Optimization Plan

> Reorganizar layout do Analytics para desktop (3 graficos na mesma linha) e otimizar para mobile

## Task Snapshot
- **Primary goal:** Colocar os 3 graficos de distribuicao (Categoria, Severidade, Nivel de Ensino) na mesma linha no desktop e melhorar a experiencia mobile da aba Analytics.
- **Success signal:** Desktop mostra 3 graficos lado a lado em lg (1024px+), mobile tem charts legiveis e touch-friendly.
- **Key references:**
  - `app/admin/dashboard/page.tsx` - Dashboard Analytics (linhas 769-826)
  - `e2e/mobile-responsive.spec.ts` - Testes mobile existentes
  - Tailwind CSS breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## Codebase Context

### Layout Atual (Linhas 769-826)
```tsx
{/* Category + Severity - 2 colunas */}
<div className="grid gap-6 md:grid-cols-2">
  <Card> {/* Distribuicao por Categoria */} </Card>
  <Card> {/* Distribuicao por Severidade */} </Card>
</div>

{/* Education Level - SOZINHO EM LINHA PROPRIA */}
<Card>
  <CardTitle>Ocorrencias por Nivel de Ensino</CardTitle>
  ...
</Card>
```

### Problema Identificado
- O grafico "Ocorrencias por Nivel de Ensino" esta isolado em uma linha propria
- No desktop (>1024px) ha espaco para 3 graficos lado a lado
- Mobile precisa de otimizacoes especificas para charts ECharts

### Breakpoints Tailwind em Uso
| Breakpoint | Largura | Uso no Projeto |
| --- | --- | --- |
| sm | 640px | Pouco usado |
| md | 768px | Separacao mobile/desktop principal |
| lg | 1024px | **Ideal para 3 colunas** |
| xl | 1280px | Headers e elementos grandes |

## Proposta de Solucao

### Desktop (lg: 1024px+)
Mover Education Level para dentro do grid e usar `lg:grid-cols-3`:

```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  <Card> {/* Categoria - Barras Horizontais */} </Card>
  <Card> {/* Severidade - Donut */} </Card>
  <Card> {/* Nivel de Ensino - Donut */} </Card>
</div>
```

### Mobile (< 768px)
Otimizacoes especificas:
1. Charts empilham verticalmente (1 coluna)
2. Altura de charts ajustada para proporcao adequada
3. Labels de eixo truncados para caber
4. Touch area adequada para cross-filtering

### Tablet (768px - 1023px)
- 2 colunas: Categoria + Severidade na linha 1, Nivel na linha 2 (wrap natural)

## Agent Lineup
| Agent | Role in this plan | First responsibility focus |
| --- | --- | --- |
| Frontend Specialist | Implementar mudancas de layout CSS | Grid responsivo com 3 breakpoints |
| Mobile Specialist | Validar experiencia mobile | Testar touch interactions e legibilidade |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Charts muito pequenos em 3 colunas | Medium | Medium | Ajustar altura minima, labels truncados |
| Cross-filtering quebra em mobile | Low | High | Testar click/touch em todos os graficos |
| Overflow de labels | Medium | Low | Usar ellipsis e tooltip |

### Dependencies
- **Internal:** Nenhuma - apenas mudanca de CSS
- **External:** Nenhuma
- **Technical:** Tailwind CSS responsive utilities (ja configurado)

### Assumptions
- lg (1024px) e largura suficiente para 3 charts de ~320px cada
- Charts ECharts se adaptam automaticamente ao container

## Working Phases

### Phase 1 - Analise do Layout Atual (CONCLUIDO)

**Estrutura Atual Mapeada:**
1. Monthly Trend - Full width
2. Category + Severity - `md:grid-cols-2`
3. Education Level - Full width (problema)
4. Students + Classes - `md:grid-cols-2`
5. Students without Occurrences - Full width
6. AI Chat - Full width

### Phase 2 - Implementacao

**Step 2.1: Reorganizar Grid dos 3 Graficos de Distribuicao**

Mover o Card de Education Level para dentro do grid existente:

```tsx
// ANTES (linhas 769-826)
<div className="grid gap-6 md:grid-cols-2">
  <Card> {/* Categoria */} </Card>
  <Card> {/* Severidade */} </Card>
</div>
<Card> {/* Nivel - SOZINHO */} </Card>

// DEPOIS
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  <Card> {/* Categoria */} </Card>
  <Card> {/* Severidade */} </Card>
  <Card> {/* Nivel - JUNTO */} </Card>
</div>
```

**Step 2.2: Ajustar Alturas dos Charts**

Categoria (barras horizontais) - altura dinamica baseada em dados:
```tsx
style={{ height: Math.max(220, categoryData.length * 30) }}
```

Severidade e Nivel (donuts) - altura fixa:
```tsx
style={{ height: 280 }}
```

**Step 2.3: Otimizar Headers dos Cards**

Reduzir padding e tamanho de fonte para cards mais compactos:
```tsx
<CardHeader className="pb-2">
  <CardTitle className="text-base lg:text-lg">...</CardTitle>
  <CardDescription className="text-xs lg:text-sm line-clamp-1">...</CardDescription>
</CardHeader>
<CardContent className="pt-0">
```

**Step 2.4: Ajustar ECharts Options para Containers Menores**

Severidade - labels externos mais compactos:
```typescript
label: {
  show: true,
  formatter: '{b}\n{c} ({d}%)',
  fontSize: 11,
  lineHeight: 14
}
```

### Phase 3 - Validacao e Testes

**Step 3.1: Testes Manuais Desktop**
- [ ] 3 graficos alinhados em lg (1024px+)
- [ ] 2 colunas em md (768px - 1023px) com wrap
- [ ] 1 coluna em mobile (< 768px)
- [ ] Cross-filtering funciona em todos

**Step 3.2: Testes Manuais Mobile**
- [ ] Charts legiveis (labels, valores)
- [ ] Touch/click funciona para filtrar
- [ ] Scroll vertical suave
- [ ] Nenhum overflow horizontal

**Step 3.3: Build**
- [ ] `npm run build` passa sem erros

## Rollback Plan

### Rollback Triggers
- Charts ficam ilegiveis em algum breakpoint
- Cross-filtering quebra
- Layout quebra em resolucoes especificas

### Rollback Procedures
- **Acao:** Reverter classe CSS de `lg:grid-cols-3` para `md:grid-cols-2` e mover Education Level para fora do grid
- **Impacto:** Nenhum em dados - apenas mudanca de UI
- **Tempo:** < 5 minutos

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot desktop 1920x1080 (3 colunas)
- [ ] Screenshot tablet 1024x768 (transicao)
- [ ] Screenshot mobile 375x667 (1 coluna)
- [ ] Build passando

## Codigo Final Esperado

```tsx
{/* Distribution Charts - Responsive 3 Columns */}
<div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Category Distribution - Horizontal Bars */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base lg:text-lg">Distribuicao por Categoria</CardTitle>
      <CardDescription className="text-xs lg:text-sm line-clamp-1">
        Por tipo (clique para filtrar)
      </CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      {categoryData.length > 0 ? (
        <ReactECharts
          option={categoryChartOption}
          style={{ height: Math.max(220, categoryData.length * 30) }}
          onChartReady={onCategoryChartReady}
        />
      ) : (
        <p className="text-center text-muted-foreground py-8">Sem dados</p>
      )}
    </CardContent>
  </Card>

  {/* Severity Distribution - Donut */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base lg:text-lg">Distribuicao por Severidade</CardTitle>
      <CardDescription className="text-xs lg:text-sm line-clamp-1">
        Por gravidade (clique para filtrar)
      </CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      {severityData.length > 0 ? (
        <ReactECharts
          option={severityChartOption}
          style={{ height: 280 }}
          onChartReady={onSeverityChartReady}
        />
      ) : (
        <p className="text-center text-muted-foreground py-8">Sem dados</p>
      )}
    </CardContent>
  </Card>

  {/* Education Level - Donut */}
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base lg:text-lg">Por Nivel de Ensino</CardTitle>
      <CardDescription className="text-xs lg:text-sm line-clamp-1">
        Por nivel (clique para filtrar)
      </CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      {educationLevelData.length > 0 ? (
        <ReactECharts
          option={educationLevelChartOption}
          style={{ height: 280 }}
          onChartReady={onEducationLevelChartReady}
        />
      ) : (
        <p className="text-center text-muted-foreground py-8">Sem dados</p>
      )}
    </CardContent>
  </Card>
</div>
```
