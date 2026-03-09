---
status: ready
generated: 2026-03-09
agents:
  - type: "frontend-specialist"
    role: "Adicionar filtro de severidade com default 'Graves' nas 3 páginas de Ocorrências"
phases:
  - id: "phase-P"
    name: "Plano e Análise"
    prevc: "P"
    agent: "architect-specialist"
  - id: "phase-E"
    name: "Implementação"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "phase-V"
    name: "Validação"
    prevc: "V"
    agent: "code-reviewer"
---

# Filtro de Severidade nas Páginas de Ocorrências

> Adicionar filtro de Severidade (Todas / Graves / Médias / Leves) com padrão **Graves**
> nas três páginas de Ocorrências do sistema (professor, admin e viewer), sem nenhuma
> alteração de backend ou banco de dados.

## Task Snapshot
- **Primary goal:** Ao abrir a aba de Ocorrências (admin e viewer), o usuário vê automaticamente apenas as **Graves**, podendo mudar para Médias, Leves ou Todas.
- **Success signal:** As 2 páginas (admin e viewer) abrem com `filterSeverity = 'grave'` pré-selecionado e a tabela já filtrada. O Select exibe as opções corretas e o filtro funciona.
- **Fora de escopo:** `app/professor/ocorrencias/page.tsx` — não será modificado.
- **Key references:**
  - `app/admin/ocorrencias/page.tsx` — não tem `filterSeverity`; precisa adicionar state, Select UI e filtro
  - `app/viewer/ocorrencias/page.tsx` — igual ao admin; precisa das mesmas 3 adições

---

## Análise do Código Atual

### Admin (`app/admin/ocorrencias/page.tsx`)
- **Não tem** `filterSeverity` state
- **Não tem** Select de severidade nos filtros
- **Não tem** `matchesSeverity` no filtro client-side
- **Mudanças necessárias (3):**
  1. Adicionar `const [filterSeverity, setFilterSeverity] = useState('grave');` na seção Filters (linha ~83)
  2. Adicionar Select de severidade no bloco de filtros da UI (após o Select de tipo, linha ~524)
  3. Adicionar `matchesSeverity` na função `filteredOccurrences` (linha ~390)

### Viewer (`app/viewer/ocorrencias/page.tsx`)
- Estrutura idêntica ao admin (sem `filterSeverity`)
- **Mudanças necessárias (3):** exatamente as mesmas que o admin

---

## Plano de Implementação

### Fase E — Implementação (único arquivo de cada vez)

#### E.1 — Admin page
```diff
// Seção Filters (~linha 83), após filterType:
+ const [filterSeverity, setFilterSeverity] = useState('grave');

// filteredOccurrences (~linha 382):
  const matchesType = !filterType || ...;
+ const matchesSeverity = !filterSeverity || occurrence.occurrence_type?.severity === filterSeverity;
- return matchesSearch && matchesClass && matchesStatus && matchesType;
+ return matchesSearch && matchesClass && matchesStatus && matchesType && matchesSeverity;

// Select UI (após o Select de tipo ~linha 524):
+ <Select
+   value={filterSeverity}
+   onChange={(e) => setFilterSeverity(e.target.value)}
+   className="w-40"
+ >
+   <option value="">Todas ocorrências</option>
+   <option value="leve">Leve</option>
+   <option value="media">Média</option>
+   <option value="grave">Grave</option>
+ </Select>
```

#### E.2 — Viewer page
Mudanças idênticas ao admin.

---

## Decisões de Design

| Decisão | Escolha | Alternativa descartada |
|---|---|---|
| Escopo do filtro | Client-side (consistente com outros filtros) | Server-side com query param (over-engineering para esta feature) |
| Default | `'grave'` | `''` (todos) — menos útil para o objetivo de priorização |
| Label do "all" | "Todas ocorrências" | "Todas severidades" — menos natural no contexto |
| Onde adicionar o Select (admin/viewer) | Após o Select de tipo | Antes do Select de turma — ordenação lógica: status → turma → tipo → severidade |

---

## Pontos de Atenção

- **Admin usa paginação (100/página):** O filtro é client-side, então mostra apenas as graves da página atual. Este é o comportamento consistente com todos os outros filtros (status, turma, tipo). Não é uma regressão — é a arquitetura atual.
- **Sem impacto em backend/DB:** Zero alterações em APIs ou schema.
- **Sem impacto em testes E2E:** Os testes existentes não testam o estado padrão dos selects de severidade.
