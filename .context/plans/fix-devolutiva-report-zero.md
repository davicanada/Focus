---
status: completed
generated: 2026-02-04
agents:
  - type: "bug-fixer"
    role: "Fix devolutiva report showing 0 when there are 2"
phases:
  - id: "phase-1"
    name: "Diagnóstico"
    prevc: "P"
  - id: "phase-2"
    name: "Correção"
    prevc: "E"
---

# Correção do Relatório de Devolutivas Mostrando 0

## Dados no Banco de Dados
- 2 ocorrências com devolutivas (feedbacks):
  - `c8089d0c-...` - status: resolved, 4 feedbacks
  - `cc22e148-...` - status: in_progress, 4 feedbacks
- Ambas da instituição "Colegio Estadual Professor Carlos Drummond de Andrade"
- Ano: 2026 (occurrence_date: 2026-12-18)
- Total de 8 registros em occurrence_feedbacks

## Diagnóstico
A página de relatórios mostra 0 devolutivas. Possíveis causas:
1. Query principal de ocorrências também limitada a 1000 linhas
2. Feedbacks não sendo retornados corretamente
3. Filtro de instituição não funcionando

## Fluxo a Verificar
1. API GET /api/reports/devolutiva?year=2026
2. Query de ocorrências com joins
3. Query de feedbacks com serviceClient
4. Agrupamento e contagem

## Problemas Encontrados

### 1. Limite de 1000 linhas do Supabase
A query de ocorrências retornava apenas 1000 das 1675 ocorrências. As 2 ocorrências com feedbacks estavam nas 675 não retornadas.

### 2. Query `.in()` com muitos IDs causava "Bad Request"
A query `serviceClient.from('occurrence_feedbacks').in('occurrence_id', occurrenceIds)` com 1000+ IDs causava erro "Bad Request".

## Solução Implementada

Reescrita completa da API com nova abordagem:

1. **Queries de count separadas** para contagens de status (evita limite de 1000)
2. **Buscar TODOS os feedbacks primeiro** (sem filtro de occurrence_id)
3. **Agrupar feedbacks por occurrence_id** em memória
4. **Buscar apenas ocorrências que têm feedbacks** (lista pequena)

## Arquivo Modificado
`app/api/reports/devolutiva/route.ts` - Reescrita completa

## Resultados do Teste
```
API Status: 200
Total occurrences: 1675
With feedback: 2
by_status: {"pending":1673,"in_progress":1,"resolved":1}
Occurrences with feedback_count > 0: 2
✅ Devolutiva report API working correctly!
```

## Build e Testes
- ✅ Build passando
- ✅ 17 testes devolutiva-system passando

## Correção Adicional: Tipo de Ação com Labels Legíveis

### Problema
A coluna "Tipo de Ação" mostrava códigos técnicos como `verbal_warning` em vez de labels legíveis como "Advertência Verbal".

### Solução
Criado mapeamento `ACTION_TYPE_LABELS` e função `getActionTypeLabel()` em `app/admin/relatorios/devolutiva/page.tsx`:

```typescript
const ACTION_TYPE_LABELS: Record<string, string> = {
  verbal_warning: 'Advertência Verbal',
  guardian_contact: 'Contato com Responsável',
  coordination_referral: 'Encaminhamento à Coordenação',
  psychologist_referral: 'Encaminhamento ao Psicólogo',
  suspension: 'Suspensão',
  observation: 'Observação',
  resolved: 'Resolvido',
  other: 'Outro',
};
```

### Locais Atualizados
1. Tabela "Por Atualização" - Badge de Tipo de Ação
2. Tabela "Por Ocorrência" - Badge de Tipo de Ação
3. Export Excel "Por Atualização"
4. Export Excel "Por Ocorrência"
5. Export PDF "Por Atualização"
6. Export PDF "Por Ocorrência"

### Status
- ✅ Build passando (04/02/2026)
