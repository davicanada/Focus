---
status: active
generated: 2026-02-04
phases:
  - id: "phase-1"
    name: "Correções Críticas (Status + Relatórios)"
    prevc: "E"
  - id: "phase-2"
    name: "Tipos de Ação Customizáveis"
    prevc: "E"
  - id: "phase-3"
    name: "Testes Playwright"
    prevc: "V"
---

# Correções do Sistema de Devolutivas

> Corrigir problemas: tipos de ação customizáveis pelo admin, atualização de status, e erros nos relatórios PDF/Excel

## Problemas Identificados

### 1. Status Não Atualiza ao Adicionar Devolutiva
- **Arquivo**: `app/api/occurrences/[id]/feedbacks/route.ts`
- **Causa**: Usa `createClient()` que respeita RLS - não há política para admin/viewer atualizar `occurrences.status`
- **Linhas**: 149-154
- **Solução**: Usar `createServiceClient()` para o update de status

### 2. Tipos de Ação Fixos
- **Arquivo**: `lib/constants/feedback.ts`
- **Problema**: Tipos são hardcoded, admin não pode adicionar novos
- **Solução**: Criar tabela `feedback_action_types` + CRUD

### 3. Erros nos Relatórios PDF/Excel
- **Arquivos**: `app/admin/relatorios/devolutiva/page.tsx`, `app/viewer/relatorios/devolutiva/page.tsx`
- **Problema**: Falta try-catch e tratamento de dados null
- **Solução**: Adicionar tratamento de erros e validação

## Fase 1 — Correções Críticas

### 1.1 Corrigir Update de Status

**Arquivo**: `app/api/occurrences/[id]/feedbacks/route.ts`

Alterar importação:
```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server';
```

Alterar update (linhas 149-154):
```typescript
if (newStatus !== occurrence.status) {
  const serviceClient = createServiceClient();
  const { error: updateError } = await serviceClient
    .from('occurrences')
    .update({ status: newStatus })
    .eq('id', occurrenceId);

  if (updateError) {
    console.error('Erro ao atualizar status:', updateError);
  }
}
```

### 1.2 Corrigir Relatórios PDF/Excel

Envolver geradores em try-catch:
```typescript
const generateExcel = async () => {
  if (!reportData) return;
  try {
    // código existente...
  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    toast.dismiss();
    toast.error('Erro ao gerar Excel');
    throw error;
  }
};

const generatePDF = () => {
  if (!reportData) return;
  try {
    // código existente...
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    toast.dismiss();
    toast.error('Erro ao gerar PDF');
    throw error;
  }
};
```

## Fase 2 — Tipos de Ação Customizáveis (Admin)

### 2.1 Migration SQL
```sql
CREATE TABLE feedback_action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  icon VARCHAR(50) DEFAULT 'MoreHorizontal',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_feedback_action_types_institution ON feedback_action_types(institution_id);

ALTER TABLE feedback_action_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own institution feedback types"
ON feedback_action_types FOR SELECT
USING (institution_id IN (
  SELECT institution_id FROM user_institutions
  WHERE user_id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Admins can manage feedback types"
ON feedback_action_types FOR ALL
USING (institution_id IN (
  SELECT institution_id FROM user_institutions
  WHERE user_id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
));

-- Inserir tipos padrão para instituições existentes
INSERT INTO feedback_action_types (institution_id, name, label, icon, is_system, display_order)
SELECT i.id, 'student_talk', 'Conversa com aluno', 'MessageCircle', true, 1
FROM institutions i WHERE i.deleted_at IS NULL;
-- (repetir para cada tipo padrão)
```

### 2.2 APIs
- `GET/POST /api/feedback-action-types` - Listar e criar
- `PUT/DELETE /api/feedback-action-types/[id]` - Editar e excluir

### 2.3 UI Admin
- Adicionar seção em `/admin/configuracoes` ou criar `/admin/tipos-devolutiva`
- Tabela com tipos, botões editar/excluir
- Modal para adicionar novo tipo

### 2.4 Atualizar AddFeedbackModal
- Buscar tipos da API em vez de constantes
- Mostrar apenas tipos ativos

## Fase 3 — Testes Playwright

### Arquivo: `e2e/devolutiva-system.spec.ts`

**Testes**:
1. Admin pode ver página de ocorrências
2. Admin pode abrir modal de adicionar devolutiva
3. Admin pode registrar devolutiva com sucesso
4. Status muda de "pendente" para "em andamento"
5. Marcar "resolvida" atualiza status
6. Relatório PDF gera sem erros
7. Relatório Excel gera sem erros
8. Professor vê status atualizado em suas ocorrências

## Critérios de Sucesso

- [ ] Status atualiza automaticamente ao adicionar devolutiva
- [ ] "Marcar como resolvida" funciona
- [ ] PDF baixa sem erros
- [ ] Excel baixa sem erros
- [ ] Testes Playwright passam

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `app/api/occurrences/[id]/feedbacks/route.ts` | serviceClient para update |
| `app/admin/relatorios/devolutiva/page.tsx` | try-catch |
| `app/viewer/relatorios/devolutiva/page.tsx` | try-catch |
| `e2e/devolutiva-system.spec.ts` | Novo arquivo de testes |
