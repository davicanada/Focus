---
status: active
generated: 2026-01-25
priority: high
agents:
  - type: "security-auditor"
    role: "Verificar vulnerabilidades de integridade e seguranca dos dados"
  - type: "database-specialist"
    role: "Analisar estrutura do banco e relacionamentos"
  - type: "test-writer"
    role: "Criar queries de verificacao e testes automatizados"
phases:
  - id: "phase-1"
    name: "Diagnostico - Executar Verificacoes"
    prevc: "P"
  - id: "phase-2"
    name: "Correcoes - Resolver Inconsistencias"
    prevc: "E"
  - id: "phase-3"
    name: "Prevencao - Implementar Salvaguardas"
    prevc: "V"
---

# Plano de Verificacao de Integridade dos Dados

> Analise completa dos fluxos de dados para identificar vulnerabilidades que possam comprometer a integridade do banco de dados do sistema Focus.

## Task Snapshot

- **Primary goal:** Identificar e corrigir problemas de integridade referencial, dados orfaos, inconsistencias de soft delete, e vulnerabilidades nos fluxos de dados.
- **Success signal:** Todas as queries de verificacao retornam zero registros problematicos.
- **Key references:**
  - [Tipos TypeScript](../../types/index.ts)
  - [CLAUDE.md](../../CLAUDE.md) - Historico de migrations

---

## 1. Mapa de Entidades e Relacionamentos

### 1.1 Tabelas Principais (14 tabelas)

```
                            INSTITUTIONS
                     (Entidade raiz - multi-tenant)
                                 |
    +------------+---------------+---------------+------------+
    |            |               |               |            |
    v            v               v               v            v
  users    classes          occurrence     quarters      school_years
  (via UI)    |              _types            |              |
    |         |                 |              |              |
    |         v                 |              |              |
    |     students              |              |              |
    |         |                 |              |              |
    |         +--------+--------+              |              |
    |                  |                       |              |
    |                  v                       |              |
    +------------> occurrences <---------------+              |
    |                  |                                      |
    |                  v                                      |
    +------------> alert_rules -----> alert_notifications     |
                       |                                      |
                       +--------------------------------------+
                                      |
                                      v
                            student_enrollments
```

### 1.2 Comportamento de DELETE Configurado

| Tabela Pai | Tabela Filha | ON DELETE |
|------------|--------------|-----------|
| institutions | user_institutions | CASCADE |
| institutions | classes | CASCADE |
| institutions | students | CASCADE |
| institutions | occurrence_types | CASCADE |
| institutions | occurrences | CASCADE |
| institutions | quarters | CASCADE |
| institutions | access_requests | SET NULL |
| institutions | system_logs | SET NULL |
| institutions | alert_rules | CASCADE |
| institutions | school_years | CASCADE |
| classes | students | CASCADE |
| students | occurrences | CASCADE |
| occurrence_types | occurrences | CASCADE |

### 1.3 Campos de Soft Delete

| Tabela | Campos | Status |
|--------|--------|--------|
| users | deleted_at, deactivation_reason | Implementado |
| user_institutions | deleted_at | Implementado |
| classes | deleted_at | Implementado |
| students | deleted_at | Implementado |
| occurrence_types | deleted_at | Implementado |
| occurrences | (nenhum) | Sem soft delete |
| alert_rules | (nenhum) | Usa is_active |

---

## 2. Fluxos Criticos e Riscos de Integridade

### 2.1 Exclusao de Instituicao (RISCO ALTO)

**Fluxo:**
```
DELETE FROM institutions WHERE id = X
  -> CASCADE: user_institutions, classes, students, occurrences,
              occurrence_types, quarters, alert_rules, school_years
  -> SET NULL: access_requests.institution_id, system_logs.institution_id
```

**Riscos:**
- Perda total de dados historicos
- Usuarios (users) ficam orfaos (sem instituicao vinculada)
- Logs de sistema perdem contexto

**Mitigacao atual:** Modal de confirmacao com digitacao do nome da instituicao

---

### 2.2 Desativacao de Turma

**Fluxo:**
```
UPDATE classes SET deleted_at = NOW() WHERE id = X
  -> Alunos continuam vinculados a turma inativa
  -> Ocorrencias mantem class_id_at_occurrence
```

**Riscos:**
- Alunos em turma inativa nao aparecem em relatorios
- Turma pode ter sido excluida por engano

---

### 2.3 Desativacao de Aluno

**Fluxo:**
```
UPDATE students SET deleted_at = NOW() WHERE id = X
  -> Ocorrencias NAO sao apagadas (historico preservado)
  -> student_enrollments mantem historico
```

**Status:** Implementado corretamente

---

### 2.4 Desligamento de Professor

**Fluxo:**
```
UPDATE users SET deleted_at = NOW() WHERE id = X
UPDATE user_institutions SET deleted_at = NOW() WHERE user_id = X
  -> Ocorrencias mantem registered_by (historico)
  -> Alert rules mantem created_by
```

**Riscos:**
- Ocorrencias mostram "Registrado por: (usuario removido)"
- Professor desativado pode ter ocorrencias pos-desativacao

---

### 2.5 Exclusao de Tipo de Ocorrencia

**Fluxo:**
```
UPDATE occurrence_types SET deleted_at = NOW() WHERE id = X
  -> Ocorrencias existentes mantem referencia
  -> Alert rules com filter_occurrence_type_id ficam invalidas
```

**Riscos:**
- Regras de alerta podem parar de funcionar silenciosamente

---

### 2.6 Transferencia de Aluno entre Turmas

**Fluxo:**
```
UPDATE students SET class_id = NEW_CLASS WHERE id = X
  -> class_id_at_occurrence preserva turma original nas ocorrencias
  -> student_enrollments deve criar novo registro
```

**Riscos:**
- class_id_at_occurrence pode nao ter sido populado (ocorrencias antigas)
- student_enrollments pode estar desatualizado

---

### 2.7 Virada de Ano Letivo

**Fluxo:**
```
1. Arquiva ano atual (is_archived = true)
2. Cria novo ano (is_current = true)
3. Cria novas turmas
4. Promove alunos (cria novos enrollments)
```

**Riscos:**
- Multiplos anos marcados como current
- Alunos sem enrollment no novo ano
- Turmas orfas (sem school_year_id)

---

## 3. Queries de Verificacao

### V1: Usuarios orfaos (sem instituicao)
```sql
SELECT u.id, u.email, u.full_name
FROM users u
WHERE u.deleted_at IS NULL
  AND u.is_master = false
  AND NOT EXISTS (
    SELECT 1 FROM user_institutions ui
    WHERE ui.user_id = u.id AND ui.deleted_at IS NULL
  );
```

### V2: Alunos ativos em turmas inativas
```sql
SELECT s.id, s.full_name, c.name as turma
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.deleted_at IS NULL AND s.is_active = true
  AND (c.deleted_at IS NOT NULL OR c.is_active = false);
```

### V3: Ocorrencias com aluno inexistente
```sql
SELECT o.id, o.student_id, o.occurrence_date
FROM occurrences o
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = o.student_id);
```

### V4: Ocorrencias com professor inexistente
```sql
SELECT o.id, o.registered_by, o.occurrence_date
FROM occurrences o
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.registered_by);
```

### V5: Ocorrencias com tipo inexistente
```sql
SELECT o.id, o.occurrence_type_id
FROM occurrences o
WHERE NOT EXISTS (SELECT 1 FROM occurrence_types ot WHERE ot.id = o.occurrence_type_id);
```

### V6: Ocorrencias sem class_id_at_occurrence
```sql
SELECT o.id, o.student_id, o.occurrence_date
FROM occurrences o
WHERE o.class_id_at_occurrence IS NULL;
```

### V7: Alert rules com aluno invalido
```sql
SELECT ar.id, ar.name, s.full_name, s.deleted_at
FROM alert_rules ar
LEFT JOIN students s ON ar.scope_student_id = s.id
WHERE ar.is_active = true
  AND ar.scope_student_id IS NOT NULL
  AND (s.id IS NULL OR s.deleted_at IS NOT NULL);
```

### V8: Alert rules com turma invalida
```sql
SELECT ar.id, ar.name, c.name as turma
FROM alert_rules ar
LEFT JOIN classes c ON ar.scope_class_id = c.id
WHERE ar.is_active = true
  AND ar.scope_class_id IS NOT NULL
  AND (c.id IS NULL OR c.deleted_at IS NOT NULL);
```

### V9: Alert rules com tipo de ocorrencia invalido
```sql
SELECT ar.id, ar.name, ot.category
FROM alert_rules ar
LEFT JOIN occurrence_types ot ON ar.filter_occurrence_type_id = ot.id
WHERE ar.is_active = true
  AND ar.filter_occurrence_type_id IS NOT NULL
  AND (ot.id IS NULL OR ot.deleted_at IS NOT NULL);
```

### V10: Multiplos anos letivos current
```sql
SELECT institution_id, COUNT(*) as total_current
FROM school_years
WHERE is_current = true
GROUP BY institution_id
HAVING COUNT(*) > 1;
```

### V11: Turmas sem ano letivo
```sql
SELECT c.id, c.name, c.year
FROM classes c
WHERE c.school_year_id IS NULL AND c.deleted_at IS NULL;
```

### V12: Alunos sem matricula no ano atual
```sql
SELECT s.id, s.full_name, c.name as turma
FROM students s
JOIN classes c ON s.class_id = c.id
JOIN school_years sy ON sy.institution_id = s.institution_id AND sy.is_current = true
WHERE s.deleted_at IS NULL AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM student_enrollments se
    WHERE se.student_id = s.id AND se.school_year_id = sy.id
  );
```

### V13: Notificacoes de alerta orfas
```sql
SELECT an.id, an.rule_name
FROM alert_notifications an
WHERE NOT EXISTS (SELECT 1 FROM alert_rules ar WHERE ar.id = an.alert_rule_id);
```

### V14: Access requests com instituicao inexistente
```sql
SELECT ar.id, ar.email, ar.institution_id
FROM access_requests ar
WHERE ar.institution_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM institutions i WHERE i.id = ar.institution_id);
```

---

## 4. Script Consolidado de Verificacao

```sql
-- ============================================================
-- SCRIPT DE VERIFICACAO DE INTEGRIDADE - FOCUS
-- Executar periodicamente ou antes de migrations
-- ============================================================

SELECT 'V1: Usuarios orfaos' as verificacao, COUNT(*) as problemas
FROM users u
WHERE u.deleted_at IS NULL AND u.is_master = false
  AND NOT EXISTS (SELECT 1 FROM user_institutions ui WHERE ui.user_id = u.id AND ui.deleted_at IS NULL)
UNION ALL
SELECT 'V2: Alunos em turmas inativas', COUNT(*)
FROM students s JOIN classes c ON s.class_id = c.id
WHERE s.deleted_at IS NULL AND s.is_active = true AND (c.deleted_at IS NOT NULL OR c.is_active = false)
UNION ALL
SELECT 'V3: Ocorrencias sem aluno', COUNT(*)
FROM occurrences o WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = o.student_id)
UNION ALL
SELECT 'V4: Ocorrencias sem professor', COUNT(*)
FROM occurrences o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.registered_by)
UNION ALL
SELECT 'V5: Ocorrencias sem tipo', COUNT(*)
FROM occurrences o WHERE NOT EXISTS (SELECT 1 FROM occurrence_types ot WHERE ot.id = o.occurrence_type_id)
UNION ALL
SELECT 'V6: Ocorrencias sem turma historica', COUNT(*)
FROM occurrences o WHERE o.class_id_at_occurrence IS NULL
UNION ALL
SELECT 'V7: Alertas com aluno invalido', COUNT(*)
FROM alert_rules ar LEFT JOIN students s ON ar.scope_student_id = s.id
WHERE ar.is_active = true AND ar.scope_student_id IS NOT NULL AND (s.id IS NULL OR s.deleted_at IS NOT NULL)
UNION ALL
SELECT 'V8: Alertas com turma invalida', COUNT(*)
FROM alert_rules ar LEFT JOIN classes c ON ar.scope_class_id = c.id
WHERE ar.is_active = true AND ar.scope_class_id IS NOT NULL AND (c.id IS NULL OR c.deleted_at IS NOT NULL)
UNION ALL
SELECT 'V9: Alertas com tipo invalido', COUNT(*)
FROM alert_rules ar LEFT JOIN occurrence_types ot ON ar.filter_occurrence_type_id = ot.id
WHERE ar.is_active = true AND ar.filter_occurrence_type_id IS NOT NULL AND (ot.id IS NULL OR ot.deleted_at IS NOT NULL)
UNION ALL
SELECT 'V10: Multiplos anos current', COALESCE(SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END), 0)
FROM (SELECT institution_id, COUNT(*) as cnt FROM school_years WHERE is_current = true GROUP BY institution_id) sub
UNION ALL
SELECT 'V11: Turmas sem ano letivo', COUNT(*)
FROM classes c WHERE c.school_year_id IS NULL AND c.deleted_at IS NULL
UNION ALL
SELECT 'V12: Alunos sem matricula', COUNT(*)
FROM students s
JOIN school_years sy ON sy.institution_id = s.institution_id AND sy.is_current = true
WHERE s.deleted_at IS NULL AND s.is_active = true
  AND NOT EXISTS (SELECT 1 FROM student_enrollments se WHERE se.student_id = s.id AND se.school_year_id = sy.id)
UNION ALL
SELECT 'V13: Notificacoes orfas', COUNT(*)
FROM alert_notifications an WHERE NOT EXISTS (SELECT 1 FROM alert_rules ar WHERE ar.id = an.alert_rule_id)
UNION ALL
SELECT 'V14: Requests inst inexistente', COUNT(*)
FROM access_requests ar WHERE ar.institution_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM institutions i WHERE i.id = ar.institution_id);
```

---

## 5. Plano de Execucao

### Fase 1: Diagnostico (Imediato)

- [ ] Executar script de verificacao consolidado no banco
- [ ] Documentar quantidade de problemas por categoria
- [ ] Priorizar correcoes por impacto

### Fase 2: Correcoes

- [ ] **V6:** Preencher class_id_at_occurrence com class_id atual do aluno
- [ ] **V11:** Criar school_year padrao e vincular turmas
- [ ] **V12:** Criar enrollments faltantes
- [ ] **V7/V8/V9:** Desativar alert rules com escopos invalidos

### Fase 3: Prevencao

- [ ] Adicionar validacao na UI para alertas com escopos invalidos
- [ ] Criar job periodico de verificacao (cron ou scheduled function)
- [ ] Implementar testes E2E de integridade

---

## 6. Resumo de Riscos

| Nivel | Descricao | Mitigacao |
|-------|-----------|-----------|
| ALTO | Exclusao de instituicao apaga tudo | Modal de confirmacao implementado |
| ALTO | Virada de ano pode corromper dados | Validacoes no rollover API |
| MEDIO | Ocorrencias sem turma historica | Trigger existe, verificar dados antigos |
| MEDIO | Alert rules com escopos invalidos | Adicionar verificacao na UI |
| BAIXO | Usuarios orfaos | Cleanup periodico |
