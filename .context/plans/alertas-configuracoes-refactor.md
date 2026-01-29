---
status: completed
generated: 2026-01-25
completed: 2026-01-25
agents:
  - type: "feature-developer"
    role: "Implementar mudancas nas paginas"
  - type: "backend-specialist"
    role: "Modificar APIs e tipos"
phases:
  - id: "phase-1"
    name: "Reorganizar Paginas"
    status: "completed"
  - id: "phase-2"
    name: "Melhorar Sistema de Alertas"
    status: "completed"
  - id: "phase-3"
    name: "Remover Redundancias"
    status: "completed"
---

# Refatoracao: Alertas e Configuracoes do Administrador

> Reorganizar as abas de Alertas e Configuracoes para separar funcionalidades e melhorar a UX do sistema de alertas

## Problema Atual

### 1. Confusao entre Alertas e Configuracoes
- **`/admin/alertas`**: Central de notificacoes (correto)
- **`/admin/configuracoes`**: Configuracao de REGRAS de alerta (deveria ser configs da conta)
- **`/settings`**: Pagina generica com configs de conta (existe mas admin nao acessa pelo menu)

### 2. Redundancia no notify_admin
- Em `/admin/tipos-ocorrencias` existe checkbox "Notificar administrador quando registrada"
- Isso e redundante com o sistema de alertas configuravel
- Nao especifica QUAL admin notificar

### 3. Problemas no Sistema de Alertas
- **Selecao de aluno**: Lista todos os alunos da instituicao sem filtrar por turma (alunos com mesmo nome ficam confusos)
- **Threshold obrigatorio**: Sempre precisa definir "X ocorrencias em Y dias"
- **Sem opcao de alerta imediato**: Ex: "me avise quando qualquer ocorrencia grave acontecer"
- **Sem configuracao de destinatario**: Nao da para escolher se envia email para si mesmo ou todos admins

## Solucao Proposta

### Fase 1: Reorganizar Paginas

#### 1.1 Renomear `/admin/configuracoes` para `/admin/regras-alerta`
- Mover logica de regras de alerta para nova URL
- Atualizar Sidebar para refletir novo nome: "Regras de Alerta"

#### 1.2 Criar nova `/admin/configuracoes` com configs de conta
- Usar como base a pagina `/settings` que ja existe
- Adicionar secoes:
  - Informacoes do Perfil (read-only)
  - Alterar Senha
  - Sessao (logout)
- Manter consistencia visual com outras paginas admin

#### 1.3 Atualizar Sidebar (`components/layout/Sidebar.tsx`)
```typescript
const adminNavItems: NavItem[] = [
  // ... outros itens
  { href: '/admin/alertas', label: 'Alertas', icon: Bell },
  { href: '/admin/regras-alerta', label: 'Regras de Alerta', icon: ShieldAlert },
  { href: '/admin/configuracoes', label: 'Configuracoes', icon: Settings },
];
```

### Fase 2: Melhorar Sistema de Alertas

#### 2.1 Selecao de Aluno com Filtro por Turma
**Problema**: Dois alunos de turmas diferentes podem ter o mesmo nome

**Solucao**: Quando scope_type = 'student':
1. Primeiro selecionar a turma (dropdown)
2. Depois selecionar o aluno (dropdown filtrado pela turma)
3. Mostrar nome da turma junto ao nome do aluno na lista de regras

**Modificacoes em `/admin/regras-alerta/page.tsx`**:
```typescript
// Novo state
const [selectedClassForStudent, setSelectedClassForStudent] = useState<string>('');

// Filtrar alunos pela turma selecionada
const filteredStudents = selectedClassForStudent
  ? students.filter(s => s.class_id === selectedClassForStudent)
  : [];

// UI: mostrar dropdown de turma antes do dropdown de aluno
{formData.scope_type === 'student' && (
  <>
    <div className="space-y-2">
      <Label>Turma do Aluno *</Label>
      <Select
        value={selectedClassForStudent}
        onChange={(e) => {
          setSelectedClassForStudent(e.target.value);
          setFormData({ ...formData, scope_student_id: undefined });
        }}
      >
        <option value="">Selecione a turma...</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
    </div>
    <div className="space-y-2">
      <Label>Aluno *</Label>
      <Select
        value={formData.scope_student_id || ''}
        onChange={(e) => setFormData({ ...formData, scope_student_id: e.target.value })}
        disabled={!selectedClassForStudent}
      >
        <option value="">Selecione um aluno...</option>
        {filteredStudents.map((s) => (
          <option key={s.id} value={s.id}>{s.full_name}</option>
        ))}
      </Select>
    </div>
  </>
)}
```

#### 2.2 Threshold Opcional (Alerta Imediato)
**Problema**: Usuario quer ser alertado quando UMA ocorrencia grave acontecer, sem precisar de "3 em 30 dias"

**Solucao**: Adicionar checkbox "Alertar imediatamente (sem acumular)"
- Se marcado: `threshold_count = 1` e `threshold_period_days = null` (ou 0)
- Se nao marcado: mostrar campos de quantidade e periodo

**Modificacoes no tipo `AlertRule`** (`types/index.ts`):
```typescript
export interface AlertRule {
  // ...
  is_immediate: boolean; // NOVO: true = alerta na primeira ocorrencia
  threshold_count: number; // Se is_immediate=true, sempre 1
  threshold_period_days: number | null; // null = sem periodo (imediato)
}
```

**Modificacoes no banco de dados** (migration):
```sql
ALTER TABLE alert_rules ADD COLUMN is_immediate BOOLEAN DEFAULT FALSE;
ALTER TABLE alert_rules ALTER COLUMN threshold_period_days DROP NOT NULL;
```

**UI para alerta imediato**:
```typescript
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="is_immediate"
    checked={formData.is_immediate}
    onChange={(e) => setFormData({
      ...formData,
      is_immediate: e.target.checked,
      threshold_count: e.target.checked ? 1 : 3,
      threshold_period_days: e.target.checked ? null : 30,
    })}
  />
  <Label htmlFor="is_immediate">
    Alertar imediatamente (cada ocorrencia gera um alerta)
  </Label>
</div>

{!formData.is_immediate && (
  <div className="grid grid-cols-2 gap-4">
    {/* Campos de threshold_count e threshold_period_days */}
  </div>
)}
```

#### 2.3 Configuracao de Destinatario do Email
**Problema**: Nao da para escolher quem recebe o email do alerta

**Solucao**: Adicionar campo `notify_target` com opcoes:
- `self`: Apenas o admin que criou a regra
- `all_admins`: Todos os administradores da instituicao

**Modificacoes no tipo**:
```typescript
export type AlertNotifyTarget = 'self' | 'all_admins';

export interface AlertRule {
  // ...
  notify_target: AlertNotifyTarget;
}
```

**Migration**:
```sql
ALTER TABLE alert_rules ADD COLUMN notify_target VARCHAR(20) DEFAULT 'self';
```

**UI**:
```typescript
<div className="space-y-2">
  <Label>Enviar alerta por email para *</Label>
  <Select
    value={formData.notify_target}
    onChange={(e) => setFormData({ ...formData, notify_target: e.target.value })}
  >
    <option value="self">Apenas para mim</option>
    <option value="all_admins">Todos os administradores</option>
  </Select>
</div>
```

**Modificacoes na funcao `evaluateAlertRules`** (`lib/alerts/evaluateAlertRules.ts`):
- Quando `notify_target = 'self'`: buscar email do `created_by`
- Quando `notify_target = 'all_admins'`: buscar emails de todos admins da instituicao

### Fase 3: Remover Redundancias

#### 3.1 Remover `notify_admin` de Tipos de Ocorrencia
**Motivo**: Redundante com o sistema de alertas configuravel

**Modificacoes**:
1. Remover coluna do banco (migration):
```sql
ALTER TABLE occurrence_types DROP COLUMN notify_admin;
```

2. Atualizar tipo TypeScript (`types/index.ts`):
```typescript
export interface OccurrenceType {
  id: string;
  institution_id: string;
  category: string;
  severity: 'leve' | 'media' | 'grave';
  description?: string;
  // REMOVIDO: notify_admin: boolean;
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}
```

3. Atualizar pagina de tipos de ocorrencia (`app/admin/tipos-ocorrencias/page.tsx`):
   - Remover checkbox "Notificar administrador"
   - Remover coluna "Notificar" da tabela
   - Remover `notify_admin` do formData e handleSave

## Arquivos a Modificar

### Novos Arquivos
- `app/admin/regras-alerta/page.tsx` (copiar de configuracoes e renomear)

### Arquivos Modificados
1. `app/admin/configuracoes/page.tsx` - Reescrever para configs de conta
2. `components/layout/Sidebar.tsx` - Atualizar menu
3. `app/admin/tipos-ocorrencias/page.tsx` - Remover notify_admin
4. `types/index.ts` - Atualizar tipos
5. `lib/alerts/evaluateAlertRules.ts` - Adicionar logica de notify_target
6. `app/api/alert-rules/route.ts` - Novos campos
7. `app/api/alert-rules/[id]/route.ts` - Novos campos

### Migrations SQL
1. `add_is_immediate_to_alert_rules.sql`
2. `add_notify_target_to_alert_rules.sql`
3. `remove_notify_admin_from_occurrence_types.sql`

## Exemplos de Uso Apos Refatoracao

### Exemplo 1: "Me alerte quando uma ocorrencia grave acontecer em toda a escola"
```
Nome: Ocorrencias Graves - Toda Escola
Escopo: Toda a instituicao
Tipo: Severidade especifica -> Grave
Alertar imediatamente: [x] Sim
Enviar para: Apenas para mim
```

### Exemplo 2: "Me alerte quando o aluno Pedro Silva da 1B nao fizer dever 3 vezes"
```
Nome: Dever de casa - Pedro Silva
Escopo: Aluno especifico
  Turma: 1B
  Aluno: Pedro Silva
Tipo: Tipo especifico -> Falta de dever de casa
Alertar imediatamente: [ ] Nao
Quantidade: 3 ocorrencias
Periodo: 30 dias
Enviar para: Todos os administradores
```

## Ordem de Implementacao

1. **Migrations SQL** (via MCP Supabase)
   - Adicionar `is_immediate` e `notify_target` em alert_rules
   - Remover `notify_admin` de occurrence_types

2. **Atualizar tipos TypeScript**
   - AlertRule, AlertRuleFormData, OccurrenceType

3. **Criar `/admin/regras-alerta`**
   - Mover codigo atual de configuracoes
   - Implementar selecao de turma antes de aluno
   - Implementar checkbox "alertar imediatamente"
   - Implementar select de destinatario

4. **Reescrever `/admin/configuracoes`**
   - Baseado em `/settings`, com layout admin

5. **Atualizar Sidebar**
   - Novo item "Regras de Alerta"

6. **Atualizar `/admin/tipos-ocorrencias`**
   - Remover notify_admin

7. **Atualizar `evaluateAlertRules`**
   - Logica para is_immediate
   - Logica para notify_target

8. **Testes E2E** (opcional)
   - Testar novo fluxo de criacao de regras
   - Testar alertas imediatos
