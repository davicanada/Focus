---
status: completed
generated: 2026-01-25
agents:
  - type: "bug-fixer"
    role: "Corrigir a query que não filtra instituições excluídas"
phases:
  - id: "phase-1"
    name: "Análise do Problema"
    prevc: "P"
    status: completed
  - id: "phase-2"
    name: "Implementação da Correção"
    prevc: "E"
    status: pending
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
    status: pending
---

# Correção: Instituições excluídas aparecendo na página Master

> Investigar e corrigir o problema onde instituições que foram excluídas ainda aparecem na aba de instituições da página Master

## Task Snapshot

- **Primary goal:** Garantir que apenas instituições ativas apareçam na listagem do painel Master
- **Success signal:** Apenas 1 instituição (ativa) aparece na aba "Instituições"
- **Arquivos afetados:** `app/master/page.tsx`

## Análise do Problema

### Causa Raiz Identificada

O problema está na função `loadInstitutions()` em `app/master/page.tsx` (linhas 161-178).

**Código atual (com bug):**
```javascript
const loadInstitutions = async () => {
  setLoadingInstitutions(true);
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false });  // ❌ SEM FILTRO!

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

### Problema

A query não filtra por:
- `is_active = true` (soft delete via flag)
- `deleted_at IS NULL` (soft delete via timestamp)

O sistema usa soft delete conforme documentado no CLAUDE.md:
> "Soft delete com `deleted_at` e `is_active`"

### Observação sobre o Hard Delete

A função `handleDeleteInstitution()` (linhas 337-365) faz DELETE real:
```javascript
const { error } = await supabase
  .from('institutions')
  .delete()
  .eq('id', institutionToDelete.id);
```

Isso significa que instituições excluídas pelo botão "Excluir" são removidas permanentemente.
Se ainda aparecem instituições inativas, pode ser porque:
1. Foram desativadas via outro mecanismo (set `is_active = false`)
2. Têm `deleted_at` preenchido por outro processo
3. O DELETE está sendo bloqueado por RLS

## Solução Proposta

### Opção A: Filtrar por `is_active` (Recomendada)
```javascript
const { data, error } = await supabase
  .from('institutions')
  .select('*')
  .eq('is_active', true)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

### Opção B: Adicionar aba separada para "Lixeira"
Similar ao que já existe na página de turmas (`admin/turmas/page.tsx`), podemos mostrar:
- Aba principal: Instituições ativas
- Aba secundária: Instituições na lixeira (para possível restauração)

## Working Phases

### Phase 1 — Análise do Problema ✅ COMPLETA
- [x] Leitura do código `app/master/page.tsx`
- [x] Identificação da query sem filtro (linha 165-167)
- [x] Verificação do padrão de soft delete no projeto
- [x] Documentação da causa raiz

### Phase 2 — Implementação
**Tarefas:**
1. Adicionar filtro `.eq('is_active', true)` na query
2. Adicionar filtro `.is('deleted_at', null)` na query
3. Atualizar contador na CardDescription para mostrar apenas ativos

### Phase 3 — Validação
**Testes:**
1. Verificar que apenas instituições ativas aparecem
2. Verificar que o contador está correto
3. Verificar que a exclusão continua funcionando

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Tipo de filtro | `is_active` + `deleted_at` | Consistência com o padrão do projeto |
| Lixeira | Não implementar agora | Scope mínimo, pode ser adicionado depois |

## Evidence & Follow-up

- [ ] Correção aplicada em `app/master/page.tsx`
- [ ] Teste manual confirmando apenas 1 instituição exibida
- [ ] Build passando
