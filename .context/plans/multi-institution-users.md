---
status: approved
generated: 2026-02-02
decision: Opção A — Multi-Instituição Nativa
---

# Suporte a Usuários Multi-Instituição

> Permitir que um mesmo usuário pertença a múltiplas instituições, com tela de seleção pós-login e possibilidade de ocultar instituições inativas.

## Decisão: Opção A — Multi-Instituição Nativa

O banco já suporta via `user_institutions` many-to-many. Mudanças são de lógica de aplicação.

## Fluxo de UX Aprovado

```
Login → Auth OK
  ├─ 1 vínculo acessível → Dashboard direto (zero mudança)
  ├─ 2+ vínculos acessíveis → Tela de seleção
  │     ├─ Card ativo → clica → Dashboard
  │     └─ Card inativo (não oculto) → mensagem + botão "Ocultar"
  └─ 0 vínculos acessíveis → "Nenhuma instituição ativa"

Vínculos acessíveis = ativos + inativos onde hidden_at IS NULL
Vínculos que contam pra "ir direto" = apenas ativos onde hidden_at IS NULL

Rodapé: "Mostrar X oculta(s)" → expande com botão "Mostrar novamente"
Sidebar: botão "Trocar instituição" (só se >1 ativa)
```

---

## Fases de Implementação

### Fase 1 — Migration: `hidden_at` + índice único

**Migration SQL:**
```sql
-- Coluna para ocultar instituição da tela de seleção
ALTER TABLE user_institutions ADD COLUMN IF NOT EXISTS hidden_at timestamptz DEFAULT NULL;

-- Índice único: previne duplicatas de vínculo ativo
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_institutions_active_unique
ON user_institutions(user_id, institution_id)
WHERE deleted_at IS NULL;
```

### Fase 2 — Backend: Permitir Vincular Usuário Existente

**Arquivos a modificar:**

1. **`app/api/access-request/route.ts`**
   - Remover rejeição por email duplicado (linhas 58-69)
   - Se email existe + vínculo ativo nesta instituição → rejeitar "Já vinculado"
   - Se email existe + sem vínculo → criar solicitação normalmente

2. **`app/api/approve-user/route.ts`**
   - Se usuário já existe no Auth → NÃO criar novo user, apenas `user_institutions`
   - Se não existe → fluxo atual (criar user + user_institutions)
   - Gerar senha temporária apenas para novos users

3. **`app/api/teachers/route.ts`** (cadastro direto)
   - Se user existe + vínculo ativo → erro 409
   - Se user existe sem vínculo → criar apenas `user_institutions`

### Fase 3 — Contexto de Instituição Ativa

**Arquivos novos:**

1. **`lib/institution-context.ts`**
   - `getActiveInstitutionId()` — lê de cookie `activeInstitutionId`
   - `setActiveInstitutionId(id)` — salva em cookie
   - `clearActiveInstitutionId()` — limpa cookie (logout/trocar)

2. **`app/api/user-institutions/route.ts`** (NOVO)
   - `GET` — retorna vínculos do usuário logado (com dados da instituição)
   - `PATCH` — atualiza `hidden_at` de um vínculo

### Fase 4 — Tela de Seleção de Instituição

**`app/select-institution/page.tsx`** (NOVA):
- Busca vínculos do usuário via API
- Cards de instituições ativas: clicáveis, nome, cidade, role
- Cards de instituições inativas (não ocultas): opacidade, mensagem, botão "Ocultar"
- Rodapé: "Mostrar X oculta(s)" → expande com "Mostrar novamente"
- Ao selecionar → `setActiveInstitutionId()` + redirect por role

### Fase 5 — Redirecionamento Pós-Login

**Modificar lógica de redirect em `app/login/page.tsx` e redirects existentes:**
- Após auth OK → buscar vínculos acessíveis (ativos + inativos não ocultos)
- Se 1 vínculo ativo acessível → setar cookie + ir direto pro dashboard
- Se 2+ → redirecionar para `/select-institution`
- Se 0 → tela de erro

### Fase 6 — Sidebar: Trocar Instituição

**Modificar `components/layout/Sidebar.tsx`:**
- Mostrar nome da instituição ativa
- Se >1 instituição ativa → botão "Trocar" (ArrowLeftRight)
- Clicou → limpa cookie + redireciona para `/select-institution`

### Fase 7 — Filtrar Dados por Instituição Ativa

Revisar todas as queries client-side que podem retornar dados de múltiplas instituições:
- `app/admin/page.tsx` — Dashboard
- `app/admin/dashboard/page.tsx` — Analytics
- `app/professor/ocorrencias/page.tsx` — Ocorrências
- `app/professor/registrar/page.tsx` — Registro
- Adicionar `.eq('institution_id', activeInstitutionId)` onde necessário

### Fase 8 — UI Admin: Desvincular em vez de Desativar

**Modificar `app/admin/professores/page.tsx`:**
- Botão "Desvincular" → soft-delete apenas do `user_institutions` desta instituição
- Se não tem mais nenhum vínculo ativo → user fica inativo automaticamente

---

## Critérios de Sucesso

- [ ] Mesmo email cadastrado em 2+ instituições
- [ ] Login com >1 instituição acessível mostra seletor
- [ ] Login com 1 instituição acessível vai direto (como hoje)
- [ ] Ocultar instituição inativa funciona e persiste
- [ ] "Mostrar ocultas" no rodapé funciona
- [ ] Dashboard mostra dados apenas da instituição selecionada
- [ ] Sidebar mostra botão trocar quando >1 ativa
- [ ] Desvincular preserva ocorrências históricas
- [ ] Build passando, zero erros TypeScript
