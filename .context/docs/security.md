---
type: doc
name: security
description: Security protocols, RLS policies, and sensitive data handling
category: security
generated: 2026-01-23
status: filled
scaffoldVersion: "2.0.0"
---

# Security Policy

## Authentication
- **Provider**: Supabase Auth.
- **Mechanism**: JWT tokens passed via cookies (for SSR) and Authorization headers (for API).
- **MFA**: Not currently enforced but supported by Supabase.

## Authorization
We use **Role-Based Access Control (RBAC)** implemented primarily via **PostgreSQL Row Level Security (RLS)**.

### Roles
- **admin**: Full access to all tables.
- **professor**: Write access to their own classes/occurrences. Read access to their students.
- **master**: Super-admin privileges.

### RLS Policies
All tables MUST have RLS enabled.
- **Select**: Users can only select rows permissible by their role.
- **Insert/Update**: Strict checks on `auth.uid()` to ensure authorship or admin overrides.
- **Example**: A professor can only view students in classes they teach.

## Sensitive Data
- **Student Data**: Names, addresses, and academic records are sensitive.
- **Protection**:
  - Never expose full student lists to unauthenticated users.
  - API routes must always validate the session before returning data.

## API Security
- **Validation**: All API routes validating input using Zod schemas.
- **Rate Limiting**: Handled by Vercel/Supabase infrastructure defaults.
- **CORS**: Configured in Next.js config (if applicable).
