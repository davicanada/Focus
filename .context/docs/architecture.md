---
type: doc
name: architecture
description: High-level architecture, tech stack, and system design patterns
category: architecture
generated: 2026-01-23
status: filled
scaffoldVersion: "2.0.0"
---

# System Architecture

## Architectural Patterns
The application follows a **Monolithic Web Application** architecture using the **modern Next.js (App Router)** framework. It unifies the frontend and backend into a single repository and deployment unit, leveraging Server-Side Rendering (SSR) and Static Site Generation (SSG) for performance and SEO, while using API Routes for backend logic.

### Core Principles
- **Server-First Data Fetching**: Leveraging Next.js Server Components to fetch data secure and fast on the server.
- **Client-Side Interactivity**: Using React Client Components (`"use client"`) only where user interaction is required (forms, dashboards).
- **Backend-as-a-Service (BaaS)**: Heavily relies on **Supabase** for:
  - **Database**: PostgreSQL with Relational patterns.
  - **Authentication**: Managed auth flow.
  - **Authorization**: Row Level Security (RLS) policies enforced at the database level.
  - **Storage**: (If used) for user avatars/documents.

## Key Components

### Frontend Layer
- **Framework**: Next.js 14+ (App Router).
- **UI Architecture**:
  - **Atomic Design-ish**:
    - **UI**: Low-level generic components in `components/ui` (Buttons, Inputs, Badges).
    - **Layouts**: `components/layout` (DashboardLayout, etc.).
    - **Domain**: Feature-specific components in `app/admin`, `app/professor`.
- **Styling**: Tailwind CSS for utility-first styling.
- **State Management**: React Context (`AuthContext`) and local state. SWR or React Query might be used for client-side fetching (inferred).

### Backend Layer
- **API Routes**: Located in `app/api/*`.
- **Controllers**: Logic for specific actions like `setup`, `approve-user`, `access-request`.
- **Service Clients**: `lib/supabase/server.ts` creates specialized Supabase clients for server contexts (cookies handling).

### Database Layer
- **PostgreSQL**: Managed by Supabase.
- **Schema**: Tables for `profiles` (users), `classes`, `students`, `occurrences`, `trimesters`.
- **Security**: RLS Policies ensure users only see data relevant to their role (Admin vs Professor).

## Cross-Cutting Concerns
- **Authentication**: JWT-based session management handled by Supabase Auth helpers.
- **Security**:
  - **RLS**: The primary defense mechanism.
  - **Middleware**: Next.js middleware (if present) to protect routes.
- **Logging/Monitoring**: Standard Vercel/Next.js logging.

## Tech Stack
- **Frontend**: React, Next.js, Tailwind CSS, Lucide React (Icons).
- **Backend**: Next.js API Routes (Node.js/Edge Runtime).
- **Database**: Supabase (PostgreSQL).
- **Language**: TypeScript throughout.
