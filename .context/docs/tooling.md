---
type: doc
name: tooling
description: Configuration for IDEs, linters, and build tools
category: workflow
generated: 2026-01-23
status: filled
scaffoldVersion: "2.0.0"
---

# Tooling & Ecosystem

## Core Tools
- **Runtime**: Node.js (Latest LTS).
- **Package Manager**: npm.
- **Framework**: Next.js (App Router).

## Editor Configuration (VS Code)
Recommended extensions:
- **ESLint**: For real-time linting.
- **Prettier**: For code formatting.
- **Tailwind CSS IntelliSense**: For class autocompletion.
- **PostCSS Language Support**: For syntax highlighting.

## Code Quality
- **ESLint**: Configured via `.eslintrc.json`. Enforces Next.js core web vitals and standard React rules.
- **TypeScript**: Strict mode enabled in `tsconfig.json`.

## Database Management
- **Supabase CLI**:
  - Used for generating types: `supabase gen types typescript --project-id ... > types/supabase.ts`
  - Managing migrations.

## UI Development
- **Tailwind CSS**: Configured in `tailwind.config.ts`.
- **Lucide React**: Icon set.
- **Radix UI** (Implied): Accessible primitives for UI components.
