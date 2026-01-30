---
status: ready
generated: 2026-01-30
---

# Filtro de Turno para Professor ao Registrar Ocorrencias

## Objetivo
Reduzir a quantidade de turmas exibidas ao professor na hora de registrar ocorrencias, filtrando pelo turno selecionado. Escolas grandes podem ter 18+ turmas — com filtro por turno, o professor ve apenas as relevantes.

## Dados do Banco
- Coluna `shift` na tabela `classes` (varchar) — ja existe
- Turnos disponiveis: matutino, vespertino, noturno, integral (`lib/constants/education.ts`)
- Inconsistencia encontrada: valores `matutino` e `Matutino` coexistem — normalizar para lowercase

## Fluxo Proposto

### 1. Tela de Selecao de Turno (pos-login)
- Aparece SOMENTE quando a instituicao tem turmas em **mais de 1 turno**
- Se a instituicao so tem 1 turno, pula direto (selecao automatica)
- Consulta turnos distintos das turmas ativas da instituicao
- UI: Cards com icone de relogio + nome do turno (ex: Matutino, Vespertino)
- Salva no `sessionStorage` como `selectedShift`

### 2. Seletor de Turno no TopBar/Sidebar
- Badge ou select compacto mostrando o turno atual
- Permite trocar de turno sem relogar
- Atualiza `sessionStorage` e recarrega dados filtrados

### 3. Filtro na Pagina de Registro de Ocorrencias
- `loadOptions()` em `app/professor/registrar/page.tsx` (linha 60-74)
- Adicionar `.eq('shift', selectedShift)` na query de classes (linha 65)
- Se nao ha turno selecionado, mostra todas (fallback)

### 4. Migration: Normalizar turnos no banco
```sql
UPDATE classes SET shift = LOWER(shift) WHERE shift != LOWER(shift);
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `app/professor/registrar/page.tsx` | Filtrar classes por `shift` do sessionStorage |
| `app/professor/page.tsx` | Redirecionar para selecao de turno se necessario |
| `components/layout/TopBar.tsx` | Exibir turno selecionado + seletor para trocar |
| `components/ShiftSelector.tsx` | **NOVO** - Tela/modal de selecao de turno |
| `lib/constants/education.ts` | Ja tem SHIFTS definido, sem mudanca |

## Regras de Negocio
- Selecao de turno e por **sessao**, nao persiste no banco
- Se instituicao tem apenas 1 turno → selecao automatica, sem tela extra
- Se professor troca de turno → limpa selecao de turma no formulario de registro
- Turno "integral" mostra TODAS as turmas (alunos integrais estao em qualquer horario)

## Validacao
1. Login como professor em escola com 2+ turnos → tela de selecao aparece
2. Selecionar "Matutino" → so turmas matutinas no registro de ocorrencias
3. Trocar para "Vespertino" via seletor → turmas atualizam
4. Login em escola com 1 turno → pula selecao, vai direto pro dashboard
5. Turno "integral" → mostra todas as turmas
