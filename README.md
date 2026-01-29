# Focus - School Management System

A multi-tenant school management platform for Brazilian educational institutions, featuring disciplinary occurrence tracking, AI-powered analytics, configurable alerts, and role-based dashboards.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Charts:** Apache ECharts (echarts-for-react)
- **Export:** ExcelJS + jsPDF
- **Email:** Nodemailer (Gmail SMTP)
- **AI:** Gemini 3 Flash (primary) + Groq Llama-3.3-70b (fallback)
- **Testing:** Playwright (E2E)

## Features

- **Multi-tenant architecture** with Row Level Security (RLS)
- **Role-based access:** Master, Admin, Professor, Viewer
- **Student & class management** with Excel import/export
- **Occurrence tracking** with date, time, type, and severity
- **Interactive analytics dashboard** with cross-filtering (Power BI-style)
- **AI Chat** — ask questions about your data in Portuguese, powered by Gemini/Groq
- **Configurable alert rules** with threshold-based notifications
- **Academic year management** with rollover support
- **Email notifications** for access requests, approvals, and welcome messages
- **Mobile responsive** design with bottom navigation
- **Soft delete** across all entities, preserving referential integrity
- **Period-based reports** exportable to PDF and Excel

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- Gmail account with [App Password](https://support.google.com/accounts/answer/185833) (for email)
- [Gemini API key](https://aistudio.google.com/) (for AI analytics)

### Installation

```bash
git clone https://github.com/davicanada/Focus.git
cd Focus
npm install
```

### Environment Setup

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | PostgreSQL connection string |
| `GMAIL_USER` | Gmail address for SMTP |
| `GMAIL_APP_PASS` | Gmail app password |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GROQ_API_KEY` | Groq API key (fallback) |

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing

```bash
npx playwright test
```

## Project Structure

```
app/
├── admin/          # Admin dashboard, students, classes, reports, analytics
├── master/         # Super admin panel (institutions, users, logs)
├── professor/      # Teacher dashboard, register & edit occurrences
├── viewer/         # Read-only dashboard and analytics
├── api/            # API routes (REST endpoints)
└── settings/       # User settings
components/
├── ui/             # Base components (Button, Input, Modal, Table, etc.)
├── layout/         # DashboardLayout, Sidebar, TopBar, BottomNav
├── analytics/      # Charts, AI Chat
└── admin/alerts/   # Alert system
lib/
├── ai/             # Gemini + Groq providers with automatic fallback
├── supabase/       # Client (browser) and Server (service role) clients
├── email/          # Nodemailer templates (welcome, notifications)
├── constants/      # Brazilian education levels, periods
├── alerts/         # Alert rule evaluation engine
└── utils.ts        # Helpers, chart colors
types/              # TypeScript type definitions
e2e/                # Playwright E2E tests
```

## Roles

| Role | Access |
|------|--------|
| **Master** | Full system access, manage institutions and all users |
| **Admin** | Manage institution: students, classes, teachers, reports, alerts |
| **Professor** | Register and edit own occurrences, view analytics |
| **Viewer** | Read-only access to dashboards and reports |

## License

This project is proprietary. All rights reserved.
