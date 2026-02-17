---
status: ready
generated: 2026-02-01
---

# Balancear Dados Demo para Analytics

## Diagnóstico Atual (1408 ocorrências)

### Por Nível de Ensino (gráfico donut)
| Nível | Total | % | Status |
|-------|-------|---|--------|
| Infantil | 32 | 2.3% | MUITO BAIXO |
| Fundamental I | 205 | 14.6% | BAIXO |
| Fundamental II | 619 | 44.0% | OK |
| Médio | 552 | 39.2% | OK |

**Problema:** Infantil (2.3%) e Fund. I (14.6%) quase invisíveis no donut.

### Por Severidade (gráfico donut)
| Severidade | Total | % | Status |
|------------|-------|---|--------|
| Leve | 1051 | 74.6% | ALTO DEMAIS |
| Média | 117 | 8.3% | MUITO BAIXO |
| Grave | 240 | 17.0% | OK |

**Problema:** Média (8.3%) quase invisível. Proporção ideal: ~50% leve, ~30% média, ~20% grave.

### Por Categoria (gráfico barras horizontais)
| Categoria | Total | Severidade |
|-----------|-------|------------|
| Atraso | 329 | leve |
| Conversa Durante Aula | 311 | leve |
| Uso de Celular | 248 | leve |
| Falta de Material | 163 | leve |
| Desrespeito ao Professor | 133 | grave |
| Briga Verbal | 117 | media |
| Briga Fisica | 71 | grave |
| Vandalismo | 36 | grave |

**Problema:** Só 1 tipo médio (Briga Verbal). Vandalismo com poucos dados.

### Por Turma (gráfico barras verticais)
| Turma | Nível | Total | Status |
|-------|-------|-------|--------|
| Creche A | infantil | 17 | MUITO BAIXO |
| Pré-escola A | infantil | 15 | MUITO BAIXO |
| 1º B | fund_i | 152 | OK |
| 3º A | fund_i | 25 | BAIXO |
| 5º A | fund_i | 28 | BAIXO |
| 6º A | fund_ii | 41 | BAIXO |
| 7º A | fund_ii | 43 | BAIXO |
| 8º A | fund_ii | 195 | OK |
| 8º B | fund_ii | 154 | OK |
| 9º A | fund_ii | 186 | OK |
| 1ª A | medio | 156 | OK |
| 1ª B | medio | 130 | OK |
| 2ª A | medio | 70 | OK-BAIXO |
| 2ª B | medio | 39 | BAIXO |
| 3ª A | medio | 59 | OK-BAIXO |
| 3ª B | medio | 98 | OK |

### Por Mês (gráfico barras - Tendência Mensal)
| Mês | Total | Status |
|-----|-------|--------|
| Jan | 103 | OK |
| Fev | 135 | OK |
| Mar | 165 | OK |
| Abr | 127 | OK |
| Mai | 143 | OK |
| Jun | 105 | OK |
| Jul | 23 | OK (férias) |
| Ago | 150 | OK |
| Set | 157 | OK |
| Out | 135 | OK |
| Nov | 120 | OK |
| Dez | 45 | OK (férias) |

Meses estão OK - distribuição realista.

## Plano de Inserção

### Meta por Nível de Ensino
Trazer Infantil e Fund. I para proporções mais visíveis:
- **Infantil:** 32 → ~150 (+118 ocorrências)
- **Fund. I:** 205 → ~350 (+145 ocorrências)
- **Fund. II:** 619 → manter
- **Médio:** 552 → manter

### Meta por Severidade
Rebalancear inserindo mais "média":
- Das ~263 novas ocorrências, distribuir:
  - ~80 leve (30%)
  - ~120 média (46%) — resolver o déficit de "Briga Verbal"
  - ~63 grave (24%)

### Turmas que precisam de mais dados
| Turma | Atual | Meta | Inserir |
|-------|-------|------|---------|
| Creche A | 17 | 55 | +38 |
| Pré-escola A | 15 | 80 | +65 |
| 3º A | 25 | 75 | +50 |
| 5º A | 28 | 75 | +47 |
| 6º A | 41 | 70 | +29 |
| 7º A | 43 | 70 | +27 |
| 2ª B | 39 | 50 | +11 |

**Total a inserir: ~267 ocorrências**

### Distribuição por Tipo nas Novas Ocorrências
Para as turmas de **Infantil** (tipos mais adequados à faixa etária):
- Conversa Durante Aula (leve) — 30%
- Falta de Material (leve) — 25%
- Briga Verbal (media) — 25%
- Briga Fisica (grave) — 10%
- Desrespeito ao Professor (grave) — 10%

Para as turmas de **Fund. I e II**:
- Briga Verbal (media) — 35% (prioridade para rebalancear severidade)
- Conversa Durante Aula (leve) — 15%
- Atraso (leve) — 10%
- Uso de Celular (leve) — 10%
- Desrespeito ao Professor (grave) — 15%
- Briga Fisica (grave) — 10%
- Vandalismo (grave) — 5%

Para **Médio** (2ª B):
- Briga Verbal (media) — 40%
- Uso de Celular (leve) — 20%
- Desrespeito ao Professor (grave) — 20%
- Vandalismo (grave) — 20%

### Distribuição Temporal
- Distribuir proporcionalmente pelos meses letivos (Fev-Jun, Ago-Nov)
- Manter Jul e Dez com poucas ocorrências (férias)

## Execução
- Um único bloco PL/pgSQL com INSERT direto
- Usar `registered_by` de um professor existente
- Preencher `class_id_at_occurrence` = `class_id` do aluno
- Descrições variadas por tipo
