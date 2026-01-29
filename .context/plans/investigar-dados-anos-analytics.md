---
status: completed
generated: 2026-01-28
implemented: 2026-01-28
---

# Investigar Dados de Anos no Analytics

> Verificar de onde vem os anos 2024, 2025 e 2026 no slicer do Analytics e se existem dados reais para cada ano.

## Descobertas

### 1. Origem dos Anos no Slicer (ANTES)

O slicer de anos era **hardcoded** no codigo, NAO baseado em dados reais do banco.

```typescript
// ANTES - Anos fixos
const yearOptions = [
  new Date().getFullYear(),      // 2026
  new Date().getFullYear() - 1,  // 2025
  new Date().getFullYear() - 2,  // 2024
];
```

### 2. Dados Reais no Banco

| Ano  | Total Ocorrencias |
|------|-------------------|
| 2026 | 82 |
| 2025 | 0 |
| 2024 | 0 |

**Conclusao:** Apenas 2026 tinha dados, mas 2024 e 2025 apareciam no slicer.

## Implementacao (Opcao B - Anos Dinamicos)

### Mudancas Realizadas

**Arquivo:** `components/analytics/AnalyticsDashboard.tsx`

1. **Estado dinamico para anos:**
```typescript
const [yearOptions, setYearOptions] = useState<number[]>([new Date().getFullYear()]);
```

2. **Nova funcao `loadAvailableYears`:**
- Consulta ocorrencias da instituicao
- Extrai anos unicos com `new Set<number>()`
- Ordena decrescente (mais recente primeiro)
- Garante que ano atual sempre apareca
- Ajusta `selectedYear` se necessario

3. **Carregamento em paralelo:**
```typescript
await Promise.all([
  loadAvailableYears(institution.id),
  loadChartData(institution.id, activeFilters, new Date().getFullYear())
]);
```

### Comportamento

| Cenario | Resultado |
|---------|-----------|
| Instituicao com dados em 2026 | Mostra apenas 2026 |
| Instituicao com dados em 2025 e 2026 | Mostra 2026, 2025 |
| Instituicao sem dados | Mostra ano atual (2026) |
| Dados em ano passado, sem dados no atual | Mostra ano atual + anos com dados |

### Paginas Afetadas

- `/admin/analytics`
- `/professor/analytics`
- `/viewer/analytics`

### Paginas NAO Afetadas

- Anos Letivos (conceito diferente - tabela school_years)
- Turmas
- Relatorios
- Trimestres
