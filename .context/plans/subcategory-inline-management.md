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

# Subcategorias inline no modal de tipo + link Gerenciar

> Trocar card separado por criacao inline no dropdown do modal de tipo + link "Gerenciar subcategorias" para editar/excluir.

## Arquivo: `app/admin/tipos-ocorrencias/page.tsx`

### O que REMOVER
- Card "Subcategorias" inteiro (tabela + header + botao)
- Modal "Nova/Editar Subcategoria" separado
- States: `showSubModal`, `editingSubcategory`, `subFormData`, `savingSub`
- Funcoes: `handleOpenSubModal`, `handleSaveSub`, `handleDeleteSub`

### O que ADICIONAR

**1. Criacao inline no dropdown de subcategoria (modal de tipo)**
- State `creatingNewSub: boolean` e `newSubName: string`
- No dropdown existente, primeira opcao: `"+ Criar nova subcategoria"`
- Ao selecionar, `creatingNewSub = true` e aparece um input + botao "Criar" abaixo do dropdown
- Ao clicar "Criar": POST na API, recarrega subcategorias, seleciona a nova automaticamente no formData
- Ao clicar fora ou cancelar: esconde o input

**2. Link "Gerenciar subcategorias" abaixo do dropdown**
- Texto clicavel pequeno (`text-xs text-primary cursor-pointer`)
- Abre modal de gerenciamento (reutiliza `showSubModal`)
- Modal com tabela: Nome | Tipo (Padrao/Customizada) | Acoes (editar/excluir)
- Subcategorias padrao: botoes desabilitados
- Editar: input inline na propria tabela (click no nome torna editavel)
- Excluir: confirm + DELETE API

## Criterios de Sucesso
- Admin cria subcategoria sem sair do modal de tipo
- Nova subcategoria fica automaticamente selecionada
- Link "Gerenciar" permite editar/excluir customizadas
- Subcategorias padrao protegidas
- Build sem erros
