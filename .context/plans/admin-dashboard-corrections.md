# Admin Dashboard Corrections

## 1. Goal Description

Restructure the Admin Dashboard to improve navigation and usability by consolidating alert-related screens and fixing interaction issues.

### Objectives
- **Consolidate Navigation**: Move "Regras de Alerta" to be a sub-view (Tab) of "Alertas".
- **Fix Interaction**: Ensure the "Alertar imediatamente" checkbox is directly clickable.

## 2. Phases

### Phase 1: Component Extraction and Setup
- **Agent**: frontend-specialist
- **Steps**:
  1.  Create `components/admin/alerts` directory.
  2.  Extract `AlertNotifications` logic from `app/admin/alertas/page.tsx`.
  3.  Extract `AlertRules` logic from `app/admin/regras-alerta/page.tsx`.
  4.  Verify pure code extraction without logic changes initially.

### Phase 2: Implementation of Tabs and Sidebar Update
- **Agent**: frontend-specialist
- **Steps**:
  1.  Modify `app/admin/alertas/page.tsx` to implement a Tab interface (Alertas | Regras).
  2.  Integrate the extracted components.
  3.  Remove `app/admin/regras-alerta` route.
  4.  Update `components/layout/Sidebar.tsx` to remove the redundant link.

### Phase 3: Bug Fix - Checkbox
- **Agent**: bug-fixer
- **Steps**:
  1.  Analyze `components/ui/checkbox.tsx`.
  2.  Implement fix to ensure the input element covers the visual area or the visual element properly delegates clicks.
  3.  Verify clickability in the new `AlertRules` component.

## 3. Agent Assignments

- **frontend-specialist**: Responsible for creating the new components and restructuring the page layout.
- **bug-fixer**: Responsible for fixing the Checkbox component.

## 4. Documentation Touchpoints

- **project-overview.md**: Update navigation structure description if present.
- **task.md**: Track progress.

## 5. Success Criteria

- "Alertas" page shows two tabs.
- "Regras de Alerta" is no longer in the sidebar.
- "Alertar imediatamente" checkbox can be toggled by clicking the square box itself.
