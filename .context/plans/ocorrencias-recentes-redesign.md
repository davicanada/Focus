---
status: draft
generated: 2026-01-28
agents:
  - type: "database-specialist"
    role: "Implementar trigger de auditoria no PostgreSQL"
  - type: "frontend-specialist"
    role: "Melhorar UI de Logs no Painel Master"
  - type: "backend-specialist"
    role: "Expandir logging para todas as operações CRUD"
phases:
  - id: "phase-1"
    name: "Auditoria de Ocorrências (Trigger)"
    prevc: "E"
  - id: "phase-2"
    name: "Melhorias na Visão Geral"
    prevc: "E"
  - id: "phase-3"
    name: "Melhorias no Painel de Logs do Master"
    prevc: "E"
---

# Redesign: Últimas Ocorrências + Sistema de Auditoria

> Implementar auditoria automática via trigger e melhorar rastreabilidade no Painel Master

## Task Snapshot
- **Primary goal:** Garantir integridade e rastreabilidade de todas as alterações em ocorrências
- **Success signal:** Master consegue ver histórico completo de criações/edições no painel de Logs
- **Key references:**
  - Visão Geral: `app/admin/page.tsx`, `app/viewer/page.tsx`, `app/professor/page.tsx`
  - Logs Master: `app/master/page.tsx` (linhas 891-950)
  - API Ocorrências: `app/api/occurrences/`
  - Tabela: `system_logs`

---

## Parte 1: Análise do Sistema de Logs Atual

### Estrutura da Tabela `system_logs`

```typescript
interface SystemLog {
  id: string;
  user_id?: string;
  institution_id?: string;
  action: string;           // Tipo de ação
  entity_type: string;      // Ex: 'occurrence', 'user', 'class'
  entity_id?: string;       // ID da entidade afetada
  details?: Record<string, unknown>;  // JSON com detalhes
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
```

### O que é logado HOJE

| Ação | Logado? | Onde |
|------|---------|------|
| Mudança de role | ✅ Sim | `app/api/users/[id]/role/route.ts` |
| Login/Logout | ❌ Não | - |
| Criar ocorrência | ❌ Não | - |
| Editar ocorrência | ❌ Não | - |
| Excluir ocorrência | ❌ Não | - |
| Aprovar usuário | ❌ Não | - |
| Criar/editar aluno | ❌ Não | - |
| Criar/editar turma | ❌ Não | - |

**Problema:** Apenas 1 tipo de ação é logado. Sistema de auditoria incompleto.

### UI Atual do Painel de Logs

- Tabela simples com últimos 100 registros
- Colunas: Data/Hora, Usuário, Ação, Entidade, Instituição
- Sem filtros, busca ou paginação
- Campo `details` (JSON) não é exibido

---

## Parte 2: Plano de Implementação

### Fase 1: Trigger de Auditoria para Ocorrências

**Objetivo:** Registrar automaticamente toda criação, edição e exclusão de ocorrências.

#### Migration SQL

```sql
-- 1. Criar função de auditoria
CREATE OR REPLACE FUNCTION audit_occurrence_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_type TEXT;
  v_new_type TEXT;
  v_details JSONB;
BEGIN
  -- Determinar ação
  IF TG_OP = 'INSERT' THEN
    v_action := 'occurrence_create';
    v_details := jsonb_build_object(
      'student_id', NEW.student_id,
      'occurrence_type_id', NEW.occurrence_type_id,
      'occurrence_date', NEW.occurrence_date,
      'description', NEW.description,
      'class_id_at_occurrence', NEW.class_id_at_occurrence
    );

    INSERT INTO system_logs (user_id, institution_id, action, entity_type, entity_id, details)
    VALUES (NEW.registered_by, NEW.institution_id, v_action, 'occurrence', NEW.id, v_details);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar se é soft delete
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'occurrence_delete';
      v_details := jsonb_build_object(
        'student_id', OLD.student_id,
        'occurrence_type_id', OLD.occurrence_type_id,
        'deleted_by', NEW.deleted_by,
        'reason', 'soft_delete'
      );
    ELSE
      v_action := 'occurrence_update';
      v_details := jsonb_build_object(
        'student_id', OLD.student_id,
        'changes', jsonb_build_object(
          'occurrence_type_id', CASE WHEN OLD.occurrence_type_id != NEW.occurrence_type_id
            THEN jsonb_build_object('old', OLD.occurrence_type_id, 'new', NEW.occurrence_type_id)
            ELSE NULL END,
          'occurrence_date', CASE WHEN OLD.occurrence_date != NEW.occurrence_date
            THEN jsonb_build_object('old', OLD.occurrence_date, 'new', NEW.occurrence_date)
            ELSE NULL END,
          'description', CASE WHEN OLD.description IS DISTINCT FROM NEW.description
            THEN jsonb_build_object('old', OLD.description, 'new', NEW.description)
            ELSE NULL END
        )
      );
    END IF;

    INSERT INTO system_logs (user_id, institution_id, action, entity_type, entity_id, details)
    VALUES (
      COALESCE(NEW.deleted_by, auth.uid()),
      NEW.institution_id,
      v_action,
      'occurrence',
      NEW.id,
      v_details
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar trigger
DROP TRIGGER IF EXISTS occurrence_audit_trigger ON occurrences;
CREATE TRIGGER occurrence_audit_trigger
AFTER INSERT OR UPDATE ON occurrences
FOR EACH ROW EXECUTE FUNCTION audit_occurrence_changes();
```

#### Resultado no `system_logs`

**Quando professor CRIA ocorrência:**
```json
{
  "action": "occurrence_create",
  "entity_type": "occurrence",
  "entity_id": "occ-123",
  "user_id": "prof-maria-uuid",
  "institution_id": "inst-abc",
  "details": {
    "student_id": "student-456",
    "occurrence_type_id": "type-ATRASO",
    "occurrence_date": "2026-01-27T08:30:00Z",
    "description": "Chegou atrasado",
    "class_id_at_occurrence": "turma-9A"
  }
}
```

**Quando professor EDITA ocorrência:**
```json
{
  "action": "occurrence_update",
  "entity_type": "occurrence",
  "entity_id": "occ-123",
  "user_id": "prof-maria-uuid",
  "details": {
    "student_id": "student-456",
    "changes": {
      "occurrence_type_id": { "old": "type-ATRASO", "new": "type-BRIGA" },
      "occurrence_date": { "old": "2026-01-27T08:30:00Z", "new": "2026-01-27T09:15:00Z" },
      "description": { "old": "Chegou atrasado", "new": "Envolvido em briga" }
    }
  }
}
```

**Quando admin EXCLUI ocorrência:**
```json
{
  "action": "occurrence_delete",
  "entity_type": "occurrence",
  "entity_id": "occ-123",
  "user_id": "admin-uuid",
  "details": {
    "student_id": "student-456",
    "occurrence_type_id": "type-BRIGA",
    "deleted_by": "admin-uuid",
    "reason": "soft_delete"
  }
}
```

---

### Fase 2: Melhorias na Visão Geral

#### Mudanças por Role

| Página | Título Atual | Título Novo |
|--------|--------------|-------------|
| Admin | "Ocorrências Recentes" | "Últimas Dez Ocorrências" |
| Viewer | "Ocorrências Recentes" | "Últimas Dez Ocorrências" |
| Professor | "Minhas Últimas Ocorrências" | "Minhas Últimas Dez Ocorrências" |

#### Adicionar Turma

Exibir a turma do aluno em cada ocorrência.

**Antes:**
```
João Silva
Briga
27/01/2026 14:30 • Registrado por Prof. Maria
```

**Depois:**
```
João Silva - 9º A
Briga
27/01/2026 14:30 • Registrado por Prof. Maria
```

#### Refresh ao Focar na Aba

```typescript
// Adicionar em cada página de Visão Geral
useEffect(() => {
  const handleFocus = () => {
    if (currentInstitution?.id) {
      loadDashboardData(currentInstitution.id);
    }
  };
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [currentInstitution?.id]);
```

---

### Fase 3: Melhorias no Painel de Logs do Master

#### 3.1 Adicionar Filtros

```
┌─────────────────────────────────────────────────────────────────┐
│  Logs do Sistema                                    [Atualizar] │
├─────────────────────────────────────────────────────────────────┤
│  Filtros:                                                       │
│  [Ação ▼] [Instituição ▼] [Usuário ▼] [Período ▼] [🔍 Buscar]  │
├─────────────────────────────────────────────────────────────────┤
│  Data/Hora     │ Usuário      │ Ação              │ Detalhes   │
│  27/01 14:35   │ Prof. Maria  │ occurrence_create │ [Ver]      │
│  27/01 14:30   │ Prof. Maria  │ occurrence_update │ [Ver]      │
│  27/01 10:00   │ Admin        │ role_change       │ [Ver]      │
├─────────────────────────────────────────────────────────────────┤
│  ◀ Anterior  Página 1 de 10  Próxima ▶   [20 por página ▼]     │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2 Tipos de Ação para Filtro

```typescript
const ACTION_LABELS: Record<string, string> = {
  'occurrence_create': 'Ocorrência Criada',
  'occurrence_update': 'Ocorrência Editada',
  'occurrence_delete': 'Ocorrência Excluída',
  'role_change': 'Mudança de Permissão',
  'user_approve': 'Usuário Aprovado',
  'user_reject': 'Usuário Rejeitado',
  'user_deactivate': 'Usuário Desativado',
  'student_create': 'Aluno Cadastrado',
  'student_deactivate': 'Aluno Desligado',
  'class_create': 'Turma Criada',
  'class_deactivate': 'Turma Desativada',
};
```

#### 3.3 Modal de Detalhes

Ao clicar em [Ver], abre modal com JSON formatado:

```
┌─────────────────────────────────────────────────┐
│  Detalhes do Log                           [X]  │
├─────────────────────────────────────────────────┤
│  Ação: Ocorrência Editada                       │
│  Data: 27/01/2026 14:30                         │
│  Usuário: Prof. Maria                           │
│  Instituição: Colégio Drummond                  │
│                                                 │
│  Alterações:                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ Tipo:                                    │   │
│  │   Antes: Atraso                          │   │
│  │   Depois: Briga                          │   │
│  │                                          │   │
│  │ Horário:                                 │   │
│  │   Antes: 08:30                           │   │
│  │   Depois: 09:15                          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### 3.4 Paginação

- Padrão: 20 logs por página
- Opções: 20, 50, 100
- Navegação: Anterior/Próxima + número da página

---

## Checklist de Implementação

### Fase 1: Trigger de Auditoria
- [ ] Criar migration SQL com função e trigger
- [ ] Executar no Supabase
- [ ] Testar: criar ocorrência → verificar log
- [ ] Testar: editar ocorrência → verificar log com changes
- [ ] Testar: excluir ocorrência → verificar log

### Fase 2: Melhorias na Visão Geral
- [ ] Renomear título em `app/admin/page.tsx`
- [ ] Renomear título em `app/viewer/page.tsx`
- [ ] Renomear título em `app/professor/page.tsx`
- [ ] Adicionar turma na exibição
- [ ] Implementar refresh ao focar na aba

### Fase 3: Melhorias no Painel de Logs
- [ ] Adicionar filtro por ação
- [ ] Adicionar filtro por instituição
- [ ] Adicionar filtro por período
- [ ] Adicionar busca textual
- [ ] Implementar paginação
- [ ] Criar modal de detalhes
- [ ] Formatar JSON de changes de forma legível

---

## Impacto

| Aspecto | Impacto |
|---------|---------|
| Performance | Mínimo (~5ms por operação) |
| Armazenamento | ~200 bytes por log |
| Segurança | Máxima (trigger não pode ser burlado) |
| Banco de dados | 1 migration (função + trigger) |
| Código | ~200 linhas (UI de logs) |

---

## Benefícios

1. **Compliance:** Trilha de auditoria completa para ocorrências
2. **Segurança:** Impossível editar sem deixar rastro
3. **Rastreabilidade:** Master vê exatamente quem fez o quê e quando
4. **Transparência:** Histórico de alterações preservado
5. **Investigação:** Fácil identificar padrões suspeitos
