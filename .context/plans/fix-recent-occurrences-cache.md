# Corrigir ordenacao das ultimas 10 ocorrencias no dashboard admin/viewer

> Gerado em: 28/01/2026
> Atualizado: 29/01/2026
> Escala: SMALL

## Problema
A secao "Ultimas 10 Ocorrencias" no dashboard admin e viewer nao mostra a ocorrencia mais recente (28/01).

## Causa Raiz (CONFIRMADA)

**`createServerClient` do `@supabase/ssr` NAO bypassa RLS**, mesmo com a service role key.

Evidencia:
- Banco (pg direto): **83** ocorrencias ativas
- `createClient` do `@supabase/supabase-js` (service key): **83** ocorrencias
- `createServerClient` do `@supabase/ssr` (service key): **79** ocorrencias (4 filtradas por RLS)

A API `GET /api/dashboard/stats` usa `createServiceClient()` de `lib/supabase/server.ts`, que internamente usa `createServerClient` do SSR — este respeita RLS.

A policy RLS "Users can read institution occurrences" verifica `user_institutions` para `auth.uid()`. Como o service client SSR nao tem sessao/cookies, `auth.uid()` retorna null e a policy filtra algumas ocorrencias.

## Correcao

### Arquivo: `lib/supabase/server.ts`

Alterar `createServiceClient()` para usar `createClient` do `@supabase/supabase-js` em vez de `createServerClient` do `@supabase/ssr`:

```typescript
import { createClient as createAdminClient } from '@supabase/supabase-js';

export function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

Isso garante que TODAS as APIs que usam `createServiceClient()` realmente bypassam RLS.

## Impacto
Todas as APIs que dependem de `createServiceClient()` serao corrigidas de uma vez:
- `/api/dashboard/stats` (este bug)
- `/api/teachers`, `/api/occurrences`, etc.
- `/api/alert-rules`, `/api/school-years`, etc.

## Checklist
- [ ] Alterar `createServiceClient` em `lib/supabase/server.ts`
- [ ] Manter `createClient` SSR intacto (para operacoes com sessao)
- [ ] Build passando
- [ ] Teste Playwright: verificar que a ocorrencia mais recente aparece primeiro
