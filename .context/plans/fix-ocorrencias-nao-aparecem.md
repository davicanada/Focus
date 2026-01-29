---
status: completed
generated: 2026-01-26
resolved: 2026-01-26
priority: critical
---

# Corrigir Ocorrencias Nao Aparecendo no App

> Diagnosticar e corrigir problema onde ocorrencias existem no banco mas nao aparecem no app

## Status: RESOLVIDO

## Problema Reportado

O usuario reportou que havia ocorrencias registradas no banco de dados, mas nenhuma estava aparecendo no aplicativo - nem para administradores, nem para professores.

## Diagnostico

### 1. Verificacao do Banco de Dados

```
Total de ocorrencias no banco: 77
Coluna deleted_at em occurrences: NAO EXISTIA
```

### 2. Causa Raiz Identificada

O codigo foi atualizado para implementar soft delete em ocorrencias, adicionando filtros `.is('deleted_at', null)` em todas as queries que buscam ocorrencias. Porem, a migration que adiciona a coluna `deleted_at` na tabela `occurrences` **NAO foi executada** no banco de dados.

**Arquivos afetados com filtro de deleted_at:**
- `app/api/dashboard/stats/route.ts` - 6 queries
- `app/admin/dashboard/page.tsx` - 5 queries
- `app/professor/ocorrencias/page.tsx` - 2 queries
- `app/professor/page.tsx` - 1 query
- `app/professor/registrar/page.tsx` - 1 query
- `app/admin/relatorios/aluno/page.tsx` - 2 queries
- `app/master/page.tsx` - 1 query

### 3. Comportamento do Supabase

Quando uma query usa `.is('deleted_at', null)` em uma coluna que **nao existe**, o Supabase retorna **zero resultados** em vez de erro. Isso causou o "desaparecimento" silencioso de todas as ocorrencias.

## Solucao Aplicada

Executada a migration `supabase-migration-governanca-dados.sql` que:

1. **Adicionou colunas em occurrences:**
   - `deleted_at TIMESTAMPTZ` - para soft delete
   - `deleted_by UUID` - referencia ao usuario que deletou

2. **Criou indices de performance:**
   - `idx_occurrences_active` - para queries de ocorrencias ativas
   - `idx_occurrences_student_active` - para queries por aluno

3. **Adicionou soft delete em alert_rules:**
   - `deleted_at TIMESTAMPTZ`

4. **Correcoes de integridade:**
   - Preencheu `class_id_at_occurrence` em ocorrencias antigas
   - Criou anos letivos para turmas orfas
   - Desativou alert_rules com escopos invalidos

## Resultado

```
ESTADO DEPOIS DA MIGRATION:
   Colunas em occurrences: deleted_at, deleted_by
   Ocorrencias ativas (deleted_at IS NULL): 77
   Turmas sem ano letivo: 0
   Ocorrencias sem turma historica: 0
```

**Todas as 77 ocorrencias agora aparecem corretamente no app.**

## Licoes Aprendidas

1. **Sincronizacao codigo/banco**: Sempre executar migrations antes de fazer deploy de codigo que depende de novas colunas.

2. **Falha silenciosa do Supabase**: Queries com `.is('coluna_inexistente', null)` retornam zero resultados sem erro. Considerar adicionar validacao de schema.

3. **Checklist de deploy**:
   - [ ] Migration SQL executada no banco
   - [ ] Codigo atualizado no servidor
   - [ ] Testar queries principais apos deploy

## Arquivos Relacionados

- Migration: `supabase-migration-governanca-dados.sql`
- Plano de governanca: `.context/plans/governanca-dados-completa.md`
