---
status: ready
generated: 2026-01-30
---

# Correção: Coluna "Registrado por" vazia nos relatórios Excel

## Diagnóstico

**Problema:** A coluna "Registrado por" aparece vazia em todos os relatórios Excel (período e aluno), tanto para admin quanto para viewer.

**Causa raiz:** RLS da tabela `users` só permite ler os próprios dados:
- Policy `Users can read own data`: `auth.uid() = id`
- Policy `Masters have full access`: `is_current_user_master() OR auth.uid() = id`

Quando o browser client faz o JOIN `registered_by_user:users!occurrences_registered_by_fkey(full_name)`, o Supabase retorna `null` para qualquer usuário que não seja o próprio logado (RLS bloqueia silenciosamente).

**Por que o PDF "funciona":** O relatório PDF de período NÃO inclui a coluna "Registrado por" (excluída do layout). O de aluno inclui, mas também sofre do mesmo problema — se testado por master, funciona; por admin/viewer, fica vazio.

## Arquivos afetados (4 arquivos)

| Arquivo | Tipo |
|---------|------|
| `app/admin/relatorios/periodo/page.tsx` | Relatório por período (admin) |
| `app/admin/relatorios/aluno/page.tsx` | Relatório por aluno (admin) |
| `app/viewer/relatorios/periodo/page.tsx` | Relatório por período (viewer) |
| `app/viewer/relatorios/aluno/page.tsx` | Relatório por aluno (viewer) |

## Solução

Adicionar uma RLS policy na tabela `users` que permita leitura de usuários da mesma instituição. Usar a função `get_user_institution_ids()` já existente para evitar recursão RLS.

### Nova policy SQL:
```sql
CREATE POLICY "Users can read same institution users"
ON public.users FOR SELECT
USING (
  id IN (
    SELECT ui.user_id FROM user_institutions ui
    WHERE ui.institution_id IN (SELECT get_user_institution_ids())
  )
);
```

### Nenhuma mudança no frontend
O código já está correto (`occ.registered_by_user?.full_name || ''`). O problema é exclusivamente de permissão no banco.

## Validação
1. Logar como admin → Gerar Excel período e aluno → "Registrado por" preenchido
2. Logar como viewer → Mesma verificação
3. Logar como master → Continua funcionando
