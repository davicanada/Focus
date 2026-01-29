---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-01-23
status: filled
scaffoldVersion: "2.0.0"
---

# Development Workflow

## Development Workflow
The development process focuses on rapid interaction and stability. We follow a standard Next.js workflow with strong emphasis on type safety and component reusability.

## Branching & Releases
- **Branching Model**: Feature Branch Workflow.
  - `main`: Production-ready code.
  - `feature/name-of-feature`: Development branches.
  - `fix/issue-description`: Bug fix branches.
- **Pull Requests**: All changes must go through a PR to `main` (if working in a team environment).
- **Releases**: Continuous Delivery to Vercel/Production upon merge to `main` (typical setup).

## Local Development

### Prerequisites
- **Node.js** (LTS recommended)
- **npm** or **yarn** or **pnpm**
- **Supabase CLI** (optional but recommended for local DB work)

### Commands
```bash
# 1. Install Dependencies
npm install

# 2. Setup Environment
# Copy example env file
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (and service role if needed)

# 3. Run Development Server
npm run dev
# App will be available at http://localhost:3000

# 4. Linting
npm run lint

# 5. Build for Production
npm run build
```

## Code Review Expectations
- **Type Safety**: No `any` types unless absolutely necessary.
- **Component Design**: Components should be small, focused, and reusable.
- **Security Check**: Ensure RLS policies cover any new tables. Ensure API routes validate user permissions.
- **Agent Collaboration**: When using AI agents, mention the agent used in PR description.
- **Styling**: Use standard Tailwind classes. Avoid arbitrary values (`w-[123px]`) if possible.

## Onboarding Tasks
1. **Clone & Install**: Get the repo running locally.
2. **Database Setup**: Connect to a valid Supabase project. Run `supabase-schema.sql` if starting from scratch.
3. **Explore**:
   - Check `app/page.tsx` for the entry point.
   - Check `components/ui` for available building blocks.
   - Create a test user and request access to understand the flow.
