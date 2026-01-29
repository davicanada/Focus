# Plano: Adicionar Admin Viewer ao Fluxo de Solicitação de Acesso

## Status: CONCLUÍDO ✅

## Problema Identificado

Ao testar "Solicitar acesso" na landing page, só existiam 3 opções:
1. Professor em instituição existente
2. Administrador em instituição existente
3. Nova instituição + Administrador

**Faltava:** Opção para solicitar acesso como **Visualizador (Admin Viewer)**

## Arquivos Alterados

### 1. types/index.ts ✅
- [x] Adicionado `'admin_viewer'` ao tipo `AccessRequestType`

### 2. components/auth/AccessRequestModal.tsx ✅
- [x] Adicionada opção "Visualizador em instituição existente" no select
- [x] Incluído `admin_viewer` nas condições que carregam instituições existentes (linha 50)
- [x] Incluído `admin_viewer` na validação de instituição obrigatória (linha 179)
- [x] Incluído `admin_viewer` na condição de exibir select de instituição (linha 312)

### 3. app/api/approve-user/route.ts ✅
- [x] Atualizado mapeamento de role para incluir admin_viewer:
  ```typescript
  const role = accessRequest.request_type === 'professor'
    ? 'professor'
    : accessRequest.request_type === 'admin_viewer'
      ? 'admin_viewer'
      : 'admin';
  ```

### 4. app/api/approve-user/bulk/route.ts ✅
- [x] Mesmo ajuste de mapeamento de role

### 5. components/auth/LoginForm.tsx ✅
- [x] Adicionada verificação de admin_viewer role
- [x] Atualizada lógica de currentRole (admin > admin_viewer > professor)
- [x] Adicionado redirect para `/viewer`

### 6. app/page.tsx (Landing Page) ✅
- [x] Adicionado redirect para `/viewer` quando role é admin_viewer (ambos os lugares)

## Fluxo Completo do Admin Viewer

1. **Solicitação:** Usuário acessa landing page → "Solicitar acesso" → Seleciona "Visualizador em instituição existente" → Preenche dados → Seleciona instituição → Envia
2. **Aprovação:** Master/Admin aprova solicitação → Sistema cria usuário com role `admin_viewer`
3. **Login:** Usuário faz login → Sistema identifica role `admin_viewer` → Redireciona para `/viewer`
4. **Acesso:** Usuário tem acesso apenas às abas: Analytics, Relatórios, Alertas, Configurações

## Build

✅ Build passando com sucesso (apenas warnings, sem erros)
