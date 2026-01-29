---
status: completed
generated: 2026-01-25
agents:
  - type: "backend-specialist"
    role: "Implement API changes for sorting"
  - type: "test-writer"
    role: "Verify sorting logic"
docs:
  - "app/api/dashboard/stats/route.ts"
phases:
  - id: "phase-1"
    name: "Analysis & Planning"
    description: "Analyze current sorting logic and determine the best field for 'recent' (occurrence_date vs created_at)."
    prevc: "P"
  - id: "phase-2"
    name: "Implementation"
    description: "Update the API route to use the corrected sorting field."
    prevc: "E"
  - id: "phase-3"
    name: "Verification"
    description: "Verify the dashboard displays occurrences in the expected order."
    prevc: "V"
---

# Plan: Sort Recent Occurrences in Admin Dashboard

## Goal
Ensure the "Recent Occurrences" section in the Admin Dashboard displays the most relevant recent items first. Currently, it uses `created_at`, but `occurrence_date` is more semantically relevant for school management, or verify if `created_at` is preferred. We will standardize on `occurrence_date` as the primary sort key for "Recent Occurrences" to reflect when events actually happened.

## Implementation Steps

### Phase 1: Analysis
- Current state: `app/api/dashboard/stats/route.ts` sorts by `created_at` descending.
- Desired state: Sort by `occurrence_date` descending.

### Phase 2: Implementation
#### [MODIFY] [app/api/dashboard/stats/route.ts](file:///c:/Users/davia/OneDrive/Área de Trabalho/Hashtag Data Analyst/Projetos/Focus/app/api/dashboard/stats/route.ts)
- Change `.order('created_at', { ascending: false })` to `.order('occurrence_date', { ascending: false })`.
- Ensure `occurrence_date` is indexed if performance issues arise (optional for now).

### Phase 3: Verification
- Create dummy occurrences with different `occurrence_date` and `created_at` values.
- Verify that the dashboard list follows the `occurrence_date`.

## Success Criteria
- The list of recent occurrences on the Admin Dashboard is sorted by the date the occurrence happened, closest to global 'now' first.
