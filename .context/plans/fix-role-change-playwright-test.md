# Plano: Corrigir Mudança de Role com Testes Playwright

## Status: CONCLUÍDO ✅

## Problema Encontrado

O teste Playwright identificou a **causa raiz** do erro 500:

```
Error updating role: {
  code: '23514',
  message: 'new row for relation "user_institutions" violates check constraint "user_institutions_role_check"'
}
```

### Causa Raiz

A tabela `user_institutions` tinha um CHECK constraint que só permitia os valores `admin` e `professor`:

```sql
CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'professor'::character varying])::text[])))
```

O valor `admin_viewer` **não estava incluído** na constraint, causando erro ao tentar atualizar.

## Solução Aplicada (27/01/2026)

Migration executada no Supabase Dashboard:

```sql
-- 1. Remover constraint antiga
ALTER TABLE user_institutions DROP CONSTRAINT IF EXISTS user_institutions_role_check;

-- 2. Adicionar nova constraint com admin_viewer
ALTER TABLE user_institutions
ADD CONSTRAINT user_institutions_role_check
CHECK (role IN ('admin', 'professor', 'admin_viewer'));
```

## Resultado do Teste Playwright

```
[ROLE API] 200 {"success":true,"message":"Função alterada de professor para admin_viewer"...}
Modal still open: false
Visualizador badge count: 1
SUCCESS: Role was changed to Visualizador!
1 passed (25.6s)
```

## Arquivos Criados/Modificados

- [x] `e2e/role-change.spec.ts` - Teste E2E que identificou o problema
- [x] `app/api/users/[id]/role/route.ts` - API de mudança de role (debug logs removidos)
- [x] `supabase-migration-add-admin-viewer-role.sql` - SQL da migration

## Funcionalidade Validada

1. ✅ Login como admin
2. ✅ Abrir modal de alteração de função
3. ✅ Mudar função de professor para visualizador
4. ✅ Verificar que a mudança foi aplicada (badge atualizado)
5. ✅ Role resetada de volta para professor após teste
