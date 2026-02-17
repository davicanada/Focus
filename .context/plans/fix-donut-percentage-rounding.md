---
status: ready
generated: 2026-02-01
---

# Arredondar Porcentagens nos Gráficos de Rosca

## Problema
Os gráficos donut (Severidade, Nível de Ensino, Turno) mostram porcentagens com casas decimais, ex: "8.06%", "12.72%". Devem mostrar números inteiros: "8%", "13%".

## Causa
O ECharts usa `{d}` como placeholder para porcentagem, que por padrão inclui 2 casas decimais. Usado em `formatter: '{b}\n{c} ({d}%)'`.

## Solução
Trocar o formatter de string template para função em 3 locais:

### Linhas afetadas no `AnalyticsDashboard.tsx`:
1. **Linha 705** — Gráfico de Severidade (`severityChartOption`)
2. **Linha 868** — Gráfico de Nível de Ensino (`educationLevelChartOption`)
3. **Linha 913** — Gráfico de Turno (`shiftChartOption`)

### De:
```js
formatter: '{b}\n{c} ({d}%)',
```

### Para:
```js
formatter: (params: any) => `${params.name}\n${params.value} (${Math.round(params.percent)}%)`,
```

`params.percent` é o valor numérico da porcentagem que `{d}` mostra. `Math.round()` arredonda para inteiro.
