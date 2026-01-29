---
status: completed
generated: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Modificar função de geração de nome e atualizar banco"
phases:
  - id: "phase-1"
    name: "Análise do código"
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

# Simplificar exibição dos nomes das turmas

> Modificar a exibição dos nomes das turmas para formato simplificado: "1º B" em vez de "1º ano B - Manhã"

## Task Snapshot

- **Primary goal:** Simplificar os nomes das turmas exibidos em todo o sistema
- **Success signal:** Nomes aparecem como "1º B", "2ª A" nos gráficos e tabelas
- **Arquivos afetados:**
  - `lib/constants/education.ts` - função `buildClassLabel()`
  - Banco de dados - coluna `name` da tabela `classes`

## Regras de Formatação

| Nível de Ensino | Formato Atual | Formato Desejado |
|-----------------|---------------|------------------|
| Ed. Infantil | Creche, Pré-escola | Creche, Pré-escola (sem mudança) |
| Ens. Fundamental | 1º ano B - Manhã | **1º B** |
| Ensino Médio | 2ª série A - Tarde | **2ª A** |
| Custom | Nome customizado | Nome customizado (sem mudança) |

### Detalhes:
- **Remover** "ano" e "série" do nome
- **Remover** turno do nome (Manhã, Tarde, Noite, Integral)
- **Manter** número ordinal (1º, 2º, 1ª, 2ª)
- **Manter** letra da turma (A, B, C...)

## Análise do Código Atual

### Função `buildClassLabel()` em `lib/constants/education.ts` (linhas 71-95)

```javascript
export function buildClassLabel(
  stage: EducationStage,
  yearLabel: string,     // Ex: "1º ano" ou "1ª série"
  section?: string,      // Ex: "A", "B"
  shift?: string         // Ex: "matutino"
): string {
  let label = section ? `${yearLabel} ${section}` : yearLabel;

  // Add shift if provided
  if (shift) {
    const shiftLabels = { matutino: 'Manhã', ... };
    label += ` - ${shiftLabels[shift] || shift}`;
  }

  return label;
}
```

**Problema:** Usa `yearLabel` completo ("1º ano") e adiciona turno.

### Onde é chamado

1. **`app/admin/turmas/page.tsx`** (linhas 167-179):
   ```javascript
   const yearData = EDUCATION_LEVELS[formData.education_level].years.find(
     (y) => y.code === formData.grade
   );
   const yearLabel = yearData?.label || formData.grade;  // "1º ano"

   const generatedName = buildClassLabel(
     formData.education_level,
     yearLabel,
     section,
     shift
   );
   ```

### Onde é exibido (usa `class.name` do banco)

1. **Dashboard Analytics** - `app/admin/dashboard/page.tsx`
   - Gráfico de turmas (linha 280, 509)
   - Tabela de alunos sem ocorrências (linha 251, 761)
   - Cross-filter por turma

2. **Página de turmas** - `app/admin/turmas/page.tsx`
   - Tabela de turmas ativas (linha 371)
   - Tabela de lixeira (linha 438)

3. **Página de alunos** - `app/admin/alunos/page.tsx`
   - Dropdown de seleção de turma
   - Tabela de alunos

4. **Página do professor** - `app/professor/registrar/page.tsx`, `app/professor/ocorrencias/page.tsx`
   - Seleção de aluno/turma

## Solução Proposta

### 1. Modificar `buildClassLabel()` para gerar formato simplificado

```javascript
export function buildClassLabel(
  stage: EducationStage,
  yearCode: string,      // Ex: "1", "2", "creche" (código, não label)
  section?: string,
  _shift?: string        // Ignorado (mantido para compatibilidade)
): string {
  // Educação Infantil: manter label completo (Creche, Pré-escola)
  if (stage === 'infantil') {
    const yearData = EDUCATION_LEVELS[stage].years.find(y => y.code === yearCode);
    const label = yearData?.label || yearCode;
    return section ? `${label} ${section}` : label;
  }

  // Custom: usar código diretamente
  if (stage === 'custom') {
    return section ? `${yearCode} ${section}` : yearCode;
  }

  // Fundamental e Médio: formato simplificado
  // Fundamental: "1" → "1º"
  // Médio: "1" → "1ª"
  const ordinal = stage === 'medio' ? `${yearCode}ª` : `${yearCode}º`;
  return section ? `${ordinal} ${section}` : ordinal;
}
```

### 2. Atualizar página de turmas para passar `yearCode` em vez de `yearLabel`

Em `app/admin/turmas/page.tsx`, mudar de:
```javascript
const yearLabel = yearData?.label || formData.grade;
const generatedName = buildClassLabel(..., yearLabel, ...);
```

Para:
```javascript
const generatedName = buildClassLabel(
  formData.education_level,
  formData.grade,  // Passa o código ("1", "2") em vez do label ("1º ano")
  section,
  shift
);
```

### 3. Migration SQL para atualizar nomes existentes

```sql
-- Atualiza nomes das turmas existentes para formato simplificado
UPDATE classes
SET name = CASE
  -- Ensino Fundamental: "1º ano A - Manhã" → "1º A"
  WHEN education_level = 'fundamental' AND section IS NOT NULL THEN
    grade || 'º ' || section
  WHEN education_level = 'fundamental' AND section IS NULL THEN
    grade || 'º'
  -- Ensino Médio: "1ª série A - Tarde" → "1ª A"
  WHEN education_level = 'medio' AND section IS NOT NULL THEN
    grade || 'ª ' || section
  WHEN education_level = 'medio' AND section IS NULL THEN
    grade || 'ª'
  -- Infantil: remover apenas turno se existir
  WHEN education_level = 'infantil' THEN
    REGEXP_REPLACE(name, ' - (Manhã|Tarde|Noite|Integral)$', '')
  -- Custom: manter como está
  ELSE name
END
WHERE deleted_at IS NULL;
```

## Working Phases

### Phase 1 — Análise ✅ COMPLETA
- [x] Identificar onde nomes são gerados (`lib/constants/education.ts`)
- [x] Identificar onde nomes são exibidos (dashboard, turmas, alunos, professor)
- [x] Documentar formato atual vs desejado
- [x] Definir regras de formatação

### Phase 2 — Implementação
**Tarefas:**
1. Modificar `buildClassLabel()` em `lib/constants/education.ts`
2. Atualizar chamada em `app/admin/turmas/page.tsx`
3. Aplicar migration SQL para atualizar nomes existentes no banco
4. Testar criação de nova turma

### Phase 3 — Validação
**Testes:**
1. Dashboard Analytics mostra "1º B" em vez de "1º ano B - Manhã"
2. Tabela de turmas mostra nomes simplificados
3. Dropdown de turmas mostra nomes simplificados
4. Turmas existentes foram atualizadas
5. Nova turma criada tem nome simplificado

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Turno no nome | Remover | Usuário solicitou explicitamente |
| "ano"/"série" no nome | Remover | Usuário solicitou formato "1º B" |
| Migrar banco | Sim | Nomes já salvos precisam ser atualizados |
| Ed. Infantil | Manter como está | "Creche" e "Pré-escola" já são concisos |
| Compatibilidade | Manter param `shift` | Não quebra código existente |

## Rollback

Se necessário reverter:
1. Restaurar `buildClassLabel()` original (backup em git)
2. Rodar migration reversa:
```sql
-- Reverter para formato completo (exemplo simplificado)
UPDATE classes
SET name = (
  SELECT buildClassLabel(education_level, grade, section, shift)
  -- Precisaria implementar via função ou código
)
WHERE deleted_at IS NULL;
```

## Evidence & Follow-up

- [ ] Função `buildClassLabel()` modificada
- [ ] Chamada em `turmas/page.tsx` atualizada
- [ ] Migration aplicada no Supabase
- [ ] Dashboard mostrando nomes simplificados
- [ ] Build passando
