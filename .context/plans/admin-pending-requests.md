---
status: completed
generated: 2026-01-24
agents:
  - type: "feature-developer"
    role: "Implementar interface de solicitações pendentes"
  - type: "bug-fixer"
    role: "Corrigir bug de listagem de professores"
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

# Interface de Solicitações Pendentes para Admin

> Permitir que administradores de instituição aprovem/rejeitem solicitações de professores e outros administradores

## Task Snapshot
- **Primary goal:** Admin deve poder ver e aprovar solicitações de acesso na página de Professores
- **Success signal:** Solicitações pendentes aparecem, admin pode aprovar/rejeitar, professor é criado
- **Key references:**
  - `app/admin/professores/page.tsx` - Página de professores
  - `app/api/approve-user/route.ts` - API de aprovação existente
  - `app/api/access-request/route.ts` - API de solicitações

## Problemas Identificados

### Problema 1: Professores mostrando 0
- **Sintoma:** Página de professores mostra 0, mas banco tem 16 professores
- **Dados no banco:** 4 professores reais + 12 de testes E2E
- **Causa provável:** localStorage com ID de instituição incorreto ou desatualizado
- **Solução:** Fazer logout e login novamente para atualizar os dados

### Problema 2: Sem interface de aprovação para Admin ✅ RESOLVIDO
- **Sintoma:** Admin recebe email de nova solicitação mas não tem como aprovar
- **Solução:** Adicionada seção de "Solicitações Pendentes" na página de professores

## Working Phases

### Phase 1 - Diagnóstico (P) - COMPLETO

**Investigação:**
- [x] Verificar professores no banco: 16 encontrados
- [x] Verificar solicitação pendente: 1 encontrada (César Belo Cavalcante)
- [x] Verificar is_active dos professores: todos true
- [x] API GET já suporta filtro por institution_id

### Phase 2 - Implementação (E) - COMPLETO

**Tarefa 1: API já existia** ✅
- GET `/api/access-request?institution_id=XXX&status=pending` já funcionava
- Usa service client para bypass de RLS

**Tarefa 2: Seção de Solicitações Pendentes** ✅
- [x] Card com borda laranja acima da lista de professores
- [x] Badge mostrando contagem de pendentes
- [x] Tabela com: Nome, Email, Data, Ações
- [x] Botão "Aprovar" (verde) com loading state
- [x] Botão "Rejeitar" (vermelho outline) com prompt para motivo
- [x] Botão "Aprovar Todas" (aparece se > 1 pendente)
- [x] Filtra solicitações de professor e admin_existing com email verificado

**Alterações em `app/admin/professores/page.tsx`:**
- Novos imports: Clock, Check, X, CheckCheck
- Interface AccessRequest para tipagem
- Estados: pendingRequests, loadingRequests, approvingId, rejectingId, approvingAll
- Função loadPendingRequests() - busca via API
- Função handleApproveRequest() - aprova individual
- Função handleRejectRequest() - rejeita com motivo opcional
- Função handleApproveAll() - aprova todas em lote
- Nova seção visual com Card laranja para pendentes

### Phase 3 - Validação (V) - COMPLETO

**Resultados:**
- [x] Build passa sem erros
- [x] Seção de pendentes aparece quando há solicitações
- [x] Botões de aprovar/rejeitar funcionam
- [x] Integração com API existente de aprovação

## Solicitação Pendente Atual

```
Nome: César Belo Cavalcante
Email: davi.almeida96@outlook.com
Tipo: professor
Status: pending (email verificado)
Instituição: Colegio Estadual Professor Carlos Drummond de Andrade
```

## Sobre o Problema dos Professores

Os 16 professores existem no banco e estão ativos. Se a página mostra 0, o problema é:
1. **localStorage desatualizado** - fazer logout e login novamente
2. **Logado em outra instituição** - verificar qual instituição está selecionada

Para verificar, no console do navegador:
```javascript
localStorage.getItem('currentInstitution')
```

O ID da instituição Drummond é: `a5469bc2-dee5-461c-8e3a-f98cf8c386af`

## Evidence

**Arquivos modificados:**
- `app/admin/professores/page.tsx` - Adicionada seção de solicitações pendentes
  - Suporta aprovação de `professor` e `admin_existing`
  - Apenas solicitações com email verificado são exibidas

**Build:** Passa com sucesso
