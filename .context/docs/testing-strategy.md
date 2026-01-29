---
type: doc
name: testing-strategy
description: Testing layers, tools, and coverage expectations
category: quality
generated: 2026-01-23
status: filled
scaffoldVersion: "2.0.0"
---

# Testing Strategy

## Overview
We aim for a practical testing pyramid focused on reliability and critical paths.

## Layers

### 1. Static Analysis (Strict)
- **Tools**: TypeScript, ESLint.
- **Goal**: Catch type errors and simple bugs at compile time.
- **Rule**: No `any` types. All props interface defined.

### 2. Unit Testing (Recommended)
- **Scope**: Utility functions in `lib/`, complex logic in hooks.
- **Tools**: Jest or Vitest (to be implemented).
- **Files**: `*.test.ts` alongside source files.

### 3. Integration/Component Testing
- **Scope**: Reusable UI components (`components/ui`), Forms.
- **Tools**: React Testing Library.
- **Goal**: Ensure components render and handle events (clicks, inputs) correctly.

### 4. End-to-End (E2E)
- **Scope**: Critical user flows (Login, Create Occurrence, Register Student).
- **Tools**: Playwright or Cypress.
- **Goal**: Verify the app works as a whole against a staging Supabase instance.

## Test Data
- **Seeding**: Use `app/api/setup/seed` or SQL scripts (`supabase-dummy-data.sql`) to populate a local development database with realistic test data. Do not test against production data.

## Continuous Integration
- Lint and Type Check should run on every PR.
- Unit tests (if present) should block merging if failed.
