# Ordenação de Turmas por Nível de Ensino e Melhorias em Relatórios

## 4 Mudanças Solicitadas

### 1. Gráfico "Ocorrências por Turma" no Analytics — Ordenar por nível
**Arquivo:** `components/analytics/AnalyticsDashboard.tsx` (linhas ~430-434)

**Antes:** `.sort((a, b) => a.name.localeCompare(b.name))` — ordem alfabética

**Depois:** Ordenar por nível de ensino (infantil → fund_i → fund_ii → medio), e dentro do mesmo nível, ordenar alfabeticamente.

**Problema:** O `classData` só tem `{ name, count }`. Precisa incluir `education_level` no dado para poder ordenar.

**Solução:**
- No processamento dos dados de turma (linhas ~417-434), além do `name`, guardar também o `education_level` de cada turma
- Criar mapa de prioridade: `{ infantil: 0, fundamental_i: 1, fundamental_ii: 2, medio: 3 }`
- Ordenar primeiro por prioridade do nível, depois por nome

**Formato de exibição no gráfico:** Manter apenas o nome curto (ex: "8º A") pois o eixo X do gráfico não comporta nomes longos.

### 2. Nomes das turmas nos Relatórios (PDF e Excel) — Exibir nível + turno
**Arquivos:**
- `app/admin/relatorios/aluno/page.tsx` — Ficha Individual
- `app/admin/relatorios/periodo/page.tsx` — Relatório por Período

**Antes:** `Turma: 8º A`

**Depois:** `Turma: 8º A - Ensino Fundamental II - Matutino`

**Onde aplicar:**
- **Ficha Individual PDF** (aluno/page.tsx ~linha 280): box de info do aluno, campo "Turma"
- **Ficha Individual Excel** (aluno/page.tsx ~linha 190): campo "Turma" no header
- **Relatório Período PDF** (periodo/page.tsx ~linha 360): header de cada turma `Turma: {nome}`
- **Relatório Período Excel** (periodo/page.tsx ~linha 240): header de cada turma

**Dados necessários:** Os dados de `education_level` e `shift` já estão disponíveis via join `student.class` nos dois relatórios. Criar função utilitária:

```typescript
function formatClassFullName(name: string, educationLevel: string, shift: string): string {
  const levelLabels: Record<string, string> = {
    infantil: 'Educação Infantil',
    fundamental_i: 'Ensino Fundamental I',
    fundamental_ii: 'Ensino Fundamental II',
    medio: 'Ensino Médio',
  };
  const shiftLabels: Record<string, string> = {
    matutino: 'Matutino',
    vespertino: 'Vespertino',
    noturno: 'Noturno',
    integral: 'Integral',
  };
  return `${name} - ${levelLabels[educationLevel] || educationLevel} - ${shiftLabels[shift] || shift}`;
}
```

Colocar em `lib/utils.ts` para reutilização.

### 3. Select de Turma no Relatório por Aluno — Exibir nível + turno e ordenar por nível
**Arquivo:** `app/admin/relatorios/aluno/page.tsx` (linhas ~435-445)

**Antes:**
```html
<option value={c.id}>{c.name}</option>
```
Ordenado por `.order('name')` (alfabético)

**Depois:**
```html
<option value={c.id}>{c.name} - Ensino Fundamental II - Matutino</option>
```
Ordenado por nível de ensino (infantil primeiro, médio por último), depois por nome.

**Solução:**
- Após carregar `classes`, ordenar no frontend usando o mapa de prioridade de nível
- No `<option>`, usar `formatClassFullName(c.name, c.education_level, c.shift)`

### 4. Remover coluna "Registrado por" do PDF da Ficha Individual
**Arquivo:** `app/admin/relatorios/aluno/page.tsx`

**Antes (PDF, ~linha 320):**
```
head: [['Data', 'Tipo', 'Severidade', 'Descrição', 'Registrado por']]
columnStyles: { 0: 22, 1: 28, 2: 20, 3: 70, 4: 35 }
```

**Depois (PDF):**
```
head: [['Data', 'Tipo', 'Severidade', 'Descrição']]
columnStyles: { 0: 22, 1: 30, 2: 22, 3: auto }
```

- Remover `'Registrado por'` do head
- Remover `occ.registered_by_user?.full_name` do body
- Ajustar columnStyles: Descrição fica com `cellWidth: 'auto'` (mais espaço)
- **Excel permanece com "Registrado por"** (apenas o PDF muda)

**Justificativa:** Padronizar com o Relatório por Período que já não inclui essa coluna no PDF.

## Função Utilitária de Ordenação

Criar em `lib/utils.ts`:

```typescript
const EDUCATION_LEVEL_ORDER: Record<string, number> = {
  infantil: 0,
  fundamental_i: 1,
  fundamental_ii: 2,
  medio: 3,
};

export function getEducationLevelOrder(level: string): number {
  return EDUCATION_LEVEL_ORDER[level] ?? 99;
}

export function sortClassesByLevel<T extends { education_level?: string; name: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const levelDiff = getEducationLevelOrder(a.education_level || '') - getEducationLevelOrder(b.education_level || '');
    if (levelDiff !== 0) return levelDiff;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
```

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `lib/utils.ts` | + `formatClassFullName()`, `sortClassesByLevel()`, `getEducationLevelOrder()` |
| `components/analytics/AnalyticsDashboard.tsx` | Ordenar gráfico de turmas por nível |
| `app/admin/relatorios/aluno/page.tsx` | Select com nível+turno, ordenado por nível; PDF sem "Registrado por" |
| `app/admin/relatorios/periodo/page.tsx` | Headers de turma com nível+turno, ordenado por nível |
