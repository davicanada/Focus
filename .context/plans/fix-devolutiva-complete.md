---
status: completed
generated: 2026-02-04
agents:
  - type: "bug-fixer"
    role: "Fix devolutiva counting and checkbox visibility"
  - type: "feature-developer"
    role: "Implement CRUD for action types and pagination"
  - type: "test-writer"
    role: "Create Playwright E2E tests"
phases:
  - id: "phase-1"
    name: "Bug Fixes"
    prevc: "E"
  - id: "phase-2"
    name: "New Features"
    prevc: "E"
  - id: "phase-3"
    name: "Testing"
    prevc: "V"
---

# Correção Completa do Sistema de Devolutivas Plan

> Corrigir: CRUD tipos de ação, checkbox resolvida, contagem de devolutivas, paginação, logs completos nos relatórios

## Task Snapshot
- **Primary goal:** Sistema de devolutivas funcionando 100% com todas as features solicitadas
- **Success signal:**
  - Checkbox de "resolvida" visível e funcional
  - Contagem correta de devolutivas no relatório
  - Admin pode criar/editar/remover tipos de ação
  - Paginação de 100 itens funcionando
  - PDF/Excel com histórico completo de devolutivas
  - Testes Playwright passando

## Codebase Context
- **Tabela `occurrence_feedbacks`**: Armazena devolutivas registradas
- **Tabela `occurrences`**: Tem coluna `status` (pending/in_progress/resolved)
- **Constantes hardcoded**: `lib/constants/feedback.ts` com 12 tipos de ação
- **RLS**: Pode estar bloqueando leitura de feedbacks no relatório
- **Componentes**: `AddFeedbackModal.tsx`, `OccurrenceDetailModal.tsx`

## Issues to Fix

### 1. Checkbox "Marcar como Resolvida" não visível
**Análise**: O componente `Checkbox` usa `text-primary-foreground` para o ícone Check. Se `primary-foreground` estiver definido como branco e o fundo também for claro, o checkbox fica invisível.
**Solução**: Garantir contraste adequado com borda visível e indicador colorido.

### 2. Contagem de devolutivas incorreta (mostra 0)
**Análise**: A API `/api/reports/devolutiva` usa `createClient()` que respeita RLS. A tabela `occurrence_feedbacks` pode ter RLS restritiva.
**Solução**: Usar `createServiceClient()` para bypassar RLS na query de feedbacks.

### 3. CRUD de tipos de ação para admin
**Análise**: Tipos atualmente hardcoded em `lib/constants/feedback.ts`.
**Solução**:
- Criar tabela `feedback_action_types` no banco
- APIs CRUD: `/api/feedback-action-types`
- UI na página de configurações do admin

### 4. Paginação de 100 itens
**Análise**: Página carrega TODAS as ocorrências de uma vez.
**Solução**: Adicionar paginação no frontend e backend com limit/offset.

### 5. Logs completos nos relatórios PDF/Excel
**Análise**: Relatórios não incluem histórico de devolutivas.
**Solução**: Buscar feedbacks de cada ocorrência e incluir na exportação.

## Documentation Touchpoints
| Guide | File | Primary Inputs |
| --- | --- | --- |
| Project Overview | [project-overview.md](../docs/project-overview.md) | Roadmap, README, stakeholder notes |
| Architecture Notes | [architecture.md](../docs/architecture.md) | ADRs, service boundaries, dependency graphs |
| Development Workflow | [development-workflow.md](../docs/development-workflow.md) | Branching rules, CI config, contributing guide |
| Testing Strategy | [testing-strategy.md](../docs/testing-strategy.md) | Test configs, CI gates, known flaky suites |
| Glossary & Domain Concepts | [glossary.md](../docs/glossary.md) | Business terminology, user personas, domain rules |
| Security & Compliance Notes | [security.md](../docs/security.md) | Auth model, secrets management, compliance requirements |
| Tooling & Productivity Guide | [tooling.md](../docs/tooling.md) | CLI scripts, IDE configs, automation workflows |

## Risk Assessment
Identify potential blockers, dependencies, and mitigation strategies before beginning work.

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy | Owner |
| --- | --- | --- | --- | --- |
| TODO: Dependency on external team | Medium | High | Early coordination meeting, clear requirements | TODO: Name |
| TODO: Insufficient test coverage | Low | Medium | Allocate time for test writing in Phase 2 | TODO: Name |

### Dependencies
- **Internal:** TODO: List dependencies on other teams, services, or infrastructure
- **External:** TODO: List dependencies on third-party services, vendors, or partners
- **Technical:** TODO: List technical prerequisites or required upgrades

### Assumptions
- TODO: Document key assumptions being made (e.g., "Assume current API schema remains stable")
- TODO: Note what happens if assumptions prove false

## Resource Estimation

### Time Allocation
| Phase | Estimated Effort | Calendar Time | Team Size |
| --- | --- | --- | --- |
| Phase 1 - Discovery | TODO: e.g., 2 person-days | 3-5 days | 1-2 people |
| Phase 2 - Implementation | TODO: e.g., 5 person-days | 1-2 weeks | 2-3 people |
| Phase 3 - Validation | TODO: e.g., 2 person-days | 3-5 days | 1-2 people |
| **Total** | **TODO: total** | **TODO: total** | **-** |

### Required Skills
- TODO: List required expertise (e.g., "React experience", "Database optimization", "Infrastructure knowledge")
- TODO: Identify skill gaps and training needs

### Resource Availability
- **Available:** TODO: List team members and their availability
- **Blocked:** TODO: Note any team members with conflicting priorities
- **Escalation:** TODO: Name of person to contact if resources are insufficient

## Working Phases

### Phase 1 — Bug Fixes (CONCLUÍDO)
**Correções Realizadas:**
1. **Checkbox visibilidade**: Aumentado tamanho (4x4 → 5x5), borda mais grossa (border-2), cor explícita (border-gray-400, bg-white)
2. **Contagem de devolutivas**: Alterado para usar `createServiceClient()` que bypassa RLS
3. **Histórico completo**: API agora retorna array `feedbacks` com detalhes de cada devolutiva

**Arquivos Modificados:**
- `components/ui/checkbox.tsx` - Estilo do checkbox
- `app/api/reports/devolutiva/route.ts` - ServiceClient + feedbacks detalhados

### Phase 2 — New Features (CONCLUÍDO)
**Features Implementadas:**
1. **Paginação 100 itens**: Adicionado aos pages admin e viewer de ocorrências
2. **CRUD tipos de ação**: Tabela `feedback_action_types`, APIs, UI em Configurações
3. **Relatórios com histórico**: Excel com 3 abas, PDF com 2 páginas
4. **Botão "Gerenciar Ações"**: Na aba de ocorrências com CRUD completo de tipos de ação
5. **Relatórios reformulados**:
   - "Por Atualização": devolutivas ordenadas por data (mais recente primeiro)
   - "Por Ocorrência": devolutivas agrupadas por ocorrência
   - Ambos disponíveis em PDF e Excel
6. **Paginação nos relatórios**: Máximo 100 itens por página
7. **KPIs removidos**: Removidos cards de "Total de Ocorrências", "Com Devolutiva", "Sem Devolutiva", "Taxa de Resposta"
8. **Colunas reformuladas**: Removido "Devol." e "Última Devolutiva", adicionado "Tipo de Ação", "Comentários" e "Usuário"

**Arquivos Criados:**
- `app/api/setup/migrate-feedback-action-types/route.ts` - Migration
- `app/api/feedback-action-types/route.ts` - GET/POST
- `app/api/feedback-action-types/[id]/route.ts` - GET/PUT/DELETE

**Arquivos Modificados:**
- `app/admin/ocorrencias/page.tsx` - Paginação + Botão "Gerenciar Ações" + Modal CRUD
- `app/viewer/ocorrencias/page.tsx` - Paginação
- `app/admin/configuracoes/page.tsx` - UI CRUD tipos de ação
- `app/admin/relatorios/devolutiva/page.tsx` - Completamente reformulado:
  - Dois tipos de relatório (Por Atualização / Por Ocorrência)
  - Paginação (100 itens)
  - KPIs removidos
  - Novas colunas: Tipo de Ação, Comentários, Usuário
  - Excel e PDF para ambos os tipos
- `components/occurrences/AddFeedbackModal.tsx` - Carrega tipos do banco

### Phase 3 — Testing (CONCLUÍDO)
**Testes Atualizados:**
- `e2e/devolutiva-system.spec.ts` - 34 testes passando (17 chromium + 17 mobile) cobrindo:
  - API de relatório de devolutiva
  - API de feedbacks
  - API de tipos de ação
  - Estrutura de dados
  - Contagem de devolutivas
  - Paginação
  - Checkbox

**Build Status:** ✅ Passando (04/02/2026)

## Rollback Plan
Document how to revert changes if issues arise during or after implementation.

### Rollback Triggers
When to initiate rollback:
- Critical bugs affecting core functionality
- Performance degradation beyond acceptable thresholds
- Data integrity issues detected
- Security vulnerabilities introduced
- User-facing errors exceeding alert thresholds

### Rollback Procedures
#### Phase 1 Rollback
- Action: Discard discovery branch, restore previous documentation state
- Data Impact: None (no production changes)
- Estimated Time: < 1 hour

#### Phase 2 Rollback
- Action: TODO: Revert commits, restore database to pre-migration snapshot
- Data Impact: TODO: Describe any data loss or consistency concerns
- Estimated Time: TODO: e.g., 2-4 hours

#### Phase 3 Rollback
- Action: TODO: Full deployment rollback, restore previous version
- Data Impact: TODO: Document data synchronization requirements
- Estimated Time: TODO: e.g., 1-2 hours

### Post-Rollback Actions
1. Document reason for rollback in incident report
2. Notify stakeholders of rollback and impact
3. Schedule post-mortem to analyze failure
4. Update plan with lessons learned before retry

## Evidence & Follow-up

List artifacts to collect (logs, PR links, test runs, design notes). Record follow-up actions or owners.
