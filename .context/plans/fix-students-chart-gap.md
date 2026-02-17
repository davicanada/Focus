---
status: ready
generated: 2026-02-01
---

# Corrigir Espaço no Gráfico "Alunos com Ocorrências"

## Problema
Quando o gráfico tem muitos alunos (ex: 294), a altura total fica enorme (294 × 22 = 6468px).
O `grid.top: '3%'` do ECharts calcula 3% dessa altura = ~194px de espaço vazio no topo.
Isso faz com que o primeiro aluno (com mais ocorrências) fique invisível sem scrollar para baixo.

## Causa Raiz
- `grid.top: '3%'` — porcentagem da altura total do chart
- Altura proporcional ao número de alunos: `Math.max(180, count * 22)`
- Container scroll `max-h-[200px]` começa no topo, onde há ~194px de vazio

## Solução
Trocar `grid.top` e `grid.bottom` de porcentagem para pixels fixos:

### Arquivo: `components/analytics/AnalyticsDashboard.tsx`

**Linha ~757 (topStudentsChartOption.grid):**
```
Antes: { left: '3%', right: '15%', bottom: '3%', top: '3%', containLabel: true }
Depois: { left: '3%', right: '15%', bottom: 5, top: 5, containLabel: true }
```

Isso garante que o espaço acima/abaixo das barras seja sempre 5px, independente da altura total.

### Opcional: Aumentar max-h do container
Se 200px for muito apertado para visualizar, considerar `max-h-[300px]` ou `max-h-[400px]`.
