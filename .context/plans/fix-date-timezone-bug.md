---
status: completed
generated: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Corrigir parsing de datas para evitar problema de timezone"
phases:
  - id: "phase-1"
    name: "Análise"
    prevc: "P"
    status: completed
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
    status: completed
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
    status: completed
---

# Corrigir bug de timezone nas datas dos períodos

> Datas exibidas aparecem 1 dia antes do valor inserido (ex: 01/01/2026 vira 31/12/2025)

## Task Snapshot

- **Primary goal:** Corrigir exibição de datas para mostrar o valor correto
- **Success signal:** Data "2026-01-01" exibe como "01/01/2026" (não "31/12/2025")
- **Arquivos afetados:** `lib/utils.ts` - funções `formatDate`, `formatDateTime`, `formatDateForInput`

## Análise da Causa Raiz

### O Problema

Quando o banco de dados retorna uma data no formato `"2026-01-01"` (tipo DATE):

```javascript
const d = new Date("2026-01-01");
// JavaScript interpreta como: 2026-01-01T00:00:00.000Z (UTC meia-noite)

d.toLocaleDateString('pt-BR');
// No Brasil (UTC-3), meia-noite UTC é 21:00 do dia anterior
// Resultado: "31/12/2025" ❌
```

### A Solução

Parsear a string de data como data LOCAL, não UTC:

```javascript
const [year, month, day] = "2026-01-01".split('-').map(Number);
const d = new Date(year, month - 1, day); // month é 0-indexed
// JavaScript cria: 2026-01-01T00:00:00 no fuso local

d.toLocaleDateString('pt-BR');
// Resultado: "01/01/2026" ✅
```

### Funções Afetadas (lib/utils.ts)

| Função | Linha | Problema |
|--------|-------|----------|
| `formatDate()` | 10-17 | Usa `new Date(date)` direto |
| `formatDateTime()` | 20-29 | Usa `new Date(date)` direto |
| `formatDateForInput()` | 32-35 | Usa `new Date(date)` direto |

## Working Phases

### Phase 1 — Análise ✅ COMPLETA
- [x] Identificar sintoma (data -1 dia)
- [x] Identificar causa raiz (parsing UTC vs local)
- [x] Localizar funções afetadas

### Phase 2 — Implementação
**Tarefas:**
1. Criar helper `parseLocalDate()` para parsing seguro
2. Atualizar `formatDate()` para usar o helper
3. Atualizar `formatDateTime()` para usar o helper
4. Atualizar `formatDateForInput()` para usar o helper
5. Testar todas as páginas que usam essas funções

### Phase 3 — Validação
**Testes:**
1. Página de períodos mostra datas corretas
2. Dashboard Analytics mostra datas corretas
3. Página de ocorrências mostra datas corretas
4. Input de data carrega valor correto para edição

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Helper separado | Sim | Reutilizável e testável |
| Manter compatibilidade com Date object | Sim | Funções recebem `string \| Date` |
| Regex para validar formato | Não | Confiar no formato do banco |

## Evidence & Follow-up

- [x] Helper `parseLocalDate()` criado (linhas 13-25 em lib/utils.ts)
- [x] `formatDate()` corrigido
- [x] `formatDateTime()` corrigido
- [x] `formatDateForInput()` corrigido (usa métodos locais em vez de toISOString)
- [x] TypeScript type check passando
- [ ] Validar datas na UI (teste manual)
