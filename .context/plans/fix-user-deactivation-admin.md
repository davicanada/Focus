# Correcao: Admin nao consegue desativar usuarios

> Gerado em: 29/01/2026
> Escala: SMALL

## Problema
O admin nao consegue desativar nenhum usuario (professor, admin_viewer, outro admin) na pagina `/admin/professores`. O botao de desativar silenciosamente falha.

## Causa Raiz
`handleToggleStatus()` em `app/admin/professores/page.tsx:243` faz update direto via browser client:
```typescript
const supabase = createClient();
const { error } = await supabase
  .from('user_institutions')
  .update({ is_active: !teacher.is_active })
  .eq('id', teacher.id);
```

A RLS de `user_institutions` **nao tem policy de UPDATE para admins** — apenas masters tem `*` (all operations). O update retorna sem erro mas nao altera nada (0 rows affected).

## Solucao
Usar as APIs existentes que ja usam `createServiceClient()` (bypassa RLS):
- **Desativar**: `PUT /api/users/[id]/deactivate` — soft delete completo (users + user_institutions)
- **Reativar**: `PUT /api/users/[id]/reactivate` — restaura usuario e vinculos

### Arquivo a modificar

#### `app/admin/professores/page.tsx`
Substituir `handleToggleStatus()` por chamadas fetch:

```typescript
const handleToggleStatus = async (teacher: TeacherWithUser) => {
  try {
    const endpoint = teacher.is_active ? 'deactivate' : 'reactivate';
    const response = await fetch(`/api/users/${teacher.user_id}/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Desativado pelo admin' }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erro ao alterar status');
    }

    toast.success(teacher.is_active ? 'Usuário desativado' : 'Usuário reativado');
    loadTeachers(currentInstitution!.id);
  } catch (error: any) {
    console.error('Error toggling teacher status:', error);
    toast.error(error.message || 'Erro ao alterar status');
  }
};
```

### Impacto no card "Professores" da Visao Geral
A API `/api/users/[id]/deactivate` ja seta `is_active = false` em `user_institutions`. A query do dashboard admin (`app/admin/page.tsx`) ja filtra `.eq('is_active', true)` — entao o card de Professores refletira automaticamente a desativacao.

## Checklist
- [ ] Substituir `handleToggleStatus` para usar fetch nas APIs existentes
- [ ] Testar desativacao de professor
- [ ] Testar reativacao de professor
- [ ] Verificar que card "Professores" atualiza apos desativacao
- [ ] Build passando
