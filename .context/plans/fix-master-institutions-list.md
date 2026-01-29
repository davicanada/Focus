---
status: ready
generated: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Identify root cause and implement fix"
  - type: "security-auditor"
    role: "Ensure fix maintains proper access control"
phases:
  - id: "phase-1"
    name: "Discovery & Alignment"
    prevc: "P"
  - id: "phase-2"
    name: "Implementation & Iteration"
    prevc: "E"
  - id: "phase-3"
    name: "Validation & Handoff"
    prevc: "V"
---

# Corrigir Listagem de Instituicoes no Painel Master Plan

> RLS bloqueia leitura de instituicoes pelo master - criar API route com service client

## Task Snapshot
- **Primary goal:** Corrigir o bug onde a aba "Instituicoes" no Painel Master nao exibe nenhuma instituicao, mesmo existindo dados no banco.
- **Success signal:** Master consegue ver TODAS as instituicoes cadastradas na aba "Instituicoes".
- **Key references:**
  - `app/master/page.tsx` - Pagina do painel master (linha 161-180: `loadInstitutions`)
  - `app/api/institutions/public/route.ts` - Exemplo de API que bypassa RLS
  - `lib/supabase/server.ts` - `createServiceClient()` para bypassa RLS

## Codebase Context

### Analise do Problema

**Codigo atual (`app/master/page.tsx` linha 161-180):**
```typescript
const loadInstitutions = async () => {
  setLoadingInstitutions(true);
  try {
    const supabase = createClient();  // <-- USA CLIENT COM RLS
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    // ...
  }
};
```

**Causa raiz identificada:**
1. `createClient()` cria um Supabase client que respeita RLS (Row Level Security)
2. A politica RLS de `institutions` provavelmente so permite ver instituicoes onde o usuario e membro (via `user_institutions`)
3. O master NAO esta necessariamente em todas as `user_institutions`, entao nao ve nenhuma instituicao

**Evidencia - Padrao correto ja existe no projeto:**
- `app/api/institutions/public/route.ts` usa `createServiceClient()` para bypassa RLS
- Funciona corretamente para usuarios nao autenticados

### Solucao Proposta

Criar uma API route `GET /api/institutions/admin` que:
1. Verifica se o usuario e master (autenticacao obrigatoria)
2. Usa `createServiceClient()` para bypassa RLS
3. Retorna TODAS as instituicoes

## Agent Lineup
| Agent | Role in this plan | First responsibility focus |
| --- | --- | --- |
| Bug Fixer | Implementar a correcao | Criar API route e atualizar master page |
| Security Auditor | Garantir seguranca | Verificar que apenas master acessa a API |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| API exposta para nao-masters | Low | High | Verificar autenticacao + role no backend |
| Performance com muitas instituicoes | Low | Low | Query ja tem filtros e ordering |

### Dependencies
- **Internal:** Nenhuma
- **External:** Nenhuma
- **Technical:** Nenhuma

### Assumptions
- Master deve ver TODAS as instituicoes (ativas e inativas)
- O filtro atual (`is_active=true`, `deleted_at=null`) pode ser ajustado se necessario

## Working Phases

### Phase 1 - Discovery & Alignment (CONCLUIDO)
**Analise Concluida:**
1. Identificada funcao `loadInstitutions` em `app/master/page.tsx:161-180`
2. Identificado uso de `createClient()` que respeita RLS
3. Confirmado padrao existente com `createServiceClient()` em `/api/institutions/public`

**Decisao de Design:**
- Criar nova API route `/api/institutions/admin` (protegida por autenticacao)
- Atualizar `loadInstitutions` para usar fetch em vez de client direto

### Phase 2 - Implementation & Iteration

**Step 2.1: Criar API Route**
Arquivo: `app/api/institutions/admin/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // 1. Verificar autenticacao
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    // 2. Verificar se e master
    const { data: userData } = await supabase
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    if (!userData?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 3. Buscar TODAS as instituicoes (bypassando RLS)
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching institutions:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

**Step 2.2: Atualizar loadInstitutions**
Arquivo: `app/master/page.tsx`

Substituir:
```typescript
const loadInstitutions = async () => {
  setLoadingInstitutions(true);
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setInstitutions(data || []);
  } catch (error) {
    console.error('Error loading institutions:', error);
    toast.error('Erro ao carregar instituições');
  } finally {
    setLoadingInstitutions(false);
  }
};
```

Por:
```typescript
const loadInstitutions = async () => {
  setLoadingInstitutions(true);
  try {
    const response = await fetch('/api/institutions/admin');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao carregar instituições');
    }

    setInstitutions(result.data || []);
  } catch (error) {
    console.error('Error loading institutions:', error);
    toast.error('Erro ao carregar instituições');
  } finally {
    setLoadingInstitutions(false);
  }
};
```

**Arquivos a Criar/Modificar:**
| Arquivo | Acao | Descricao |
| --- | --- | --- |
| `app/api/institutions/admin/route.ts` | Criar | API protegida para listar todas instituicoes |
| `app/master/page.tsx` | Modificar | Usar fetch em vez de client direto |

### Phase 3 - Validation & Handoff

**Step 3.1: Testes Manuais**
- [ ] Logar como master
- [ ] Acessar aba "Instituicoes"
- [ ] Verificar que todas as instituicoes aparecem
- [ ] Verificar que instituicoes inativas tambem aparecem (se desejado)

**Step 3.2: Teste de Seguranca**
- [ ] Tentar acessar `/api/institutions/admin` sem autenticacao (deve retornar 401)
- [ ] Tentar acessar como professor (deve retornar 403)

**Step 3.3: Build**
- [ ] `npm run build` passa sem erros

## Rollback Plan

### Rollback Triggers
- Bug de seguranca (nao-master consegue acessar)
- Erro na API

### Rollback Procedures
#### Phase 2 Rollback
- Action: Reverter codigo para versao anterior (git revert)
- Data Impact: Nenhum - apenas mudanca de codigo
- Observacao: Bug original retorna (lista vazia)

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot da aba Instituicoes funcionando
- [ ] Build passando
