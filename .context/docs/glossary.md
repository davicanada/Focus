---
type: doc
name: glossary
description: Definitions of domain-specific terms and acronyms
category: reference
generated: 2026-01-23
status: filled
scaffoldVersion: "2.0.0"
---

# Project Glossary

## Domain Terms

### Roles
- **Gestor (Administrator)**: Highest level access. Can manage all aspects of the system (Classes, Trimesters, Users, Reports).
- **Professor (Teacher)**: Academic staff. Can manage the classes they are assigned to, register occurrences, and view their students.
- **Master**: Special role (likely Super Admin or System Owner) with overarching permissions.
- **Aluno (Student)**: The entity being educated/managed. Not a system user (Logins are for staff), but a data entity.

### Academic Structure
- **Turma (Class/Section)**: A group of students assigned to a specific grade/year and shift.
- **Turno (Shift)**: The time of day classes take place (e.g., Manhã, Tarde, Noite).
- **Trimestre (Trimester)**: The academic period. Grading and reporting are often scoped to this.
- **Matrícula (Enrollment)**: The association of a Student to a Class.

### Operations
- **Ocorrência (Occurrence)**: A disciplinary or behavioral record associated with a student. Can be positive or negative.
- **Solicitação de Acesso (Access Request)**: The process where a new user signs up and requests a specific role, waiting for Admin approval.

## Technical Terms
- **RLS (Row Level Security)**: PostgreSQL security feature used to restrict data access based on the user's authenticated role.
- **Supabase Auth**: The authentication service used (wraps GoTrue).
- **Next.js App Router**: The router paradigm used (`app/` directory), distinguishing Server Components and Client Components.
