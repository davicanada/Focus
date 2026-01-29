---
status: completed
generated: 2026-01-28
implemented: 2026-01-28
---

# Corrigir Exibicao de Nomes nos Logs do Master

> Os logs estao mostrando UUIDs e IDs em vez de nomes de alunos e tipos de ocorrencia. Corrigir para exibir nomes legiveis.

## Problema

No painel Master, aba "Logs", ao visualizar detalhes de uma ocorrencia, os campos `student_id` e `occurrence_type_id` mostravam UUIDs em vez de nomes legiveis:
- Exemplo: `2116cc29-2299-4c54-be12-26c4f86c4cf1` em vez de `Tatiana Correia Mendes`
- Exemplo: `5` em vez de `Atraso`

## Causa Raiz

A funcao `loadLogs()` em `app/master/page.tsx` usava `createClient()` para buscar students e occurrence_types, mas o Supabase RLS (Row Level Security) bloqueava o acesso do master a essas tabelas pois as politicas RLS nao incluem masters diretamente.

```typescript
// ANTES - RLS bloqueava o acesso
const [logsResult, studentsResult, typesResult] = await Promise.all([
  supabase.from('system_logs').select(...),
  supabase.from('students').select('id, full_name'),      // BLOQUEADO pelo RLS
  supabase.from('occurrence_types').select('id, category'), // BLOQUEADO pelo RLS
]);
```

## Solucao Implementada

### 1. Nova API `/api/master/lookups`

Criada API server-side que usa `createServiceClient()` para bypassa RLS:

**Arquivo:** `app/api/master/lookups/route.ts`

```typescript
export async function GET() {
  // 1. Verifica autenticacao
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 401;

  // 2. Verifica se e master
  const { data: userData } = await supabase
    .from('users')
    .select('is_master')
    .eq('id', user.id)
    .single();
  if (!userData?.is_master) return 403;

  // 3. Usa serviceClient para bypassa RLS
  const serviceClient = createServiceClient();
  const [studentsResult, typesResult] = await Promise.all([
    serviceClient.from('students').select('id, full_name'),
    serviceClient.from('occurrence_types').select('id, category'),
  ]);

  return { students, occurrenceTypes };
}
```

### 2. Atualizacao da funcao `loadLogs()`

**Arquivo:** `app/master/page.tsx`

```typescript
// DEPOIS - Usa API para bypassa RLS
const [logsResult, lookupsResponse] = await Promise.all([
  supabase.from('system_logs').select(...),
  fetch('/api/master/lookups'),  // API com serviceClient
]);

const lookupsData = await lookupsResponse.json();
// Build lookup maps from API response
```

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `app/api/master/lookups/route.ts` | NOVO - API para buscar lookups sem RLS |
| `app/master/page.tsx` | Modificado `loadLogs()` para usar API |

## Seguranca

- API verifica autenticacao (401 se nao logado)
- API verifica `is_master` (403 se nao for master)
- Usa `createServiceClient()` apenas no backend

## Teste Manual

1. Fazer login como master (davialmeida1996@gmail.com)
2. Ir para aba "Logs"
3. Clicar no botao "Ver detalhes" (icone Eye) em um log de ocorrencia
4. Verificar que os campos mostram nomes em vez de UUIDs

## Notas

- Testes E2E com Playwright tem problemas de autenticacao neste projeto
- Recomendado teste manual para validar a correcao
