---
status: completed
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Redesenhar interface de períodos acadêmicos"
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
    status: pending
---

# Melhorar UX da página de Períodos Acadêmicos

> Unificar cards redundantes em interface única com modos de visualização e edição

## Task Snapshot

- **Primary goal:** Eliminar redundância entre "Configuração de Períodos" e "Períodos Configurados"
- **Success signal:** Interface única com toggle entre VIEW e EDIT modes
- **Arquivos afetados:** `app/admin/trimestres/page.tsx`

## Problema Atual

A página tem dois cards:

1. **"Configuração de Períodos"** (linhas 311-429):
   - Sempre visível
   - Mostra seletor de tipo + campos de data
   - Botão "Salvar Períodos"

2. **"Períodos Configurados"** (linhas 431-473):
   - Visível apenas quando `quarters.length > 0 && !hasChanges`
   - Mostra tabela com resumo dos períodos

**Redundância:** Quando existem períodos salvos, ambos os cards mostram a mesma informação - um como formulário editável, outro como tabela read-only.

## Solução Proposta

### Interface Unificada

```
┌─────────────────────────────────────────────────────────────────┐
│ Períodos Acadêmicos                             [Editar] (btn)  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tipo: Bimestre (4 períodos)                                   │
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────┬─────────┐      │
│  │ Período      │ Início       │ Fim          │ Status  │      │
│  ├──────────────┼──────────────┼──────────────┼─────────┤      │
│  │ 1º Bimestre  │ 05/02/2026   │ 15/04/2026   │ Atual   │      │
│  │ 2º Bimestre  │ 16/04/2026   │ 30/06/2026   │ Futuro  │      │
│  │ 3º Bimestre  │ 01/08/2026   │ 30/09/2026   │ Futuro  │      │
│  │ 4º Bimestre  │ 01/10/2026   │ 15/12/2026   │ Futuro  │      │
│  └──────────────┴──────────────┴──────────────┴─────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Estados

1. **VIEW Mode** (padrão quando existem períodos salvos):
   - Card com título + botão "Editar" no canto
   - Badge mostrando tipo selecionado
   - Tabela read-only com períodos
   - Botão "Excluir Todos" discreto no rodapé

2. **EDIT Mode** (quando não há períodos OU clicou em Editar):
   - Card com título + botão "Cancelar" (se tinha períodos antes)
   - Select para escolher/trocar tipo
   - Campos de data para cada período
   - Botões "Cancelar" e "Salvar" no rodapé

### Fluxo

```
Primeiro acesso (sem períodos)
  └─→ EDIT mode automático
        └─→ Seleciona tipo
              └─→ Preenche datas
                    └─→ Salva
                          └─→ VIEW mode

Já tem períodos configurados
  └─→ VIEW mode
        └─→ [Editar] → EDIT mode
              └─→ Modifica datas
                    └─→ [Salvar] → VIEW mode
                    └─→ [Cancelar] → VIEW mode (descarta mudanças)
```

## Working Phases

### Phase 1 — Análise ✅ COMPLETA
- [x] Identificar estrutura atual (2 cards)
- [x] Documentar redundância
- [x] Desenhar nova interface unificada

### Phase 2 — Implementação
**Tarefas:**
1. Adicionar state `isEditing` para controlar modo VIEW/EDIT
2. Unificar em único Card com renderização condicional
3. VIEW mode: mostrar tipo como Badge + tabela read-only
4. EDIT mode: manter formulário atual
5. Adicionar botão "Editar" no header (VIEW mode)
6. Adicionar botão "Cancelar" (EDIT mode, quando existem períodos)
7. Restaurar estado original no cancelamento

### Phase 3 — Validação
**Testes:**
1. Primeiro acesso (sem períodos) → abre em EDIT mode
2. Com períodos salvos → abre em VIEW mode
3. Clicar "Editar" → muda para EDIT mode
4. Clicar "Cancelar" → volta VIEW mode, descarta mudanças
5. Clicar "Salvar" → salva e volta VIEW mode
6. Trocar tipo → confirmação e limpa períodos

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Card único | Sim | Elimina redundância |
| View como padrão | Sim | Usuário geralmente só visualiza |
| Cancelar restaura estado | Sim | UX de edição tradicional |

## Evidence & Follow-up

- [x] State `isEditing` adicionado
- [x] VIEW mode implementado (tabela read-only + botão Editar)
- [x] EDIT mode preservado (formulário com seletor de tipo + campos de data)
- [x] Cancelar restaura estado original
- [x] Build passando (apenas warnings pré-existentes)
