---
status: completed
generated: 2026-01-25
agents:
  - type: "feature-developer"
    role: "Implementar novo sistema de períodos acadêmicos"
phases:
  - id: "phase-1"
    name: "Análise e Planejamento"
    prevc: "P"
    status: completed
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
    status: pending
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
    status: pending
---

# Refatorar períodos acadêmicos (Bimestre/Trimestre/Semestre)

> Substituir sistema de trimestres com nome livre por escolha estruturada entre Bimestre (4), Trimestre (3) ou Semestre (2) com datas fixas

## Task Snapshot

- **Primary goal:** Permitir que admin escolha tipo de período e configure datas de todos os períodos de uma vez
- **Success signal:** Admin consegue configurar 4 bimestres, 3 trimestres ou 2 semestres com nomes automáticos
- **Arquivos afetados:**
  - `app/admin/trimestres/page.tsx` - Refatorar UI
  - `types/index.ts` - Adicionar tipo `PeriodType`
  - Banco de dados - Adicionar coluna `period_type` e `period_number`

## Requisitos

### Tipos de Período

| Tipo | Quantidade | Nomes Gerados |
|------|------------|---------------|
| Bimestre | 4 | 1º Bimestre, 2º Bimestre, 3º Bimestre, 4º Bimestre |
| Trimestre | 3 | 1º Trimestre, 2º Trimestre, 3º Trimestre |
| Semestre | 2 | 1º Semestre, 2º Semestre |

### Fluxo do Usuário

1. Admin acessa página "Períodos" (renomear de "Trimestres")
2. Escolhe o tipo: Bimestre, Trimestre ou Semestre
3. Sistema exibe formulário com N campos de data (início/fim) para cada período
4. Nomes são gerados automaticamente (não editáveis)
5. Admin preenche as datas e salva todos de uma vez

### Regras de Negócio

- **Sem nome livre** - Nomes são fixos baseados no tipo
- **Validação de datas** - Fim deve ser após início
- **Validação de sequência** - Início do período N+1 deve ser após fim do período N
- **Substituição** - Ao trocar o tipo, períodos antigos são excluídos e novos criados
- **Edição** - Permite editar apenas as datas, não o tipo (para trocar tipo, excluir tudo)

## Análise do Código Atual

### Tabela `quarters` (Banco de dados)
```
id              uuid        NOT NULL
institution_id  uuid        NOT NULL
name            varchar     NOT NULL  -- Atualmente livre, será gerado
start_date      date        NOT NULL
end_date        date        NOT NULL
is_active       boolean
created_at      timestamp
updated_at      timestamp
```

### Mudanças no Banco

Adicionar colunas:
```sql
ALTER TABLE quarters ADD COLUMN period_type VARCHAR(20); -- 'bimestre', 'trimestre', 'semestre'
ALTER TABLE quarters ADD COLUMN period_number INTEGER;   -- 1, 2, 3 ou 4
```

### Página Atual (`app/admin/trimestres/page.tsx`)

- Modal com campo de nome livre (Input)
- Campos de data início e fim
- CRUD individual (um período por vez)

### Nova Estrutura Proposta

```
┌─────────────────────────────────────────────────────────┐
│  Períodos Acadêmicos                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tipo de Período: [Bimestre ▼]                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1º Bimestre                                      │   │
│  │ Início: [____/____/____]  Fim: [____/____/____] │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 2º Bimestre                                      │   │
│  │ Início: [____/____/____]  Fim: [____/____/____] │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 3º Bimestre                                      │   │
│  │ Início: [____/____/____]  Fim: [____/____/____] │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 4º Bimestre                                      │   │
│  │ Início: [____/____/____]  Fim: [____/____/____] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Cancelar] [Salvar Todos] │
└─────────────────────────────────────────────────────────┘
```

## Working Phases

### Phase 1 — Análise ✅ COMPLETA
- [x] Analisar estrutura atual da tabela `quarters`
- [x] Analisar página atual `trimestres/page.tsx`
- [x] Definir requisitos e regras de negócio
- [x] Desenhar nova estrutura de UI

### Phase 2 — Implementação
**Tarefas:**

1. **Migration do banco de dados**
   ```sql
   ALTER TABLE quarters ADD COLUMN period_type VARCHAR(20);
   ALTER TABLE quarters ADD COLUMN period_number INTEGER;
   ```

2. **Atualizar tipos TypeScript** (`types/index.ts`)
   ```typescript
   export type PeriodType = 'bimestre' | 'trimestre' | 'semestre';

   export interface Quarter {
     // ... campos existentes
     period_type?: PeriodType;
     period_number?: number;
   }
   ```

3. **Criar constantes** (`lib/constants/periods.ts`)
   ```typescript
   export const PERIOD_TYPES = {
     bimestre: { label: 'Bimestre', count: 4 },
     trimestre: { label: 'Trimestre', count: 3 },
     semestre: { label: 'Semestre', count: 2 },
   };

   export function getPeriodName(type: PeriodType, number: number): string {
     return `${number}º ${PERIOD_TYPES[type].label}`;
   }
   ```

4. **Refatorar página** (`app/admin/trimestres/page.tsx`)
   - Renomear título para "Períodos Acadêmicos"
   - Substituir modal por formulário inline
   - Select para escolher tipo de período
   - Campos de data dinâmicos baseados no tipo
   - Salvar todos os períodos de uma vez
   - Validação de sequência de datas

### Phase 3 — Validação
**Testes:**
1. Selecionar Bimestre → 4 campos de data aparecem
2. Selecionar Trimestre → 3 campos de data aparecem
3. Selecionar Semestre → 2 campos de data aparecem
4. Nomes são gerados automaticamente (não editáveis)
5. Validação de datas sequenciais funciona
6. Salvar cria todos os períodos no banco
7. Trocar tipo exclui períodos antigos e cria novos

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Nome livre | Remover | Usuário solicitou nomes fixos |
| Edição individual | Remover | Simplificar UX, editar todos de uma vez |
| Trocar tipo | Excluir e recriar | Evitar inconsistências |
| Renomear página | "Períodos Acadêmicos" | Mais genérico que "Trimestres" |

## Evidence & Follow-up

- [ ] Migration aplicada no Supabase
- [ ] Tipos TypeScript atualizados
- [ ] Constantes criadas
- [ ] Página refatorada
- [ ] Build passando
- [ ] Teste manual dos 3 tipos de período
