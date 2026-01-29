---
status: planning
generated: 2026-01-25
agents:
  - type: "security-auditor"
    role: "Analisar riscos de integridade referencial e CASCADE deletes"
  - type: "architect-specialist"
    role: "Projetar sistema de soft delete universal e anos letivos"
  - type: "database-specialist"
    role: "Implementar migrations e triggers no Supabase"
  - type: "feature-developer"
    role: "Implementar APIs de desligamento/reativacao"
  - type: "frontend-specialist"
    role: "Criar UI para gerenciar usuarios inativos"
  - type: "test-writer"
    role: "Escrever testes E2E para cenarios de integridade"
phases:
  - id: "phase-1"
    name: "Analise e Planejamento"
    prevc: "P"
  - id: "phase-2"
    name: "Migrations de Banco"
    prevc: "E"
  - id: "phase-3"
    name: "APIs e Backend"
    prevc: "E"
  - id: "phase-4"
    name: "UI e Frontend"
    prevc: "E"
  - id: "phase-5"
    name: "Testes e Validacao"
    prevc: "V"
---

# Seguranca e Integridade de Dados - Soft Delete Universal

> **Status:** Em planejamento
> **Data:** 25/01/2026
> **Autor:** Claude (Arquiteto de Sistemas)

## Resumo Executivo

Este plano aborda a seguranca do sistema Focus em relacao a exclusao de dados relacionados, garantindo que:
- Dados historicos permanecam integros nos graficos do Analytics
- Usuarios desligados possam ser reativados facilmente
- A virada de ano letivo seja gerenciada sem perda de dados
- Todas as entidades sigam um padrao consistente de soft delete

---

## 1. Diagnostico da Situacao Atual

### 1.1 Mapeamento de Relacionamentos

```
┌─────────────────┐
│  INSTITUTIONS   │ ← Raiz de tudo
└────────┬────────┘
         │ CASCADE (hard delete!)
         ▼
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌─────────────┐    ┌─────────────┐    ┌───────────────┐  │
│  │   CLASSES   │◄───│  STUDENTS   │◄───│  OCCURRENCES  │  │
│  │ (soft del)  │    │ (soft del)  │    │  (hard del!)  │  │
│  └─────────────┘    └─────────────┘    └───────┬───────┘  │
│         │                                      │          │
│         │ CASCADE                              │ SET NULL │
│         ▼                                      ▼          │
│  ┌─────────────┐                        ┌───────────┐     │
│  │  STUDENTS   │                        │   USERS   │     │
│  │  (cascade)  │                        │(prof/adm) │     │
│  └─────────────┘                        └───────────┘     │
│                                                           │
│  ┌──────────────────┐    ┌────────────────┐              │
│  │ OCCURRENCE_TYPES │    │  ALERT_RULES   │              │
│  │   (is_active)    │    │   (cascade)    │              │
│  └──────────────────┘    └────────────────┘              │
└────────────────────────────────────────────────────────────┘
```

### 1.2 Estado Atual por Entidade

| Entidade | Soft Delete | Hard Delete | Problema |
|----------|-------------|-------------|----------|
| `institutions` | Nao | CASCADE | Deleta TUDO em cascata |
| `users` | Nao | SET NULL | Perde autor das ocorrencias |
| `user_institutions` | Nao | CASCADE | Perde vinculo escola-professor |
| `classes` | `is_active` + `deleted_at` | Nao | Correto |
| `students` | `is_active` + `deleted_at` | Nao | Correto |
| `occurrence_types` | Apenas `is_active` | Nao | Falta `deleted_at` |
| `occurrences` | Nao | CASCADE | **CRITICO: Perde historico!** |
| `quarters` | Nao | CASCADE | Perde periodos |
| `alert_rules` | Nao | CASCADE | OK (regras sao descartaveis) |

---

## 2. Cenarios de Uso e Riscos

### 2.1 Cenario: Aluna Adriana transferida da 9ºB para 9ºA

**Situacao atual:**
- Adriana tem `student_id = 'abc123'`
- Ocorrencias dela: `occurrences.student_id = 'abc123'`
- Ao mudar `students.class_id` de 9ºB para 9ºA...

**O que acontece:**
- Ocorrencias **permanecem** vinculadas a Adriana
- Graficos continuam mostrando dados dela
- **Porem**: O JOIN `students → classes` agora retorna 9ºA
- Historico de ocorrencias na 9ºB aparece como se fosse na 9ºA

**Risco:** Distorcao nos graficos "Ocorrencias por Turma"

**Solucao proposta:**
```sql
-- Adicionar coluna para armazenar turma no momento da ocorrencia
ALTER TABLE occurrences ADD COLUMN class_id_at_occurrence UUID;

-- Trigger para popular automaticamente
CREATE OR REPLACE FUNCTION set_class_at_occurrence()
RETURNS TRIGGER AS $$
BEGIN
  NEW.class_id_at_occurrence := (
    SELECT class_id FROM students WHERE id = NEW.student_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 2.2 Cenario: Adriana muda de escola

**Opcao A - Hard Delete (NAO RECOMENDADO):**
```sql
DELETE FROM students WHERE id = 'abc123';
-- CASCADE: Deleta TODAS as ocorrencias dela
-- Resultado: Graficos perdem dados historicos
```

**Opcao B - Soft Delete (RECOMENDADO):**
```sql
UPDATE students SET
  is_active = false,
  deleted_at = NOW(),
  deactivation_reason = 'Transferencia para outra escola'
WHERE id = 'abc123';
-- Resultado: Dados historicos preservados, aluna nao aparece em listas ativas
```

**Impacto nos Graficos:**
- Query atual: `.eq('is_active', true).is('deleted_at', null)`
- Adriana **nao aparece** em "Alunos Ativos"
- Adriana **aparece** em graficos historicos de Analytics
- Integridade mantida

---

### 2.3 Cenario: Professor sai da escola

**Situacao atual:**
```sql
-- Se deletar o usuario:
DELETE FROM users WHERE id = 'prof123';
-- Resultado: occurrences.registered_by = NULL (SET NULL)
```

**Problema:** Perde-se quem registrou a ocorrencia.

**Solucao proposta - Soft Delete em Users:**
```sql
-- Adicionar campos de soft delete
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deactivation_reason TEXT;

-- Atualizar views para filtrar inativos
-- Query: .eq('is_active', true).is('deleted_at', null)
```

**Fluxo "Desligar Professor":**
1. Admin clica "Desligar" no professor
2. Sistema marca `users.is_active = false` e `deleted_at = NOW()`
3. Professor nao aparece mais em listas ativas
4. Ocorrencias registradas por ele continuam visiveis
5. Graficos mostram "Registrado por: Prof. Joao (desligado)"

---

### 2.4 Cenario: Professor quer voltar apos ser desligado

**Fluxo atual (problematico):**
1. Professor faz nova solicitacao de acesso
2. Sistema cria NOVO `user_id`
3. Historico anterior fica orfao

**Fluxo proposto (com soft delete):**

```
┌────────────────────────────────────────────────────────────────┐
│                  FLUXO DE RECONTRATACAO                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Professor faz solicitacao ──► Sistema detecta email existente │
│                                        │                       │
│                                        ▼                       │
│                              ┌─────────────────────┐           │
│                              │ Usuario desligado?  │           │
│                              └─────────┬───────────┘           │
│                                        │                       │
│                          ┌─────────────┴─────────────┐         │
│                          │                           │         │
│                       SIM │                       NAO│         │
│                          ▼                           ▼         │
│               ┌────────────────────┐    ┌────────────────────┐ │
│               │ Mostrar opcao de   │    │ Rejeitar: "Email   │ │
│               │ "Reativar conta"   │    │ ja cadastrado"     │ │
│               └─────────┬──────────┘    └────────────────────┘ │
│                         │                                      │
│                         ▼                                      │
│               ┌────────────────────┐                           │
│               │ Admin aprova       │                           │
│               │ reativacao         │                           │
│               └─────────┬──────────┘                           │
│                         │                                      │
│                         ▼                                      │
│               ┌────────────────────┐                           │
│               │ is_active = true   │                           │
│               │ deleted_at = null  │                           │
│               │ Historico mantido! │                           │
│               └────────────────────┘                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**API proposta:**
```typescript
// POST /api/access-request
// Se email existe E is_active = false:
return {
  status: 'reactivation_available',
  message: 'Este email pertence a um usuario desligado. Deseja solicitar reativacao?',
  user_name: existingUser.full_name,
  deactivated_at: existingUser.deleted_at
};

// POST /api/approve-user (com reactivation = true)
// Reativa em vez de criar novo
```

---

### 2.5 Cenario: Turma deixa de existir

**Exemplo:** 9ºA formou-se em 2025, nao existe mais em 2026.

**Opcao A - Excluir (NAO RECOMENDADO):**
```sql
DELETE FROM classes WHERE id = '9a-2025';
-- CASCADE: Deleta TODOS os alunos e ocorrencias!
```

**Opcao B - Desligar (RECOMENDADO):**
```sql
UPDATE classes SET
  is_active = false,
  deleted_at = NOW()
WHERE id = '9a-2025';
```

**Resultado:**
- Turma nao aparece em "Turmas Ativas"
- Historico de ocorrencias da turma preservado
- Graficos de 2025 continuam funcionando

---

### 2.6 Cenario: Tipo de ocorrencia obsoleto

**Exemplo:** "Uso de Celular" nao e mais registrado (escola liberou uso).

**Solucao atual:**
```sql
UPDATE occurrence_types SET is_active = false WHERE category = 'Uso de Celular';
```

**Problema:** Nao tem `deleted_at` (inconsistente com outras tabelas).

**Melhoria proposta:**
```sql
ALTER TABLE occurrence_types ADD COLUMN deleted_at TIMESTAMPTZ;

UPDATE occurrence_types SET
  is_active = false,
  deleted_at = NOW()
WHERE category = 'Uso de Celular';
```

---

## 3. Virada de Ano Letivo

### 3.1 Problema

Ao iniciar 2026, a escola precisa:
- Manter historico de 2025 para consulta
- Comecar "do zero" com novas turmas
- Possivelmente reutilizar alunos que continuam na escola

### 3.2 Solucao: Sistema de Anos Letivos

```sql
-- Nova tabela para anos letivos
CREATE TABLE school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  name VARCHAR(50), -- "Ano Letivo 2025"
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar referencia em classes
ALTER TABLE classes ADD COLUMN school_year_id UUID REFERENCES school_years(id);

-- Adicionar referencia em students (matricula por ano)
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  class_id UUID REFERENCES classes(id),
  school_year_id UUID REFERENCES school_years(id),
  enrollment_date DATE,
  graduation_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, transferred, graduated, dropped
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Fluxo de Virada de Ano

```
┌─────────────────────────────────────────────────────────────┐
│                    VIRADA DE ANO LETIVO                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Admin acessa "Configuracoes > Virada de Ano"            │
│                         │                                   │
│                         ▼                                   │
│  2. Sistema mostra resumo:                                  │
│     ┌─────────────────────────────────────────────┐         │
│     │ Ano Atual: 2025                             │         │
│     │ Turmas: 12 ativas                           │         │
│     │ Alunos: 340 matriculados                    │         │
│     │ Ocorrencias: 1,234 registradas              │         │
│     └─────────────────────────────────────────────┘         │
│                         │                                   │
│                         ▼                                   │
│  3. Admin escolhe acao:                                     │
│     ┌─────────────────────────────────────────────┐         │
│     │ [ ] Arquivar 2025 (somente leitura)         │         │
│     │ [x] Criar turmas para 2026                  │         │
│     │ [x] Promover alunos automaticamente         │         │
│     │     (9ºA 2025 → 1ª Medio 2026)              │         │
│     │ [ ] Copiar tipos de ocorrencia              │         │
│     │ [ ] Copiar periodos (bimestres)             │         │
│     └─────────────────────────────────────────────┘         │
│                         │                                   │
│                         ▼                                   │
│  4. Sistema executa:                                        │
│     - Marca school_year 2025 como archived                  │
│     - Cria school_year 2026 como current                    │
│     - Cria turmas para 2026 baseadas em template            │
│     - Cria enrollments novos para alunos promovidos         │
│                         │                                   │
│                         ▼                                   │
│  5. Resultado:                                              │
│     - 2025: Somente leitura, visivel em Analytics           │
│     - 2026: Ativo, pronto para uso                          │
│     - Dados historicos: 100% preservados                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Analytics com Filtro de Ano

O dashboard ja tem filtro de ano. Com a nova estrutura:

```typescript
// Filtro no Analytics
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

// Query ajustada
const occurrences = await supabase
  .from('occurrences')
  .select(`
    *,
    student:students(
      full_name,
      enrollment:student_enrollments!inner(
        class:classes(name, education_level, school_year_id)
      )
    )
  `)
  .eq('student.enrollment.class.school_year_id', selectedYearId);
```

---

## 4. Proposta de Implementacao

### 4.1 Migrations Necessarias

#### Migration 1: Soft Delete Universal
```sql
-- 1. Adicionar deleted_at em tabelas que faltam
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

ALTER TABLE occurrence_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE user_institutions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_institutions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Adicionar class_id_at_occurrence para preservar turma historica
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS class_id_at_occurrence UUID REFERENCES classes(id);

-- 3. Trigger para popular class_id_at_occurrence automaticamente
CREATE OR REPLACE FUNCTION set_class_at_occurrence()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.class_id_at_occurrence IS NULL THEN
    SELECT class_id INTO NEW.class_id_at_occurrence
    FROM students WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_class_at_occurrence
BEFORE INSERT ON occurrences
FOR EACH ROW
EXECUTE FUNCTION set_class_at_occurrence();
```

#### Migration 2: Sistema de Anos Letivos
```sql
-- Tabela de anos letivos
CREATE TABLE IF NOT EXISTS school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  name VARCHAR(50),
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, year)
);

-- Adicionar referencia em classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES school_years(id);

-- Tabela de matriculas (enrollment)
CREATE TABLE IF NOT EXISTS student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, school_year_id)
);

-- RLS para school_years
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view school_years of their institution"
ON school_years FOR SELECT
USING (
  institution_id IN (
    SELECT institution_id FROM user_institutions
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### 4.2 Alteracoes de UI

#### Botao "Desligar" vs "Excluir"

```
┌─────────────────────────────────────────────────────────────┐
│  LISTA DE ALUNOS                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Nome          │ Turma │ Matricula │ Acoes                  │
│  ─────────────────────────────────────────────────────────  │
│  Ana Silva     │ 9ºA   │ 2025001   │ [Editar] [Desligar]    │
│  Bruno Santos  │ 9ºA   │ 2025002   │ [Editar] [Desligar]    │
│                                                             │
│  Nota: "Desligar" marca como inativo, preservando historico.│
│  Para excluir permanentemente, acesse a Lixeira.            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Toggle "Mostrar Inativos"

```
┌─────────────────────────────────────────────────────────────┐
│  PROFESSORES                                    [+ Adicionar]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filtros: [Todos] [Ativos] [ ] Mostrar desligados           │
│                                                             │
│  Nome              │ Email                 │ Status │ Acoes │
│  ────────────────────────────────────────────────────────── │
│  Maria Souza       │ maria@escola.com      │ Ativo  │ [Cfg] │
│  Joao Silva        │ joao@escola.com       │ Ativo  │ [Cfg] │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  Pedro Santos      │ pedro@escola.com      │ Deslig.│ [Reat]│
│  (desligado em 15/03/2025)                                  │
│                                                             │
│  Legenda: [Cfg] Configurar  [Reat] Reativar                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Fluxo de Reativacao

```typescript
// POST /api/access-request - Detectar usuario desligado
export async function POST(request: Request) {
  const { email, ...data } = await request.json();

  // Verificar se email ja existe
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, full_name, is_active, deleted_at')
    .eq('email', email)
    .single();

  if (existingUser) {
    if (!existingUser.is_active) {
      // Usuario desligado - oferecer reativacao
      return Response.json({
        status: 'reactivation_available',
        message: 'Este email pertence a um usuario desligado.',
        user_id: existingUser.id,
        user_name: existingUser.full_name,
        deactivated_at: existingUser.deleted_at
      }, { status: 409 });
    }
    // Usuario ativo - rejeitar
    return Response.json({
      error: 'Email ja cadastrado no sistema'
    }, { status: 400 });
  }

  // Continuar com criacao normal...
}
```

---

## 5. Resumo de Regras de Negocio

### 5.1 Alunos

| Acao | Comportamento | Impacto nos Graficos |
|------|---------------|----------------------|
| Transferir de turma | Atualiza `class_id`, mantém `class_id_at_occurrence` | Historico preservado por turma original |
| Desligar (sair da escola) | `is_active=false`, `deleted_at=NOW()` | Aparece em historico, nao em listas ativas |
| Excluir permanente | Apenas da Lixeira, CASCADE em ocorrencias | Perde historico (evitar!) |

### 5.2 Professores

| Acao | Comportamento | Impacto nos Graficos |
|------|---------------|----------------------|
| Desligar | `is_active=false`, `deleted_at=NOW()` | Ocorrencias mostram "(desligado)" |
| Reativar | `is_active=true`, `deleted_at=NULL` | Volta ao normal |
| Excluir permanente | `registered_by=NULL` nas ocorrencias | Perde autor (evitar!) |

### 5.3 Turmas

| Acao | Comportamento | Impacto nos Graficos |
|------|---------------|----------------------|
| Desligar (fim do ano) | `is_active=false`, `deleted_at=NOW()` | Aparece em filtros de anos anteriores |
| Excluir permanente | CASCADE em alunos e ocorrencias | Perde tudo (evitar!) |

### 5.4 Tipos de Ocorrencia

| Acao | Comportamento | Impacto nos Graficos |
|------|---------------|----------------------|
| Desativar | `is_active=false`, `deleted_at=NOW()` | Nao aparece para novos registros |
| Historico | Ocorrencias antigas mantem referencia | Graficos mostram categoria normalmente |

---

## 6. Checklist de Implementacao

### Fase 1: Migrations de Banco (Prioridade Alta)
- [ ] Adicionar `deleted_at` em `users`
- [ ] Adicionar `deleted_at` em `occurrence_types`
- [ ] Adicionar `is_active` e `deleted_at` em `user_institutions`
- [ ] Adicionar `class_id_at_occurrence` em `occurrences`
- [ ] Criar trigger `set_class_at_occurrence`
- [ ] Criar tabela `school_years`
- [ ] Criar tabela `student_enrollments`
- [ ] Adicionar `school_year_id` em `classes`

### Fase 2: APIs (Prioridade Alta)
- [ ] `PUT /api/users/[id]/deactivate` - Desligar usuario
- [ ] `PUT /api/users/[id]/reactivate` - Reativar usuario
- [ ] `PUT /api/students/[id]/deactivate` - Desligar aluno
- [ ] `PUT /api/classes/[id]/deactivate` - Desligar turma
- [ ] Modificar `POST /api/access-request` - Detectar reativacao
- [ ] `GET/POST /api/school-years` - CRUD anos letivos
- [ ] `POST /api/school-years/rollover` - Virada de ano

### Fase 3: UI (Prioridade Media)
- [ ] Botao "Desligar" em vez de "Excluir" (alunos, professores, turmas)
- [ ] Toggle "Mostrar inativos" em listas
- [ ] Indicador visual "(desligado)" em registros
- [ ] Modal de confirmacao de desligamento
- [ ] Pagina "Virada de Ano Letivo"
- [ ] Filtro de ano letivo no Analytics

### Fase 4: Testes E2E (Prioridade Alta)
- [ ] Teste: Desligar e reativar professor
- [ ] Teste: Transferir aluno entre turmas
- [ ] Teste: Graficos com dados de alunos desligados
- [ ] Teste: Reativacao via solicitacao de acesso
- [ ] Teste: Virada de ano letivo

---

## 7. Perguntas para Decisao do Admin

1. **Periodo de retencao:** Por quantos anos manter dados de alunos desligados?
   - Sugestao: 5 anos (requisito legal para documentos escolares)

2. **Exclusao permanente:** Permitir exclusao definitiva ou apenas desligamento?
   - Sugestao: Apenas master pode excluir permanentemente

3. **Virada de ano automatica:** Executar em data especifica ou manualmente?
   - Sugestao: Manualmente, com assistente guiado

4. **Reativacao de professores:** Requer nova aprovacao ou e automatica?
   - Sugestao: Requer aprovacao do admin (seguranca)

---

## 8. Diagrama de Estados

```
                    ALUNO / PROFESSOR / TURMA

                         ┌─────────┐
                         │  ATIVO  │
                         └────┬────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │ TRANSFERIDO│  │ DESLIGADO  │  │  FORMADO   │
       │ (turma)    │  │            │  │ (aluno)    │
       └────────────┘  └─────┬──────┘  └────────────┘
                             │
                             │ (Admin aprova)
                             ▼
                       ┌────────────┐
                       │ REATIVADO  │
                       │  (volta    │
                       │   ativo)   │
                       └────────────┘

       EXCLUIDO PERMANENTE
       (Apenas da Lixeira, irreversivel, perde historico)
```

---

## 9. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Migration quebra queries existentes | Media | Alto | Testar em branch de desenvolvimento primeiro |
| Performance com soft delete | Baixa | Medio | Indices em `is_active` e `deleted_at` |
| Dados orfaos na virada de ano | Media | Alto | Validacao antes de criar novo ano |
| Usuario reativado sem permissoes | Baixa | Medio | Restaurar `user_institutions` junto |

---

## 10. Conclusao

A implementacao de **soft delete universal** resolve todos os cenarios levantados:

1. **Transferencia de turma**: `class_id_at_occurrence` preserva historico
2. **Saida da escola**: Soft delete mantem dados para graficos
3. **Retorno de professor**: Reativacao preserva historico completo
4. **Turmas obsoletas**: Desligamento mantem dados do ano anterior
5. **Virada de ano**: Sistema de `school_years` separa dados por periodo
6. **Graficos integros**: Queries filtram apenas visualizacao, nao dados

**Principio fundamental:**
> "Nunca excluir dados que podem ser consultados no futuro. Desligar e sempre preferivel a deletar."

---

## Arquivos Relacionados

- `types/index.ts` - Tipos TypeScript das entidades
- `supabase-cascade-delete.sql` - Foreign keys atuais
- `app/admin/dashboard/page.tsx` - Graficos do Analytics
- `app/admin/alunos/page.tsx` - CRUD de alunos com soft delete
- `app/admin/turmas/page.tsx` - CRUD de turmas com lixeira

---

*Plano criado em 25/01/2026 - Focus Sistema de Gestao Escolar*
