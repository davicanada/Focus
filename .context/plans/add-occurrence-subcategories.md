# Plano: Adicionar Subcategorias aos Tipos de Ocorrencia

> **Status:** draft
> **Criado:** 2026-02-15

## Objetivo
Adicionar um campo `subcategory` aos tipos de ocorrencia (`occurrence_types`), com valores padrao do sistema e suporte a subcategorias customizadas por instituicao. No Analytics, substituir o grafico donut de **Severidade** pelo grafico donut de **Subcategoria**.

## Subcategorias Padrao do Sistema
1. **Pedagogico** - Questoes relacionadas ao processo de ensino-aprendizagem
2. **Comportamento Inadequado** - Atitudes que fogem das normas de convivencia
3. **Indisciplinar Leve** - Infracoes leves ao regimento escolar
4. **Indisciplinar Grave** - Infracoes graves ao regimento escolar
5. **Infracional** - Atos que configuram infracao legal

---

## Analise de Impacto Completo

### Arquivos Impactados (19 arquivos)

| # | Arquivo | Tipo de Mudanca | Complexidade |
|---|---------|-----------------|--------------|
| 1 | Banco de dados (migration) | Coluna `subcategory_id` em `occurrence_types` + tabela `occurrence_subcategories` | Alta |
| 2 | `types/index.ts` | Novo tipo `OccurrenceSubcategory`, campo em `OccurrenceType` | Baixa |
| 3 | `app/admin/tipos-ocorrencias/page.tsx` | Dropdown de subcategoria no modal + listagem | Media |
| 4 | `app/professor/registrar/page.tsx` | Exibir subcategoria no select de tipo | Baixa |
| 5 | `app/professor/ocorrencias/page.tsx` | Exibir subcategoria na listagem + filtro | Media |
| 6 | `components/analytics/AnalyticsDashboard.tsx` | Substituir grafico severidade por subcategoria + cross-filter | Alta |
| 7 | `lib/utils.ts` | Cores para subcategorias em `CHART_COLORS` | Baixa |
| 8 | `lib/ai/shared.ts` | Schema AI com campo subcategory | Baixa |
| 9 | `app/admin/relatorios/periodo/page.tsx` | Coluna subcategoria nos relatorios | Baixa |
| 10 | `app/api/occurrences/route.ts` | Nenhuma mudanca (ja usa occurrence_type_id) | Nenhuma |
| 11 | `app/api/occurrences/[id]/route.ts` | Nenhuma mudanca (tipo carrega subcategoria via JOIN) | Nenhuma |
| 12 | `app/admin/page.tsx` | Dashboard admin - exibir subcategoria nas recentes | Baixa |
| 13 | `app/professor/page.tsx` | Dashboard professor - exibir subcategoria | Baixa |
| 14 | `app/viewer/page.tsx` | Dashboard viewer - exibir subcategoria | Baixa |
| 15 | `app/admin/alertas/page.tsx` | Exibir subcategoria nas notificacoes | Baixa |
| 16 | `app/admin/configuracoes/page.tsx` | Filtro de subcategoria nas regras de alerta | Media |
| 17 | `components/occurrences/OccurrenceDetailModal.tsx` | Exibir subcategoria no detalhe | Baixa |
| 18 | Excel/PDF export (relatorios) | Coluna subcategoria | Baixa |
| 19 | `app/api/alert-rules/route.ts` | Filtro por subcategoria nas regras | Media |

---

## Fase 1: Banco de Dados (Migration)

### Abordagem: Tabela separada `occurrence_subcategories`

Motivos:
- Permite CRUD independente sem afetar occurrence_types existentes
- Separa subcategorias padrao (is_default=true) das customizadas
- FK com ON DELETE SET NULL garante que tipos nunca quebram
- Admin pode gerenciar subcategorias sem tocar nos tipos
- Cores e descricoes ficam centralizadas

### Migration SQL

```sql
-- 1. Tabela de subcategorias
CREATE TABLE occurrence_subcategories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Subcategorias padrao do sistema (institution_id = NULL)
INSERT INTO occurrence_subcategories (name, description, color, is_default) VALUES
  ('Pedagogico', 'Questoes relacionadas ao processo de ensino-aprendizagem', '#3B82F6', true),
  ('Comportamento Inadequado', 'Atitudes que fogem das normas de convivencia', '#F59E0B', true),
  ('Indisciplinar Leve', 'Infracoes leves ao regimento escolar', '#EAB308', true),
  ('Indisciplinar Grave', 'Infracoes graves ao regimento escolar', '#EF4444', true),
  ('Infracional', 'Atos que configuram infracao legal', '#DC2626', true);

-- 3. Adicionar FK em occurrence_types
ALTER TABLE occurrence_types
  ADD COLUMN subcategory_id UUID REFERENCES occurrence_subcategories(id) ON DELETE SET NULL;

-- 4. RLS
ALTER TABLE occurrence_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_default_and_own_subcategories"
  ON occurrence_subcategories FOR SELECT USING (
    institution_id IS NULL
    OR institution_id IN (
      SELECT institution_id FROM user_institutions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_own_subcategories"
  ON occurrence_subcategories FOR ALL USING (
    institution_id IN (
      SELECT institution_id FROM user_institutions
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM user_institutions
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

-- 5. Indices
CREATE INDEX idx_subcategories_institution ON occurrence_subcategories(institution_id);
CREATE INDEX idx_subcategories_default ON occurrence_subcategories(is_default) WHERE is_default = true;
CREATE INDEX idx_occurrence_types_subcategory ON occurrence_types(subcategory_id);
```

### Migracao de dados existentes
- `occurrence_types` existentes ficam com `subcategory_id = NULL`
- Admin pode associar subcategorias gradualmente via CRUD
- No grafico, tipos sem subcategoria aparecem como "Nao classificado"

---

## Fase 2: Tipos TypeScript

### `types/index.ts`

```typescript
// NOVO tipo
export interface OccurrenceSubcategory {
  id: string;
  institution_id: string | null; // null = padrao do sistema
  name: string;
  description?: string;
  color?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ATUALIZAR OccurrenceType - adicionar:
subcategory_id?: string;
subcategory?: OccurrenceSubcategory; // JOIN opcional
```

---

## Fase 3: APIs

### Novas APIs

**`GET /api/occurrence-subcategories`**
- Lista subcategorias padrao (is_default=true) + da instituicao do usuario
- Ordena: padrao primeiro, depois customizadas por nome

**`POST /api/occurrence-subcategories`**
- Cria subcategoria customizada para a instituicao
- Campos: name, description, color
- Validacao: nome unico por instituicao

**`PUT /api/occurrence-subcategories/[id]`**
- Edita subcategoria customizada (bloqueia edicao das padrao)
- Apenas admin da instituicao

**`DELETE /api/occurrence-subcategories/[id]`**
- Soft delete (is_active = false) de customizada
- Bloqueia exclusao das padrao
- Tipos associados ficam com subcategory_id = NULL

### APIs existentes - SEM mudanca necessaria
- `POST /api/occurrences` - ja usa occurrence_type_id, subcategoria vem via JOIN
- `PUT /api/occurrences/[id]` - idem
- `DELETE /api/occurrences/[id]` - nenhuma relacao

---

## Fase 4: CRUD de Tipos de Ocorrencia

### `app/admin/tipos-ocorrencias/page.tsx`

Mudancas:
1. Carregar subcategorias disponiveis ao abrir pagina
2. Adicionar dropdown "Subcategoria" no modal de criar/editar tipo
   - Opcoes: padrao + customizadas + "Nenhuma"
   - Mostra badge colorido ao lado de cada opcao
3. Coluna "Subcategoria" na tabela de listagem com badge colorido
4. Botao/link "Gerenciar Subcategorias" abrindo modal ou secao
5. Na secao de gerenciamento:
   - Lista subcategorias padrao (somente leitura, badge "Sistema")
   - Lista customizadas (editaveis, excluiveis)
   - Botao "Nova Subcategoria" com campos: nome, descricao, cor

---

## Fase 5: Registro e Visualizacao de Ocorrencias

### `app/professor/registrar/page.tsx`
- No select de tipo, exibir subcategoria como texto auxiliar
- Formato: "Atraso - Indisciplinar Leve" ou agrupar com optgroup

### `app/professor/ocorrencias/page.tsx`
- Novo filtro dropdown "Subcategoria"
- Badge colorido de subcategoria na tabela
- Modal de detalhe exibe subcategoria

### Dashboards (admin/page.tsx, professor/page.tsx, viewer/page.tsx)
- Nas "Ocorrencias Recentes", exibir badge de subcategoria

---

## Fase 6: Analytics Dashboard (IMPACTO PRINCIPAL)

### `components/analytics/AnalyticsDashboard.tsx`

**Substituicao do grafico:**
- REMOVER: Grafico donut "Distribuicao por Severidade"
- ADICIONAR: Grafico donut "Distribuicao por Subcategoria"
- Mesma posicao no grid (coluna do meio no layout de 3 colunas)

**FilterState atualizado:**
```typescript
interface FilterState {
  categories: string[];
  severities: string[];       // MANTER para uso interno/filtros
  subcategories: string[];    // NOVO - filtro por subcategoria
  months: string[];
  classIds: string[];
  studentIds: string[];
  educationLevels: string[];
  shifts: string[];
}
```

**Cross-filtering:**
- Click em fatia do donut de subcategoria → filtra todos os graficos
- O donut de subcategoria exclui seu proprio filtro (como os outros)
- Ctrl+Click para multi-select

**Cores:**
```typescript
// lib/utils.ts - CHART_COLORS.subcategory
subcategory: {
  'Pedagogico': '#3B82F6',
  'Comportamento Inadequado': '#F59E0B',
  'Indisciplinar Leve': '#EAB308',
  'Indisciplinar Grave': '#EF4444',
  'Infracional': '#DC2626',
}
```
- Subcategorias customizadas usam a cor definida pelo admin
- Sem subcategoria ("Nao classificado") usa cinza #9CA3AF

**Query de dados:**
- O JOIN em occurrence_types ja existe, basta incluir subcategoria
- `.select('*, occurrence_type:occurrence_types(category, severity, subcategory_id, subcategory:occurrence_subcategories(name, color))')`
- Agrupa dados por `occurrence_type.subcategory.name`

---

## Fase 7: AI Analytics

### `lib/ai/shared.ts`
- Adicionar tabela `occurrence_subcategories` ao schema
- Adicionar `subcategory_id` ao schema de `occurrence_types`
- Exemplos de queries: "Quantas ocorrencias pedagogicas?", "Qual subcategoria mais frequente?"

---

## Fase 8: Relatorios e Export

### `app/admin/relatorios/periodo/page.tsx`
- Coluna "Subcategoria" apos "Tipo" nos relatorios
- No Excel: nova coluna
- No PDF: exibir junto ao tipo

---

## Fase 9: Sistema de Alertas

### `app/admin/configuracoes/page.tsx`
- Novo filtro "Subcategoria" na criacao de regras de alerta
- Dropdown com subcategorias disponiveis

### Avaliacao de alertas
- `evaluateAlertRules` pode filtrar por subcategory_id

---

## Decisoes de Design

### 1. Subcategoria obrigatoria ou opcional?
**Opcional** - tipos existentes ficam sem, admin associa gradualmente.
No grafico aparece como "Nao classificado".

### 2. O que acontece com severidade?
**Severidade CONTINUA existindo** como campo do tipo de ocorrencia (leve/media/grave).
Apenas o GRAFICO donut e substituido. A severidade ainda aparece em:
- Badges na listagem de ocorrencias
- Filtros do cross-filtering (via grafico de categorias que mostra cor por severidade)
- KPIs ("Graves este mes")
- Relatorios

### 3. Subcategorias padrao sao editaveis?
**Nao** - somente leitura. Customizadas sim.

### 4. E se o admin excluir uma subcategoria customizada?
Soft delete (is_active=false). Tipos associados mantem subcategory_id mas mostra
"(Removida)" na UI. Nao quebra integridade.

---

## Ordem de Implementacao

| Passo | Tarefa | Dependencia |
|-------|--------|-------------|
| 1 | Migration SQL (tabela + dados + FK) | Nenhuma |
| 2 | Tipos TypeScript | Passo 1 |
| 3 | APIs CRUD de subcategorias | Passo 2 |
| 4 | CRUD tipos de ocorrencia (dropdown subcategoria) | Passo 3 |
| 5 | Analytics Dashboard (grafico + cross-filter) | Passo 2 |
| 6 | Registro/Visualizacao (badge + filtro) | Passo 2 |
| 7 | AI Analytics (schema atualizado) | Passo 1 |
| 8 | Relatorios (coluna subcategoria) | Passo 2 |
| 9 | Alertas (filtro subcategoria) | Passo 3 |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Tipos existentes sem subcategoria | Certa | Baixo | Label "Nao classificado" no grafico |
| Performance do JOIN extra | Baixa | Baixo | Indice em subcategory_id, JOIN leve (tabela pequena) |
| Confusao entre severidade e subcategoria | Media | Medio | Tooltips explicativos, labels claros |
| Subcategoria customizada excluida | Baixa | Baixo | Soft delete, ON DELETE SET NULL na FK |
| RLS bloqueando leitura de padrao | Media | Alto | Policy permite leitura onde institution_id IS NULL |
