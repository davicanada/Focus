# Correcao definitiva das ultimas 10 ocorrencias - admin e viewer

> Gerado em: 29/01/2026
> Escala: SMALL

## Problema
A secao "Ultimas 10 Ocorrencias" no dashboard do admin e viewer nao mostra novas ocorrencias.
Cada vez que uma ocorrencia e registrada, ela nao aparece na lista ate reiniciar o servidor.
Para o professor, a mesma funcionalidade funciona perfeitamente.

## Diagnostico

### Por que o professor funciona?
O professor busca dados **diretamente no browser** via Supabase client:
```typescript
// app/professor/page.tsx (linha 66-110)
const supabase = createClient(); // browser client
const recentRes = await supabase
  .from('occurrences')
  .select('*, student:students(full_name), ...')
  .eq('institution_id', institutionId)
  .eq('registered_by', userId)
  .is('deleted_at', null)
  .order('occurrence_date', { ascending: false })
  .limit(10);
```
- Cada chamada vai direto ao Supabase REST API
- Sem intermediarios, sem cache
- Dados sempre frescos

### Por que o admin/viewer NAO funciona?
O admin e viewer buscam via **API route do Next.js**:
```typescript
// app/admin/page.tsx (linha 79)
const response = await fetch('/api/dashboard/stats?institution_id=...', { cache: 'no-store' });

// app/api/dashboard/stats/route.ts
const supabase = createServiceClient(); // server-side
```
Problemas:
1. **Next.js module cache**: O `createServiceClient()` retorna um client que pode ser cacheado pelo runtime do Next.js entre requests
2. **Supabase internal cache**: O `@supabase/supabase-js` pode manter estado interno do client singleton
3. **Camada extra desnecessaria**: A API route existe apenas para bypassar RLS, mas o browser client do admin/viewer ja tem sessao autenticada com RLS correto

### Evidencia numerica
| Fonte | Count | 1a ocorrencia |
|-------|-------|---------------|
| PostgreSQL direto | 85 | 28/01 16:00 UTC |
| createClient browser (service key) | 85 | 28/01 16:00 UTC |
| API /api/dashboard/stats | 84 | 28/01 15:50 UTC |

A API sempre esta 1 ocorrencia atras.

## Solucao: Mover query para client-side

Fazer o admin e viewer buscarem as ocorrencias recentes **diretamente no browser** usando `createClient()` do `lib/supabase/client.ts`, exatamente como o professor faz.

### Abordagem
O admin e viewer ja tem sessao autenticada. A RLS policy "Users can read institution occurrences" permite leitura para qualquer usuario vinculado a instituicao. Entao NAO precisam de service client para ler ocorrencias — o browser client com anon key + sessao e suficiente.

### Arquivos a modificar

#### 1. `app/admin/page.tsx`
- Remover fetch para `/api/dashboard/stats` para ocorrencias recentes
- Adicionar query direta via `createClient()` (browser) para as 10 ultimas ocorrencias
- Manter o fetch para stats (contadores) ou migrar tudo

#### 2. `app/viewer/page.tsx`
- Mesma alteracao do admin

### Modelo (copiar do professor)
```typescript
// Query direta no browser - sempre dados frescos
const supabase = createClient();
const { data: recentData } = await supabase
  .from('occurrences')
  .select(`
    *,
    student:students(full_name, class_id),
    occurrence_type:occurrence_types(category, severity),
    registered_by_user:users!occurrences_registered_by_fkey(full_name),
    class_at_occurrence:classes!occurrences_class_id_at_occurrence_fkey(name)
  `)
  .eq('institution_id', institutionId)
  .is('deleted_at', null)
  .order('occurrence_date', { ascending: false })
  .order('created_at', { ascending: false })
  .limit(10);

setRecentOccurrences(recentData || []);
```

Diferenca vs professor: **sem** `.eq('registered_by', userId)` — admin/viewer veem TODAS as ocorrencias.

### API `/api/dashboard/stats`
- Manter para os stats (contadores: alunos, turmas, professores, total ocorrencias)
- Remover `recentOccurrences` do retorno (nao e mais necessario)
- Ou: manter por retrocompatibilidade mas nao usar no frontend

## Checklist
- [ ] Admin: query direta para ocorrencias recentes via browser client
- [ ] Viewer: query direta para ocorrencias recentes via browser client
- [ ] Remover `recentOccurrences` da API (ou manter sem uso)
- [ ] Build passando
- [ ] Playwright: verificar que a ocorrencia mais recente aparece primeiro
- [ ] Teste manual: criar ocorrencia e verificar que aparece imediatamente
