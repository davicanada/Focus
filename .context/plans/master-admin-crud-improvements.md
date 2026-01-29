---
status: completed
generated: 2026-01-24
phases:
  - id: "phase-1"
    name: "Análise e Migration CASCADE DELETE"
    prevc: "E"
    status: "completed"
  - id: "phase-2"
    name: "Botão Aprovar Todos e API Bulk"
    prevc: "E"
    status: "completed"
  - id: "phase-3"
    name: "Melhorias de Segurança e UX"
    prevc: "E"
    status: "completed"
  - id: "phase-4"
    name: "Testes E2E"
    prevc: "V"
    status: "pending"
---

# Melhorias CRUD Master/Admin com Cascade Delete e Ações em Lote

> Corrigir cascade delete de instituições, adicionar botão Aceitar Todos, e implementar boas práticas de segurança

## Objetivo Principal
Quando uma instituição é deletada, todos os dados relacionados devem ser automaticamente removidos. Além disso, Master e Admin precisam de um botão "Aprovar Todos" para aprovar múltiplas solicitações de uma vez.

## Problemas Identificados

### 1. Falta de CASCADE DELETE
As foreign keys existentes NÃO têm `ON DELETE CASCADE`:
- `user_institutions.institution_id` → `institutions.id`
- `classes.institution_id` → `institutions.id`
- `students.institution_id` → `institutions.id`
- `occurrences.institution_id` → `institutions.id`
- `occurrence_types.institution_id` → `institutions.id`
- `quarters.institution_id` → `institutions.id`
- `access_requests.institution_id` → `institutions.id`
- `system_logs.institution_id` → `institutions.id`

**Resultado:** Ao deletar instituição, dados órfãos permanecem no banco.

### 2. Falta de Botão "Aprovar Todos"
O Master precisa aprovar solicitações uma por uma. Com muitas solicitações pendentes, isso é ineficiente.

### 3. Usuários Órfãos
Quando uma instituição é deletada, os usuários que só tinham vínculo com ela ficam sem acesso, mas não são removidos do Supabase Auth.

## Plano de Implementação

### Fase 1: Migration CASCADE DELETE

**Arquivo:** `supabase-cascade-delete.sql`

```sql
-- Adicionar ON DELETE CASCADE às foreign keys
-- ATENÇÃO: Isso vai dropar e recriar as constraints

-- 1. user_institutions
ALTER TABLE user_institutions
DROP CONSTRAINT user_institutions_institution_id_fkey,
ADD CONSTRAINT user_institutions_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 2. classes
ALTER TABLE classes
DROP CONSTRAINT classes_institution_id_fkey,
ADD CONSTRAINT classes_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 3. students (depende de classes, precisa CASCADE em ambos)
ALTER TABLE students
DROP CONSTRAINT students_institution_id_fkey,
ADD CONSTRAINT students_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE students
DROP CONSTRAINT students_class_id_fkey,
ADD CONSTRAINT students_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- 4. occurrence_types
ALTER TABLE occurrence_types
DROP CONSTRAINT occurrence_types_institution_id_fkey,
ADD CONSTRAINT occurrence_types_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 5. occurrences (depende de students e occurrence_types)
ALTER TABLE occurrences
DROP CONSTRAINT occurrences_institution_id_fkey,
ADD CONSTRAINT occurrences_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE occurrences
DROP CONSTRAINT occurrences_student_id_fkey,
ADD CONSTRAINT occurrences_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE occurrences
DROP CONSTRAINT occurrences_occurrence_type_id_fkey,
ADD CONSTRAINT occurrences_occurrence_type_id_fkey
  FOREIGN KEY (occurrence_type_id) REFERENCES occurrence_types(id) ON DELETE CASCADE;

-- 6. quarters
ALTER TABLE quarters
DROP CONSTRAINT quarters_institution_id_fkey,
ADD CONSTRAINT quarters_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

-- 7. access_requests (SET NULL ao invés de CASCADE - manter histórico)
ALTER TABLE access_requests
DROP CONSTRAINT access_requests_institution_id_fkey,
ADD CONSTRAINT access_requests_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

-- 8. system_logs (SET NULL - manter histórico de auditoria)
ALTER TABLE system_logs
DROP CONSTRAINT system_logs_institution_id_fkey,
ADD CONSTRAINT system_logs_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
```

### Fase 2: Botão "Aprovar Todos" e API Bulk

**Novos Endpoints:**
- `POST /api/approve-user/bulk` - Aprovar múltiplas solicitações

**Alterações no Frontend:**
- `app/master/page.tsx` - Adicionar botão "Aprovar Todos"
- Modal de confirmação antes de aprovar em lote

### Fase 3: Melhorias de Segurança

1. **Confirmação dupla para deletar instituição**
   - Modal com input para digitar nome da instituição

2. **Soft delete para usuários órfãos**
   - Ao deletar instituição, desativar usuários sem outros vínculos

3. **Logs de auditoria**
   - Registrar quem deletou e quando

4. **API de deleção dedicada**
   - `DELETE /api/institutions/[id]` com validações

### Fase 4: Testes E2E

- Testar cascade delete
- Testar aprovação em lote
- Testar confirmação de deleção

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase-cascade-delete.sql` | Migration CASCADE DELETE |
| `app/api/approve-user/bulk/route.ts` | API aprovação em lote |
| `app/api/institutions/[id]/route.ts` | API deleção com validações |
| `app/master/page.tsx` | Botão "Aprovar Todos" + confirmação deleção |
| `e2e/master-crud.spec.ts` | Testes E2E |

## Critérios de Sucesso

1. ✅ Deletar instituição remove todos os dados relacionados
2. ✅ Botão "Aprovar Todos" funciona para Master
3. ✅ Modal de confirmação para ações destrutivas
4. ✅ Logs de auditoria registrados
5. ✅ Testes E2E passando
