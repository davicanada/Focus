---
status: ready
generated: 2026-01-30
---

# Professor pode excluir proprias ocorrencias em ate 48 horas

## Objetivo
Permitir que professores facao soft delete de ocorrencias que registraram, desde que dentro de 48h da criacao (`created_at`). Apos esse prazo, o botao de excluir desaparece.

## Estado atual do banco
- `occurrences.deleted_at` (timestamptz) — ja existe
- `occurrences.deleted_by` (uuid) — ja existe
- `occurrences.created_at` (timestamptz) — ja existe
- `occurrences.registered_by` (uuid) — ja existe
- RLS UPDATE: `Professors can update own occurrences` (registered_by = auth.uid())
- RLS DELETE: **nenhuma policy** — precisa criar

## Solucao

### 1. API Route: `DELETE /api/occurrences/[id]`
- Verifica autenticacao
- Verifica ownership: `registered_by === auth.uid()`
- Verifica janela de 48h: `now() - created_at <= 48 horas`
- Faz soft delete: `UPDATE occurrences SET deleted_at = now(), deleted_by = user.id WHERE id = :id`
- Usa `createServiceClient()` para bypassa RLS (a validacao e feita no codigo)

### 2. UI: Botao Excluir na pagina de ocorrencias do professor
- `app/professor/ocorrencias/page.tsx`
- Icone `Trash2` ao lado do `Pencil` (editar)
- Visivel SOMENTE se `created_at` esta dentro de 48h
- Modal de confirmacao: "Tem certeza que deseja excluir esta ocorrencia?"
- Toast de sucesso/erro apos exclusao
- Recarrega lista apos excluir

### 3. Helper: calcular se esta dentro da janela
```typescript
const isWithin48h = (createdAt: string) => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) <= 48 * 60 * 60 * 1000;
};
```

## Arquivos a modificar/criar

| Arquivo | Mudanca |
|---------|---------|
| `app/api/occurrences/[id]/route.ts` | Adicionar handler DELETE |
| `app/professor/ocorrencias/page.tsx` | Botao excluir + modal confirmacao |

## Regras de negocio
- Somente o professor que registrou pode excluir
- Prazo maximo: 48 horas apos `created_at`
- Soft delete (preserva dados para auditoria)
- `deleted_by` registra quem excluiu
- Apos exclusao, ocorrencia nao aparece mais em dashboards, relatorios ou alertas (ja filtrados por `deleted_at IS NULL`)

## Validacao
1. Professor exclui ocorrencia recente (< 48h) → sucesso
2. Professor tenta excluir ocorrencia antiga (> 48h) → botao nao aparece, API retorna 403
3. Professor tenta excluir ocorrencia de outro professor → API retorna 403
4. Ocorrencia excluida nao aparece nos dashboards/relatorios
