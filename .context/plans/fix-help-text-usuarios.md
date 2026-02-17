---
status: ready
generated: 2026-02-02
---

# Atualizar texto de ajuda de "professores" para "usuarios"

## Objetivo

Atualizar o card de dicas na pagina `app/admin/professores/page.tsx` (linhas 624-633) para refletir que agora se adicionam usuarios de qualquer funcao, nao apenas professores.

## Mudancas (unico arquivo)

**Arquivo:** `app/admin/professores/page.tsx`

### Linha 624
- De: `Como adicionar professores?`
- Para: `Como adicionar usuários?`

### Linhas 626-627
- De: `Clique em "Adicionar Professor" e cadastre diretamente. O professor receberá um email com as credenciais de acesso.`
- Para: `Clique em "Adicionar Usuário" e cadastre diretamente. O usuário receberá um email com as credenciais de acesso.`

### Linhas 630-632
- De: `Professores podem solicitar acesso na tela de login, selecionando "Professor em instituição existente". O administrador master poderá aprovar a solicitação.`
- Para: `Usuários podem solicitar acesso na tela de login. O administrador poderá aprovar a solicitação.`
