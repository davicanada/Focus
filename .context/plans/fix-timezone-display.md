---
status: ready
generated: 2026-01-28
agents:
  - type: "bug-fixer"
    role: "Corrigir funcoes de formatacao para usar timezone correto"
phases:
  - id: "phase-1"
    name: "Analise Completa"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Corrigir Exibicao de Horario (Timezone)

> Corrigir todas as funcoes de formatacao de data/hora para usar timezone America/Sao_Paulo

## Task Snapshot
- **Primary goal:** Corrigir a exibicao de horarios que aparecem 2-3 horas atrasados
- **Success signal:** Ocorrencias registradas as 10h aparecem como 10h em todos os locais do app
- **Key references:**
  - Correcao do AI Analytics: `lib/ai/shared.ts` linhas 283-316
  - Funcoes com bug: `lib/utils.ts`

## Analise Completa do Problema

### Causa Raiz

As funcoes em `lib/utils.ts` usam `toLocaleString('pt-BR')` e `toLocaleDateString('pt-BR')` **sem especificar timezone**. Isso faz com que o horario seja interpretado no timezone do servidor/sistema, que pode ser UTC.

### Locais COM o Problema (precisam de correcao)

#### 1. `lib/utils.ts` - Funcoes Centralizadas (PRIORIDADE ALTA)

| Funcao | Linha | Problema |
|--------|-------|----------|
| `formatDate()` | 28-35 | `toLocaleDateString` sem timezone |
| `formatDateTime()` | 38-47 | `toLocaleString` sem timezone |

**Impacto:** Todas as paginas que usam essas funcoes serao corrigidas automaticamente.

#### 2. Paginas que usam `formatDateTime()` (corrigidas automaticamente)

| Arquivo | Linha | Uso |
|---------|-------|-----|
| `app/professor/page.tsx` | 232 | Ultimas ocorrencias na home |
| `app/professor/ocorrencias/page.tsx` | 328, 387 | Lista e modal de detalhes |
| `app/master/page.tsx` | 662, 931 | Solicitacoes e logs do sistema |
| `components/admin/alerts/AlertNotifications.tsx` | 186 | Data do alerta |

#### 3. Paginas que usam `formatDate()` (corrigidas automaticamente)

| Arquivo | Uso |
|---------|-----|
| `app/admin/professores/page.tsx` | Data de solicitacao e cadastro |
| `app/admin/page.tsx` | Data de ocorrencias recentes |
| `app/admin/trimestres/page.tsx` | Datas dos periodos |
| `app/admin/anos-letivos/page.tsx` | Import (mas nao usa) |
| `app/admin/relatorios/periodo/page.tsx` | Datas no relatorio |
| `app/admin/relatorios/aluno/page.tsx` | Datas no relatorio |
| `app/viewer/relatorios/periodo/page.tsx` | Datas no relatorio |
| `app/viewer/relatorios/aluno/page.tsx` | Datas no relatorio |
| `app/master/page.tsx` | Data de criacao de instituicao |
| `components/admin/alerts/AlertRules.tsx` | Ultimo disparo |

### Locais JA CORRETOS (nao precisam de alteracao)

| Arquivo | Linha | Motivo |
|---------|-------|--------|
| `lib/ai/shared.ts` | 299-306 | Ja usa `timeZone: 'America/Sao_Paulo'` |
| `lib/email/sendVerificationEmail.ts` | 550 | Ja usa `timeZone: 'America/Sao_Paulo'` |

### Locais que NAO sao afetados (apenas data, sem hora)

Usos de `getFullYear()`, `getMonth()`, `getDate()` para comparacoes ou formatacao de ano/mes/dia apenas nao sao afetados pelo problema de timezone de HORA. Exemplos:
- `app/admin/turmas/page.tsx` - Ano da turma
- `app/admin/anos-letivos/page.tsx` - Ano letivo
- `components/analytics/AnalyticsDashboard.tsx` - Filtro de ano

### Locais com formatacao direta (baixo risco)

| Arquivo | Linha | Uso | Risco |
|---------|-------|-----|-------|
| `app/professor/ocorrencias/page.tsx` | 172 | `.split('T')[0]` para input de edicao | Baixo - apenas data |
| `app/viewer/relatorios/aluno/page.tsx` | 246, 376 | Nome do arquivo de download | Baixo - apenas data |
| `app/admin/relatorios/aluno/page.tsx` | 246, 376 | Nome do arquivo de download | Baixo - apenas data |

## Implementacao

### Alteracoes em `lib/utils.ts`

```typescript
// ANTES - formatDate (linha 28-35)
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = parseLocalDate(date);
  return d.toLocaleDateString('pt-BR', options || {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// DEPOIS - formatDate
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = parseLocalDate(date);
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...(options || {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  });
}
```

```typescript
// ANTES - formatDateTime (linha 38-47)
export function formatDateTime(date: string | Date): string {
  const d = parseLocalDate(date);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// DEPOIS - formatDateTime
export function formatDateTime(date: string | Date): string {
  const d = parseLocalDate(date);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

## Resumo

| Categoria | Quantidade | Acao |
|-----------|------------|------|
| Funcoes a corrigir em `lib/utils.ts` | 2 | Adicionar timezone |
| Paginas corrigidas automaticamente | 14+ | Nenhuma (usam as funcoes) |
| Locais ja corretos | 2 | Nenhuma |
| Locais de baixo risco | 4 | Monitorar |

**Total de linhas a alterar:** ~4 linhas em 1 arquivo

## Validacao

### Checklist de Teste
- [ ] Build passa sem erros
- [ ] Registrar ocorrencia as 10:00
- [ ] Verificar home do professor - deve mostrar 10:00
- [ ] Verificar lista de ocorrencias do professor - deve mostrar 10:00
- [ ] Verificar modal de detalhes - deve mostrar 10:00
- [ ] Verificar painel master (logs) - horario correto
- [ ] Verificar alertas (notifications) - horario correto
- [ ] Verificar relatorios em PDF/Excel - data correta

## Rollback
- Reverter commit de `lib/utils.ts`
- Tempo: < 5 minutos
- Impacto em dados: Nenhum
