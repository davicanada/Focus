# Visualizar e reativar usuarios desativados

> Gerado em: 29/01/2026
> Escala: SMALL

## Problema
Apos desativar um usuario, nao ha como ve-lo novamente nem reativa-lo. A lista de usuarios filtra `deleted_at IS NULL`, entao desativados somem.

## Diagnostico

### API `/api/teachers` (GET)
- Linha 30: `.is('deleted_at', null)` — esconde desativados
- Precisa de parametro para incluir desativados

### Frontend `app/admin/professores/page.tsx`
- Nao tem toggle para mostrar inativos
- Botao Power ja chama deactivate/reactivate, mas nao aparece para inativos (eles nao sao carregados)

### APIs existentes
- `PUT /api/users/[id]/deactivate` — soft delete (users + user_institutions)
- `PUT /api/users/[id]/reactivate` — restaura usuario e vinculos
- Ambas usam service client, verificam auth e permissao de admin

## Solucao

### 1. API `/api/teachers/route.ts` — novo parametro `include_inactive`
Quando `include_inactive=true`, remover o filtro `.is('deleted_at', null)` para retornar todos.

### 2. Frontend `app/admin/professores/page.tsx`
- Novo state `showInactive: boolean` (default false)
- Toggle/botao "Mostrar inativos" no header da lista
- Quando ativo, chamar API com `include_inactive=true`
- Usuarios inativos: linha com opacidade reduzida, badge "Inativo"
- Botao "Reativar" (UserCheck icon) para inativos
- Botao "Desativar" (Power icon) para ativos
- **Sem botao de excluir permanentemente** — preservar dados transacionados

### 3. Protecao contra exclusao permanente
- Nao adicionar botao de exclusao permanente na UI
- Usuarios com ocorrencias registradas (`registered_by`) nunca podem ser excluidos do banco
- Soft delete e suficiente para todas as operacoes

## Checklist
- [ ] API: parametro `include_inactive` no GET `/api/teachers`
- [ ] Frontend: toggle "Mostrar inativos"
- [ ] Frontend: visual diferenciado para inativos (opacidade, badge)
- [ ] Frontend: botao Reativar para inativos
- [ ] Frontend: esconder botoes de acao irrelevantes para cada estado
- [ ] Build passando
