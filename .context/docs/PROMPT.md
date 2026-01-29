# PROMPT: Recreate Focus - Sistema de Gestao Escolar

## MISSION

You are tasked with building **Focus**, a complete school management system from scratch. This is a production-grade application that will be used by real educational institutions in Brazil.

You will work autonomously for extended periods. The user is NOT a developer - they trust you completely to make technical decisions. Only ask questions for critical business decisions that could significantly change the product direction.

---

## ORCHESTRATION STRATEGY

### Agent Architecture

You will orchestrate multiple specialized agents working in parallel and sequence. Use this mental model:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (You)                          │
│  - Maintains project state and progress                        │
│  - Delegates tasks to specialized agents                       │
│  - Reviews outputs and ensures quality                         │
│  - Creates comprehensive progress reports                      │
└─────────────────────────────────────────────────────────────────┘
        │
        ├── [ARCHITECT AGENT]
        │   └── Designs system structure, database schema, API contracts
        │
        ├── [DEVELOPER AGENTS] (can run in parallel)
        │   ├── Frontend Developer - React/Next.js pages
        │   ├── Backend Developer - API routes, database queries
        │   └── Integration Developer - Auth, email, external services
        │
        ├── [REVIEWER AGENT]
        │   └── Code review, security audit, best practices check
        │
        ├── [QA AGENT]
        │   └── Tests functionality, identifies bugs, validates requirements
        │
        └── [DOCUMENTATION AGENT]
            └── Creates inline comments, README, deployment guides
```

### Workflow Pattern

For each major feature, follow this pattern:

```
1. PLAN      → Architect Agent designs the approach
2. IMPLEMENT → Developer Agent(s) write the code
3. REVIEW    → Reviewer Agent checks quality
4. TEST      → QA Agent validates functionality
5. DOCUMENT  → Documentation Agent adds comments
6. REPORT    → You create progress summary
```

---

## PROJECT INITIALIZATION

### Step 1: Create Next.js Project

```bash
npx create-next-app@14 gestao-escolar --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd gestao-escolar
```

### Step 2: Install Dependencies

```bash
# Core
npm install @supabase/supabase-js @supabase/ssr

# Email
npm install resend @react-email/components

# Charts
npm install echarts echarts-for-react

# Export
npm install exceljs jspdf jspdf-autotable

# UI Utilities
npm install react-hot-toast nprogress
npm install -D @types/nprogress

# Optional: Google Maps
npm install @react-google-maps/api
```

### Step 3: Environment Setup

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## DEVELOPMENT PHASES

### PHASE 1: Foundation (Priority: CRITICAL)

**Tasks:**
1. Set up Supabase client configuration (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
2. Create TypeScript interfaces (`types/index.ts`)
3. Implement base layout with navigation progress (`app/layout.tsx`)
4. Create reusable components:
   - `FocusLogo.tsx` - SVG brand logo
   - `NavigationProgress.tsx` - NProgress wrapper
   - `ProgressLink.tsx` - Link with loading state
5. Set up global styles (`app/globals.css`)
6. Create database schema in Supabase (see PRD.md Section 3)

**Validation Checkpoint:**
- [ ] Supabase connection working
- [ ] Types properly defined
- [ ] Layout renders without errors
- [ ] Components are reusable

---

### PHASE 2: Authentication System (Priority: CRITICAL)

**Tasks:**
1. Landing page with login form (`app/page.tsx`)
2. Access request modals (admin_new, admin_existing, professor)
3. API route: Submit access request (`app/api/access-request/route.ts`)
4. API route: Email verification (`app/api/verify-email/route.ts`)
5. Email template (`emails/VerifyEmail.tsx`)
6. Email sending function (`lib/email/sendVerificationEmail.ts`)

**Login Logic:**
```typescript
// Pseudo-code for login flow
async function handleLogin(email, password) {
  // 1. Authenticate with Supabase
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError('Credenciais inválidas');

  // 2. Check if user is active
  const { data: user } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
  if (!user?.is_active) return showError('Conta desativada');

  // 3. Get user's roles from user_institutions
  const { data: links } = await supabase.from('user_institutions').select('*, institutions(*)').eq('user_id', user.id);

  // 4. Determine primary role (master > admin > professor)
  const masterLink = links.find(l => l.role === 'master');
  const adminLink = links.find(l => l.role === 'admin');
  const professorLink = links.find(l => l.role === 'professor');

  const primaryLink = masterLink || adminLink || professorLink;

  // 5. Store in localStorage and redirect
  localStorage.setItem('user', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: primaryLink.role,
    institution_id: primaryLink.institution_id
  }));

  router.push(`/${primaryLink.role}`);
}
```

**Validation Checkpoint:**
- [ ] Login works for all roles
- [ ] Access requests create records
- [ ] Verification emails send and verify
- [ ] Inactive users cannot login

---

### PHASE 3: Master Panel (Priority: HIGH)

**File:** `app/master/page.tsx`

**Tabs:**
1. **Solicitacoes** - Pending access requests
2. **Todos os Usuarios** - All users management
3. **Todas as Instituicoes** - All institutions
4. **Logs do Sistema** - Audit trail

**API Routes:**
- `app/api/approve-user/route.ts`
- `app/api/user/edit/route.ts`
- `app/api/user/toggle-status/route.ts`

**Key Features:**
- Approve/reject requests (only if email verified)
- Edit any user (name, email, reset password)
- Deactivate users (soft delete)
- Delete institutions (cascade delete all related data)
- View system logs

**Cascade Delete Logic:**
```typescript
async function deleteInstitution(institutionId: string) {
  // Order matters due to foreign keys!
  await supabase.from('occurrences').delete().eq('institution_id', institutionId);
  await supabase.from('students').delete().eq('institution_id', institutionId);
  await supabase.from('classes').delete().eq('institution_id', institutionId);
  await supabase.from('occurrence_types').delete().eq('institution_id', institutionId);
  await supabase.from('quarters').delete().eq('institution_id', institutionId);
  await supabase.from('access_requests').delete().eq('institution_id', institutionId);
  await supabase.from('user_institutions').delete().eq('institution_id', institutionId);
  await supabase.from('institutions').delete().eq('id', institutionId);
  // Delete orphaned users (users with no institution links)
}
```

**Validation Checkpoint:**
- [ ] Can approve/reject requests
- [ ] Can edit users
- [ ] Can deactivate users
- [ ] Cascade delete works correctly
- [ ] System logs record actions

---

### PHASE 4: Admin Panel (Priority: HIGH)

**Files:**
- `app/admin/page.tsx` - Dashboard with stats
- `app/admin/turmas/page.tsx` - Class management
- `app/admin/alunos/page.tsx` - Student management
- `app/admin/professores/page.tsx` - Teacher management
- `app/admin/tipos-ocorrencias/page.tsx` - Occurrence types
- `app/admin/trimestres/page.tsx` - Quarters config
- `app/admin/dashboard/page.tsx` - Analytics
- `app/admin/relatorios/page.tsx` - Reports hub
- `app/admin/relatorios/gerar/page.tsx` - Report generation

**Shared Features:**
- All data filtered by `institution_id`
- Soft delete with trash system
- Import from Excel (ExcelJS)
- Export to Excel/PDF

**Brazilian Education Levels:**
/**
 * Modelo alinhado à educação básica brasileira
 * - Educação Infantil: sem divisão por letras
 * - Ensino Fundamental e Médio: permite turmas A, B, C...
 * - Anos/Séries separados de Turmas
 */

export type EducationStage =
  | 'infantil'
  | 'fundamental'
  | 'medio'
  | 'custom';

export interface EducationYear {
  code: string;   // Identificador interno (ex: "6", "1")
  label: string;  // Ex: "6º ano", "1ª série"
  order: number;  // Ordem sequencial
}

export interface EducationLevel {
  label: string;
  allowClassSection: boolean; // permite A, B, C...
  years: EducationYear[];
}

export const EDUCATION_LEVELS: Record<EducationStage, EducationLevel> = {
  infantil: {
    label: 'Educação Infantil',
    allowClassSection: false,
    years: [
      {
        code: 'creche',
        label: 'Creche',
        order: 1
      },
      {
        code: 'pre',
        label: 'Pré-escola',
        order: 2
      }
    ]
  },

  fundamental: {
    label: 'Ensino Fundamental',
    allowClassSection: true,
    years: [
      { code: '1', label: '1º ano', order: 1 },
      { code: '2', label: '2º ano', order: 2 },
      { code: '3', label: '3º ano', order: 3 },
      { code: '4', label: '4º ano', order: 4 },
      { code: '5', label: '5º ano', order: 5 },
      { code: '6', label: '6º ano', order: 6 },
      { code: '7', label: '7º ano', order: 7 },
      { code: '8', label: '8º ano', order: 8 },
      { code: '9', label: '9º ano', order: 9 }
    ]
  },

  medio: {
    label: 'Ensino Médio',
    allowClassSection: true,
    years: [
      { code: '1', label: '1ª série', order: 1 },
      { code: '2', label: '2ª série', order: 2 },
      { code: '3', label: '3ª série', order: 3 },
      { code: '4', label: '4ª série', order: 4 }
    ]
  },

  custom: {
    label: 'Outro',
    allowClassSection: true,
    years: []
  }
};

/**
 * Representa uma turma da escola
 * Exemplo: "6º ano B"
 */
export interface SchoolClass {
  stage: EducationStage;
  yearCode: string;
  section?: string; // A, B, C... (somente Fundamental/Médio)
  label: string;
}

/**
 * Regras de negócio
 */
export function canHaveSection(stage: EducationStage): boolean {
  return (
    stage === 'fundamental' ||
    stage === 'medio' ||
    stage === 'custom'
  );
}

/**
 * Helper para montar o nome da turma
 */
export function buildClassLabel(
  stage: EducationStage,
  yearLabel: string,
  section?: string
): string {
  if (section && !canHaveSection(stage)) {
    throw new Error('Esta etapa não permite divisão por turma (A, B, C)');
  }

  return section ? `${yearLabel} ${section}` : yearLabel;
}

✔ Exemplos válidos
buildClassLabel('fundamental', '6º ano', 'B'); // "6º ano B"
buildClassLabel('medio', '2ª série', 'A');     // "2ª série A"
buildClassLabel('infantil', 'Pré-escola');     // "Pré-escola"

❌ Exemplo inválido
buildClassLabel('infantil', 'Creche', 'A');
// Erro: Educação Infantil não permite divisão por turma


const SHIFTS = [
  { value: 'matutino', label: 'Matutino' },
  { value: 'vespertino', label: 'Vespertino' },
  { value: 'noturno', label: 'Noturno' },
  { value: 'integral', label: 'Integral' }
];
```

**Validation Checkpoint:**
- [ ] CRUD for classes with trash
- [ ] CRUD for students with import/trash
- [ ] Teacher management working
- [ ] Occurrence types configurable
- [ ] Analytics dashboard with charts
- [ ] Reports generate correctly

---

### PHASE 5: Professor Panel (Priority: HIGH)

**Files:**
- `app/professor/page.tsx` - Dashboard
- `app/professor/registrar/page.tsx` - Register occurrence
- `app/professor/ocorrencias/page.tsx` - View my occurrences

**Register Occurrence Flow:**
```typescript
// 1. Select class (from institution)
// 2. Select students (multi-select from class)
// 3. Select occurrence type
// 4. Enter date/time (cannot be future)
// 5. Optional description
// 6. Submit creates occurrence for each selected student
```

**Validation Checkpoint:**
- [ ] Can register occurrences
- [ ] Multi-student selection works
- [ ] Future dates blocked
- [ ] Can view/edit/delete own occurrences

---

### PHASE 6: Settings & Polish (Priority: MEDIUM)

**Tasks:**
1. Settings page (`app/settings/page.tsx`)
2. Password change functionality
3. Multi-institution switching UI
4. Role switching (for users with multiple roles)
5. Loading states and error handling
6. Toast notifications
7. Mobile responsiveness

---

## CODE QUALITY STANDARDS

### TypeScript
- Strict mode enabled
- All functions typed
- No `any` types (use `unknown` if needed)
- Interfaces for all data structures

### React
- Functional components only
- Custom hooks for reusable logic
- Proper dependency arrays in useEffect
- Avoid unnecessary re-renders

### Tailwind
- Use design system colors consistently
- Mobile-first responsive design
- Avoid arbitrary values when possible

### Security
- Never expose service role key to client
- Validate all inputs
- Sanitize user content
- Use Row Level Security in Supabase

---

## PROGRESS REPORTING

After completing each phase, create a progress report:

```markdown
## Progress Report: [Phase Name]

### Completed
- [x] Task 1
- [x] Task 2

### Files Created/Modified
- `path/to/file.tsx` - Description
- `path/to/file.ts` - Description

### Tests Performed
- Manual test: [description] - PASSED/FAILED
- API test: [endpoint] - PASSED/FAILED

### Known Issues
- Issue 1: Description (severity: LOW/MEDIUM/HIGH)

### Next Steps
- Task for next phase

### Time Spent
- Estimated: X hours
- Actual: X hours
```

---

## REFERENCE DOCUMENTS

Always consult `PRD.md` for:
- Complete database schema
- API specifications
- UI/UX guidelines
- Color palette
- Component patterns

---

## REMEMBER

1. **You are autonomous** - Make decisions, only ask for critical business clarifications
2. **Quality over speed** - Better to do it right than redo it
3. **Test as you go** - Validate each feature before moving on
4. **Document everything** - Future you will thank present you
5. **Use agents wisely** - Parallelize when possible, sequence when dependent
6. **Create checkpoints** - Save progress reports regularly
7. **Think Brazilian** - All UI in Portuguese, Brazilian education system context

---

## START COMMAND

Begin by:
1. Reading `PRD.md` completely
2. Setting up the project structure
3. Creating the database schema in Supabase
4. Implementing Phase 1: Foundation

Use the TodoWrite tool extensively to track progress. Create sub-tasks for each phase. Mark completed items immediately.

**GO BUILD SOMETHING AMAZING!**
