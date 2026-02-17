# Expandir Turmas para Todos os Níveis/Turnos e Remover Opção "Outro"

## Objetivo
1. Remover a opção "Outro" (custom) do select de nível de ensino na criação de turmas
2. Criar novas turmas na Drummond cobrindo **todos os 4 níveis** e **todos os 4 turnos**
3. Criar alunos para essas turmas e gerar ocorrências para o ano inteiro de 2026

## Fase 1 — Remover opção "custom" do frontend

### Arquivos a modificar:

**`lib/constants/education.ts`**
- Remover `'custom'` do type `EducationStage`
- Remover o objeto `custom` de `EDUCATION_LEVELS`
- Remover `|| stage === 'custom'` da função `canHaveSection`
- Remover o bloco `if (stage === 'custom')` de `buildClassLabel`

**`types/index.ts`**
- Remover `'custom'` do type `EducationLevel` (linha 9)
- Remover `custom: { label: 'Outro', allowClassSection: true }` (linha 419)

**`lib/utils.ts`**
- Remover `custom: '#6b7280'` do CHART_COLORS.educationLevel (linha 207)

**`components/analytics/AnalyticsDashboard.tsx`**
- Remover `custom: 'Outro'` do educationLevelLabels (linha 63)
- Remover `'Outro': 'custom'` do educationLevelKeysFromLabels (linha 71)
- Remover fallback `|| 'custom'` (linha 447)
- Remover `custom` da cor do chart (linha 824)

**`lib/ai/shared.ts`**
- Remover `'custom'` da lista de education_level no schema da AI (linha 70)

**Nota:** Turmas custom existentes no banco continuam funcionando (apenas não se pode criar novas).

## Fase 2 — Criar novas turmas no banco

### Turmas a criar na Drummond (institution_id: `a5469bc2-dee5-461c-8e3a-f98cf8c386af`)

**Turmas existentes (6):**
- 8º A (fund_ii, matutino), 8º B (fund_ii, vespertino)
- 9º A (fund_ii, matutino)
- 1º B (fund_i, matutino)
- 1ª A (medio, matutino), 1ª B (medio, vespertino)

**Novas turmas a criar (10):**

| Nome | Nível | Turno | Alunos |
|------|-------|-------|--------|
| Creche A | infantil | integral | 15 |
| Pré-escola A | infantil | matutino | 18 |
| 3º A | fundamental_i | matutino | 20 |
| 5º A | fundamental_i | vespertino | 22 |
| 6º A | fundamental_ii | vespertino | 20 |
| 7º A | fundamental_ii | noturno | 18 |
| 2ª A | medio | matutino | 25 |
| 2ª B | medio | vespertino | 22 |
| 3ª A | medio | noturno | 20 |
| 3ª B | medio | integral | 18 |

**Resultado:** 16 turmas cobrindo:
- Infantil: 2 turmas (integral, matutino)
- Fundamental I: 3 turmas (matutino x2, vespertino)
- Fundamental II: 5 turmas (matutino x2, vespertino x2, noturno)
- Médio: 6 turmas (matutino x2, vespertino x2, noturno, integral)
- Turnos: matutino(7), vespertino(5), noturno(2), integral(2)

## Fase 3 — Criar alunos para as novas turmas

~198 novos alunos com nomes brasileiros realistas, via INSERT SQL.

## Fase 4 — Gerar ocorrências para as novas turmas

Mesma lógica do seed anterior (fev-dez 2026), mas para as 10 novas turmas.
Distribuição proporcional ao tamanho da turma e nível:
- Infantil: menos ocorrências (tipos mais leves)
- Fundamental I: poucas ocorrências
- Fundamental II: volume médio
- Médio: mais ocorrências

~500 ocorrências adicionais distribuídas no ano.

## Fase 5 — Validar

- Verificar contagens por nível de ensino
- Verificar contagens por turno
- Verificar gráficos no Analytics Dashboard
- Build passando
