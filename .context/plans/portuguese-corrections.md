# Portuguese Accent Correction Plan

## 1. Goal Description
Standardize Portuguese accentuation across the application frontend. Currently, many UI elements use unaccented text (e.g., "Configuracoes"), likely due to initial rapid development or encoding concerns. The goal is to ensure professional, grammatically correct Portuguese.

### Objectives
- Audit frontend components for unaccented terms.
- Update text strings in TSX/UI components to use proper UTF-8 Portuguese characters.
- Verify no encoding breaks occur.

## 2. Phases

### Phase 1: Global Navigation
- **Agent**: frontend-specialist
- **Target**: `Sidebar.tsx`, `TopBar.tsx`, `BottomNav.tsx`.
- **Action**: Fix menu items ("Configurações", "Relatórios", "Ocorrências").

### Phase 2: Feature Pages Correction
- **Agent**: frontend-specialist
- **Target**:
    - `AlertRules.tsx` & `AlertNotifications.tsx` (recently modified, needs polish).
    - `admin/configuracoes/page.tsx`
    - `admin/relatorios/page.tsx`
    - `admin/turmas` and `admin/alunos` (checking for "Frequência", "Matrícula").
- **Action**: Fix labels, headers, buttons, and toast messages.

### Phase 3: Domain Data Labels
- **Agent**: frontend-specialist
- **Target**: `types/index.ts` or constants files if they define display labels for Enums (like Subject names).
- **Action**: Ensure mapped display values are accented.

## 3. Agent Assignments
- **frontend-specialist**: Execute all text replacements.

## 4. Documentation Touchpoints
- None specific, purely UI polish.

## 5. Success Criteria
- User navigation shows "Configurações", "Relatórios".
- Forms show "Descrição", "Obrigatório", "Não".
- Feedback messages show "Você", "Será".
