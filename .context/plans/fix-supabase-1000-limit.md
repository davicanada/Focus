---
status: completed
generated: 2026-02-04
agents:
  - type: "bug-fixer"
    role: "Fix Supabase 1000 row default limit issue"
phases:
  - id: "phase-1"
    name: "Diagnóstico"
    prevc: "P"
  - id: "phase-2"
    name: "Correção"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Correção do Limite de 1000 Linhas do Supabase

> Corrigir: KPI Cards mostram dados incompletos devido ao limite padrão de 1000 linhas do Supabase

## Diagnóstico do Problema

### Causa Raiz Identificada
O Supabase tem um **limite padrão de 1000 linhas** em todas as queries que não especificam um `.limit()` ou `.range()`.

### Evidência
- Banco de dados: 1675 ocorrências para Carlos Drummond (1673 pending + 1 resolved + 1 in_progress)
- Teste Playwright: Retorna apenas 1000 ocorrências (todas pending)
- **Conclusão**: As 2 ocorrências com status diferente estão nas 675 linhas NÃO retornadas

### Código Problemático
`app/admin/ocorrencias/page.tsx` linhas 289-293:
```typescript
const { data: allStatuses } = await supabase
  .from('occurrences')
  .select('status')
  .eq('institution_id', institutionId)
  .is('deleted_at', null);
// SEM .limit() → Supabase retorna apenas 1000 linhas!
```

## Solução Proposta

### Opção 1: Usar RPC para contagem (RECOMENDADA)
Criar uma função SQL que faz `COUNT(*) ... GROUP BY status` diretamente no banco.

### Opção 2: Adicionar limite alto
Adicionar `.limit(10000)` para garantir que todas as ocorrências sejam retornadas.

### Opção 3: Usar count com head: true para cada status
Fazer 3 queries separadas com `count: 'exact', head: true` para cada status.

## Implementação Escolhida: Opção 2 + 3 combinadas

Usar `count: 'exact'` para obter o total real, e queries individuais para cada status com limit alto.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `app/admin/ocorrencias/page.tsx` | Usar queries com count para stats |
| `app/viewer/ocorrencias/page.tsx` | Mesma correção |
| `app/api/reports/devolutiva/route.ts` | Mesma correção |

## Validação
- Teste Playwright deve mostrar: Total ~1675, Pendentes ~1673, Em Andamento 1, Resolvidas 1

## Implementação Concluída (04/02/2026)

### Correções Aplicadas

| Arquivo | Alteração |
|---------|-----------|
| `app/admin/ocorrencias/page.tsx` | Substituído query de fetch por 4 queries de count paralelas com `Promise.all()` |
| `app/viewer/ocorrencias/page.tsx` | Mesma correção |
| `app/api/reports/devolutiva/route.ts` | Adicionado `.limit(10000)` para garantir todas as ocorrências |

### Resultados do Teste Playwright
```
KPI Card values: [ '1675', '1673', '1', '1' ]
Total: 1675
Pendentes: 1673
Em Andamento: 1
Resolvidas: 1
✅ KPI Cards showing correct values!
```

### Build e Testes
- ✅ Build passando
- ✅ 17 testes devolutiva-system passando
- ✅ 2 testes debug-kpi-status passando
