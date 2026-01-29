---
status: completed
generated: 2026-01-24
phases:
  - id: "phase-1"
    name: "Criar API Pública de Instituições"
    prevc: "E"
    status: "completed"
  - id: "phase-2"
    name: "Atualizar Modal de Solicitação"
    prevc: "E"
    status: "completed"
  - id: "phase-3"
    name: "Testes E2E Playwright"
    prevc: "V"
    status: "completed"
---

# Correção do Select de Instituições em Solicitações de Acesso

> Criar API pública para listar instituições ativas e corrigir o fluxo de solicitação em instituição existente

## Problema Identificado

### Causa Raiz
O componente `AccessRequestModal.tsx` tenta carregar instituições usando o cliente Supabase do frontend:

```typescript
const supabase = createClient();
const { data, error } = await supabase
  .from('institutions')
  .select('*')
  .eq('is_active', true)
  .order('name');
```

**Problema:** Quando o usuário NÃO está autenticado (que é o caso quando está solicitando acesso), as políticas RLS (Row Level Security) do Supabase bloqueiam a leitura da tabela `institutions`.

### Solução
Criar uma API Route que usa o `serviceClient` (que bypassa RLS) para retornar apenas instituições ativas com campos públicos (sem dados sensíveis).

## Plano de Implementação

### Fase 1: Criar API Pública de Instituições

**Novo Endpoint:** `GET /api/institutions/public`

```typescript
// Retorna apenas campos públicos
interface PublicInstitution {
  id: string;
  name: string;
  city: string;
  state_code: string;
}
```

**Segurança:**
- Usa `createServiceClient()` para bypassa RLS
- Retorna apenas campos necessários (sem endereço completo, coordenadas, etc.)
- Filtra apenas instituições ativas (`is_active = true`)

### Fase 2: Atualizar Modal de Solicitação

Modificar `AccessRequestModal.tsx`:
- Trocar chamada direta ao Supabase por `fetch('/api/institutions/public')`
- Melhorar tratamento de erros
- Adicionar estado de erro quando não consegue carregar instituições

### Fase 3: Testes E2E Playwright

Criar testes em `e2e/institution-select.spec.ts`:
1. Verificar que API pública retorna instituições
2. Testar fluxo de solicitação como professor em instituição existente
3. Testar fluxo de solicitação como admin em instituição existente
4. Verificar que select mostra instituições corretamente
5. Verificar submissão com instituição selecionada

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `app/api/institutions/public/route.ts` | Nova API pública |
| `components/auth/AccessRequestModal.tsx` | Usar nova API |
| `e2e/institution-select.spec.ts` | Novos testes E2E |

## Critérios de Sucesso

1. API `/api/institutions/public` retorna lista de instituições ativas
2. Modal de solicitação exibe instituições no dropdown
3. Usuário consegue selecionar instituição existente
4. Solicitação é criada corretamente com `institution_id`
5. Testes E2E passando
