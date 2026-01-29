# Investigação: Sistema de Mudança de Roles

## Status: IMPLEMENTADO ✅

## Resumo Executivo

O sistema Focus agora possui mecanismo completo para alteração de roles com as seguintes características:

### Implementação Realizada (26/01/2026)

1. **API `PUT /api/users/[id]/role`**
   - Valida autenticação e permissões (admin da instituição ou master)
   - Constraint: Não permite remover último admin da instituição
   - Registra mudanças em `system_logs`

2. **UI na página `/admin/professores`** (renomeada para "Usuários")
   - Lista todos os usuários da instituição (não apenas professores)
   - Coluna "Função" com badge colorido
   - Botão para alterar função com modal de confirmação
   - Warnings visuais para mudanças sensíveis

3. **Regras de Negócio**
   - Admin pode alterar roles de usuários da sua instituição
   - Master pode alterar roles de qualquer usuário
   - Mínimo de 1 admin por instituição é garantido
   - Todas as mudanças são auditadas

---

## Análise Original (mantida para referência)

---

## 1. ESTADO ATUAL

### Armazenamento de Roles

```
users (tabela)
├── id: UUID
├── is_master: boolean (flag global - não por instituição)
└── ...

user_institutions (tabela)
├── user_id: UUID
├── institution_id: UUID
├── role: 'admin' | 'professor' | 'admin_viewer'
├── is_active: boolean
└── deleted_at: timestamp
```

### Capacidades Atuais

| Funcionalidade | Implementado? |
|----------------|---------------|
| Atribuição inicial de role | ✅ Sim (via approve-user) |
| Múltiplos roles por usuário | ✅ Sim (instituições diferentes) |
| Múltiplos roles na mesma instituição | ❌ Não |
| **Alteração de role** | ❌ NÃO EXISTE |
| Desativação de usuário | ✅ Sim |
| Reativação de usuário | ✅ Sim |
| Audit log de mudanças | ❌ Parcial |

---

## 2. VULNERABILIDADES IDENTIFICADAS

### CRÍTICA: Verificação de Role é Client-Side

```typescript
// CÓDIGO VULNERÁVEL - app/admin/professores/page.tsx
const role = getFromStorage('currentRole', null);
if (role !== 'admin') {
  router.push('/');
  return;
}
// PROBLEMA: localStorage pode ser manipulado pelo usuário!
```

**Mitigação existente:** APIs backend verificam role do banco de dados:
```typescript
// CÓDIGO SEGURO - app/api/users/[id]/deactivate/route.ts
const { data: userInstitution } = await supabase
  .from('user_institutions')
  .select('role')
  .eq('user_id', user.id)
  .single();

const isAdmin = userInstitution?.role === 'admin';
if (!isAdmin && !isMaster) {
  return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
}
```

### MÉDIA: Sem API para Mudança de Role

Atualmente, para mudar role de um usuário:
1. Acessar Supabase Dashboard manualmente
2. Editar `user_institutions.role` direto no banco
3. **Sem registro de auditoria**
4. **Sem validação de regras de negócio**

### BAIXA: Dados Órfãos Após Mudança

Quando professor vira admin_viewer:
- Ocorrências registradas permanecem com `registered_by = professor_id`
- Sistema continua funcionando (joins com users funcionam)
- **Porém:** Professor não pode mais editar as próprias ocorrências (RLS bloqueia)

---

## 3. DEPENDÊNCIAS DE DADOS POR ROLE

### Tabela: occurrences
```typescript
{
  registered_by: UUID,        // Professor que registrou
  class_id_at_occurrence: UUID,  // Turma na época (histórico)
  deleted_by: UUID?,          // Quem deletou (soft delete)
}
```

**Impacto de mudança professor → admin_viewer:**
- ✅ Ocorrências existentes: Preservadas
- ✅ Relatórios: Mostram "Registrado por: [Nome]"
- ❌ Edição: Professor perde acesso às próprias ocorrências
- ✅ Analytics: Dados continuam visíveis

### Tabela: alert_rules
```typescript
{
  created_by: UUID,           // Quem criou a regra
  scope_type: 'student' | 'class' | 'institution',
}
```

**Impacto de mudança admin → professor:**
- ⚠️ Regras existentes: Continuam funcionando
- ⚠️ Professor não pode criar novas (feature de admin)
- ✅ Dados preservados

### Tabela: alert_notifications
```typescript
{
  alert_rule_id: UUID,        // Regra que disparou
  user_id: UUID,              // Para quem foi a notificação
}
```

**Impacto:** Notificações são enviadas independente do role.

---

## 4. CENÁRIOS DE MUDANÇA DE ROLE

### Cenário A: Professor → Admin Viewer

**Motivação:** Professor promovido para cargo de gestão (coordenador)

| Antes | Depois |
|-------|--------|
| Registra ocorrências | Não registra |
| Edita próprias ocorrências | Perde acesso de edição |
| Não vê analytics | Vê analytics completo |
| Não cria alertas | Pode criar alertas |

**Riscos:**
1. Ocorrências em aberto podem ficar sem responsável para editar
2. Professor pode ter esquecido de completar descrição de ocorrência

**Recomendação:** Validar se há ocorrências recentes (< 7 dias) antes de mudar role.

### Cenário B: Professor → Admin

**Motivação:** Professor assumindo gestão completa da escola

**Riscos:**
1. Baixo - Admin tem superset de permissões de professor
2. Pode criar/editar tudo na instituição

**Recomendação:** Apenas verificar se é a intenção correta.

### Cenário C: Admin → Professor (Rebaixamento)

**Motivação:** Ex-coordenador voltando a dar aulas

**Riscos:**
1. ALTO - Admin pode ter criado regras de alerta
2. ALTO - Admin pode ter aprovado solicitações
3. MÉDIO - Pode ter acessado dados sensíveis de outros professores

**Recomendação:**
- Transferir ownership de alert_rules para outro admin
- Registrar em log quem era admin e quando perdeu acesso

### Cenário D: Admin → Admin Viewer

**Motivação:** Afastamento temporário, licença, cargo de supervisão externa

**Riscos:**
1. BAIXO - Viewer é subset de Admin
2. Perde capacidade de CRUD (turmas, alunos, tipos, etc.)

**Recomendação:** Validar se há operações pendentes (alunos sem turma, etc.)

### Cenário E: Admin Viewer → Professor

**Motivação:** Viewer assumindo sala de aula

**Riscos:**
1. MÉDIO - Perde acesso a analytics
2. MÉDIO - Perde acesso a alertas criados por ele

**Recomendação:** Transferir alert_rules para outro admin/viewer.

---

## 5. PROPOSTA DE IMPLEMENTAÇÃO SEGURA

### 5.1 Nova API: PUT /api/users/[id]/role

```typescript
// app/api/users/[id]/role/route.ts
interface RoleChangeRequest {
  institution_id: string;
  new_role: 'admin' | 'professor' | 'admin_viewer';
  reason?: string;  // Motivo da mudança (auditoria)
}

// Validações:
// 1. Solicitante deve ser admin da mesma instituição ou master
// 2. Não pode mudar próprio role (evitar auto-promoção)
// 3. Não pode rebaixar último admin da instituição
// 4. Deve ter justificativa se rebaixamento (admin → professor)
```

### 5.2 Validações de Pré-Mudança

```typescript
async function validateRoleChange(
  userId: string,
  oldRole: UserRole,
  newRole: UserRole,
  institutionId: string
): Promise<{ valid: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  // 1. Verificar ocorrências recentes (professor → viewer/admin)
  if (oldRole === 'professor') {
    const recentOccurrences = await getRecentOccurrences(userId, 7);
    if (recentOccurrences.length > 0) {
      warnings.push(`Usuário tem ${recentOccurrences.length} ocorrências nos últimos 7 dias`);
    }
  }

  // 2. Verificar alert_rules (admin/viewer → professor)
  if ((oldRole === 'admin' || oldRole === 'admin_viewer') && newRole === 'professor') {
    const alertRules = await getAlertRules(userId, institutionId);
    if (alertRules.length > 0) {
      warnings.push(`Usuário tem ${alertRules.length} regras de alerta que ficarão órfãs`);
    }
  }

  // 3. Verificar se é último admin
  if (oldRole === 'admin' && newRole !== 'admin') {
    const adminCount = await countAdmins(institutionId);
    if (adminCount === 1) {
      return { valid: false, warnings: ['Não pode remover o único administrador'] };
    }
  }

  return { valid: true, warnings };
}
```

### 5.3 Registro de Auditoria

```typescript
// Adicionar à tabela system_logs
await supabase.from('system_logs').insert({
  user_id: changedById,          // Quem fez a mudança
  institution_id: institutionId,
  action: 'role_change',
  entity_type: 'user_institution',
  entity_id: userInstitutionId,
  details: {
    target_user_id: targetUserId,
    old_role: oldRole,
    new_role: newRole,
    reason: reason,
    warnings_accepted: warnings,
    timestamp: new Date().toISOString(),
  },
});
```

### 5.4 UI de Mudança de Role

**Localização:** `/admin/professores/page.tsx` e `/master/page.tsx`

```tsx
// Novo componente: RoleChangeModal
<Modal title="Alterar Função do Usuário">
  <div>
    <Label>Função Atual</Label>
    <Badge>{currentRole}</Badge>
  </div>

  <div>
    <Label>Nova Função</Label>
    <Select value={newRole} onChange={setNewRole}>
      <option value="professor">Professor</option>
      <option value="admin_viewer">Visualizador</option>
      <option value="admin">Administrador</option>
    </Select>
  </div>

  {warnings.length > 0 && (
    <Alert variant="warning">
      <ul>
        {warnings.map(w => <li key={w}>{w}</li>)}
      </ul>
    </Alert>
  )}

  {newRole !== currentRole && currentRole === 'admin' && (
    <Input
      label="Motivo da alteração (obrigatório)"
      required
      value={reason}
      onChange={setReason}
    />
  )}

  <ModalFooter>
    <Button variant="outline" onClick={onClose}>Cancelar</Button>
    <Button onClick={handleSave} disabled={!isValid}>
      Confirmar Alteração
    </Button>
  </ModalFooter>
</Modal>
```

---

## 6. MATRIZ DE TRANSIÇÃO DE ROLES

```
            PARA →
DE ↓         professor    admin_viewer    admin
─────────────────────────────────────────────────
professor      N/A          ✅ OK         ✅ OK
admin_viewer   ⚠️ Warn      N/A           ✅ OK
admin          ⚠️ Warn      ✅ OK         N/A
```

**Legenda:**
- ✅ OK: Transição segura, sem validações especiais
- ⚠️ Warn: Requer validação de dados dependentes + motivo

---

## 7. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Backend (Prioridade Alta)
- [ ] Criar `PUT /api/users/[id]/role/route.ts`
- [ ] Implementar validações de pré-mudança
- [ ] Adicionar registro em system_logs
- [ ] Criar testes E2E para mudança de role

### Fase 2: Frontend (Prioridade Alta)
- [ ] Criar componente `RoleChangeModal`
- [ ] Adicionar botão "Alterar Função" em `/admin/professores`
- [ ] Adicionar botão "Alterar Função" em `/master` (lista de usuários)
- [ ] Exibir warnings antes de confirmar

### Fase 3: Governança (Prioridade Média)
- [ ] Criar view de histórico de mudanças de role
- [ ] Implementar notificação por email ao usuário afetado
- [ ] Criar relatório de acessos por role/período

### Fase 4: Segurança (Prioridade Alta)
- [ ] Revisar todas as páginas que usam `getFromStorage('currentRole')`
- [ ] Adicionar middleware de verificação de role no server
- [ ] Implementar rate limiting na API de mudança de role

---

## 8. DECISÕES PENDENTES

1. **Transferência de alert_rules:** Ao rebaixar admin, o que fazer com suas regras?
   - Opção A: Transferir para outro admin automaticamente
   - Opção B: Desativar regras (deleted_at)
   - Opção C: Manter ativas mas sem owner

2. **Notificação ao usuário:** Avisar por email quando role muda?
   - Opção A: Sempre notificar
   - Opção B: Apenas rebaixamentos
   - Opção C: Configurável por instituição

3. **Período de carência:** Após rebaixamento, manter acesso por X dias?
   - Opção A: Imediato (atual)
   - Opção B: 24h de carência
   - Opção C: Configurável

---

## 9. CONCLUSÃO

O sistema está **seguro para operação atual** onde roles não mudam. Para suportar mudanças de role de forma segura:

1. **Implementar API** com validações rigorosas
2. **Registrar auditoria** completa de todas as mudanças
3. **Exibir warnings** antes de confirmar mudanças críticas
4. **Notificar usuários** afetados por mudanças

A implementação proposta garante:
- ✅ Integridade de dados (nada é perdido)
- ✅ Rastreabilidade (tudo é logado)
- ✅ Governança (warnings e justificativas)
- ✅ Segurança (validações server-side)
