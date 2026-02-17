---
status: filled
generated: 2026-02-16
phases:
  - id: "phase-1"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-2"
    name: "Validacao"
    prevc: "V"
---

# CRUD de Subcategorias na Pagina de Tipos de Ocorrencias

> Adicionar card de gerenciamento de subcategorias (criar, editar, excluir) na mesma pagina /admin/tipos-ocorrencias, usando as APIs ja existentes.

## Escopo

**Arquivo unico a modificar:** `app/admin/tipos-ocorrencias/page.tsx`

**APIs ja prontas (nenhuma alteracao necessaria):**
- `GET /api/occurrence-subcategories?institution_id=X` - Lista padrao + customizadas
- `POST /api/occurrence-subcategories` - Criar customizada (body: name, institution_id)
- `PUT /api/occurrence-subcategories/[id]` - Editar customizada (body: name)
- `DELETE /api/occurrence-subcategories/[id]` - Soft delete customizada

## Plano de Implementacao

### Fase 1 - Implementacao (E)

**1. Novo estado para modal de subcategoria**
- `showSubModal: boolean` - controla abertura do modal
- `editingSubcategory: OccurrenceSubcategory | null` - null = criando, preenchido = editando
- `subFormData: { name: string }` - dados do formulario
- `savingSub: boolean` - loading do botao salvar

**2. Funcoes CRUD de subcategoria**
- `handleOpenSubModal(sub?)` - abre modal para criar/editar
- `handleSaveSub()` - chama POST ou PUT conforme editingSubcategory
- `handleDeleteSub(sub)` - confirm + DELETE, recarrega lista

**3. Card "Subcategorias" na UI**
Adicionar abaixo do card "Tipos Cadastrados":
- Header: titulo "Subcategorias" + descricao com contagem + botao "Nova Subcategoria"
- Tabela com colunas: Nome | Tipo (Padrao/Customizada) | Acoes
- Subcategorias padrao: badge "Padrao", botoes editar/excluir desabilitados
- Subcategorias customizadas: badge "Customizada", botoes editar/excluir habilitados

**4. Modal de criar/editar subcategoria**
- Campo: Nome (obrigatorio)
- Botoes: Cancelar + Salvar
- Titulo dinamico: "Nova Subcategoria" / "Editar Subcategoria"

### Fase 2 - Validacao (V)

1. Build sem erros
2. Testar criar subcategoria customizada
3. Testar editar subcategoria customizada
4. Testar excluir subcategoria customizada
5. Verificar que subcategorias padrao nao podem ser editadas/excluidas
6. Verificar que nova subcategoria aparece no dropdown do modal de tipo de ocorrencia

## Criterios de Sucesso
- Admin consegue criar, editar e excluir subcategorias customizadas
- Subcategorias padrao sao protegidas (somente leitura)
- Nova subcategoria aparece imediatamente no dropdown ao criar/editar tipo
- Build passando sem erros
