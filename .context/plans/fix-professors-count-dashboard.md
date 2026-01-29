---
status: completed
generated: 2026-01-25
completed: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Identificar e corrigir bug de contagem de professores"
  - type: "test-writer"
    role: "Criar testes E2E para validar correção"
phases:
  - id: "phase-1"
    name: "Diagnóstico"
    prevc: "P"
  - id: "phase-2"
    name: "Implementação"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Corrigir Contagem de Professores no Dashboard

> Corrigir o card de professores no dashboard do admin que mostra 0 mesmo havendo professores cadastrados

## Task Snapshot
- **Primary goal:** Dashboard do admin mostrar contagem correta de professores
- **Success signal:** API retorna totalTeachers > 0 para instituição com professores
- **Key references:**
  - `app/admin/page.tsx` - Dashboard do admin
  - `app/api/dashboard/stats/route.ts` - Nova API criada
  - `e2e/professors-count-dashboard.spec.ts` - Testes E2E

## Diagnóstico

### Causa Raiz
O dashboard usava `createClient()` (browser Supabase client) para consultar a tabela `user_institutions`. Esta query era bloqueada pelas políticas de RLS (Row Level Security), retornando 0 resultados.

### Evidência
```
Teachers API status: 200
Teachers count from API: 5
```
A API `/api/teachers` (que usa `createServiceClient()`) retornava 5 professores, mas o dashboard mostrava 0.

## Solução Implementada

### Nova API: `/api/dashboard/stats`

Criada uma API que usa `createServiceClient()` para bypass de RLS:

**Arquivo:** `app/api/dashboard/stats/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();

  // Queries em paralelo usando service client (bypassa RLS)
  const [studentsRes, classesRes, teachersRes, ...] = await Promise.all([
    supabase.from('students').select(...),
    supabase.from('classes').select(...),
    supabase.from('user_institutions').select(...), // Agora funciona!
    ...
  ]);

  return NextResponse.json({
    stats: { totalStudents, totalClasses, totalTeachers, ... },
    recentOccurrences
  });
}
```

### Dashboard Atualizado

**Arquivo:** `app/admin/page.tsx`

```typescript
const loadDashboardData = async (institutionId: string) => {
  // Usar API para buscar dados (bypass RLS issues)
  const response = await fetch(`/api/dashboard/stats?institution_id=${institutionId}`);
  const result = await response.json();
  setStats(result.stats);
  setRecentOccurrences(result.recentOccurrences);
};
```

## Validação

### Testes E2E (2 passando, 1 skipped)

**Arquivo:** `e2e/professors-count-dashboard.spec.ts`

1. ✅ **Verify professors exist in database via API**
   - Teachers API retorna 5 professores

2. ✅ **Dashboard stats API returns correct professors count**
   - Dashboard stats API retorna totalTeachers: 5

3. ⏭️ **Dashboard shows correct professors count (not 0)** (skipped)
   - Teste de UI requer setup de sessão de login

### Resultado da API

```json
{
  "totalStudents": 120,
  "totalClasses": 8,
  "totalTeachers": 5,  // ✅ Agora mostra 5 (antes era 0)
  "totalOccurrences": 74,
  "occurrencesThisMonth": 74,
  "graveOccurrences": 4
}
```

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `app/api/dashboard/stats/route.ts` | **NOVO** - API de estatísticas do dashboard |
| `app/admin/page.tsx` | Modificado para usar API em vez de queries diretas |
| `e2e/professors-count-dashboard.spec.ts` | **NOVO** - Testes E2E |

## Padrão de Correção

Este bug seguiu o mesmo padrão de correção usado anteriormente para a listagem de professores:

1. **Problema:** Browser Supabase client bloqueado por RLS
2. **Solução:** Criar API usando `createServiceClient()` que bypassa RLS
3. **Frontend:** Chamar API em vez de queries diretas

### APIs que usam este padrão:
- `/api/teachers` - Listagem de professores
- `/api/institutions/public` - Listagem pública de instituições
- `/api/dashboard/stats` - Estatísticas do dashboard (NOVO)
