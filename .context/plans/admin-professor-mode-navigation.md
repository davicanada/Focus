---
status: concept
generated: 2026-02-07
---

# Modo Professor para Administrador - Navegacao Unificada

> Permitir que administradores registrem ocorrencias com a mesma experiencia do professor, especialmente no mobile

## Problema

O administrador atualmente nao consegue registrar ocorrencias de forma pratica, especialmente no mobile. O professor tem:
- **BottomNav** com 4 botoes: Inicio, Registrar, Minhas, Analytics
- **Sidebar** enxuta focada em ocorrencias

O admin tem:
- **Sidebar** extensa com 12+ itens de gestao
- **Sem BottomNav** no mobile
- Precisa navegar pelo menu hamburger para tudo

## Contexto Tecnico Atual

```
PROFESSOR (Mobile)
+------------------+
|    [TopBar]      |
|------------------|
|                  |
|    Conteudo      |
|                  |
|------------------|
| [Home][+][List][Chart] |  <- BottomNav (4 itens)
+------------------+

ADMIN (Mobile)
+------------------+
| [=] [TopBar]     |  <- Hamburger abre sidebar
|------------------|
|                  |
|    Conteudo      |
|                  |
|                  |
+------------------+   <- Sem BottomNav!
```

---

## OPCOES DE SOLUCAO

### Opcao 1: Toggle de Modo na Sidebar (RECOMENDADA)

**Conceito:** Um switch no topo da sidebar que alterna entre "Modo Admin" e "Modo Professor"

```
+------------------------+
|  [Admin v]  [Prof]     |  <- Toggle/Tabs
|------------------------|
| (conteudo muda)        |
+------------------------+
```

**Modo Admin (padrao):**
- Visao Geral, Turmas, Alunos, Usuarios...
- Menu completo de gestao

**Modo Professor:**
- Visao Geral
- Registrar Ocorrencia
- Minhas Ocorrencias
- Analytics

**Mobile:**
- BottomNav aparece quando em "Modo Professor"
- Desaparece quando volta para "Modo Admin"

**Vantagens:**
- UX clara - usuario sabe em qual "modo" esta
- Reutiliza 100% do codigo do professor
- BottomNav funciona igual ao professor
- Facil de implementar

**Desvantagens:**
- Precisa trocar de modo manualmente
- Pode ser confuso ter dois "modos"

---

### Opcao 2: Sidebar Hibrida com Secao Expansivel

**Conceito:** Adicionar uma secao "Ocorrencias" na sidebar do admin que expande

```
+------------------------+
| Visao Geral            |
| Turmas                 |
| Alunos                 |
|------------------------|
| v Ocorrencias          |  <- Clicavel, expande
|   + Registrar          |
|   + Minhas             |
|   + Todas              |
|------------------------|
| Analytics              |
| Relatorios             |
+------------------------+
```

**Mobile:**
- Adicionar BottomNav para admin tambem
- Botao central "+" para registrar ocorrencia

**Vantagens:**
- Nao precisa trocar de modo
- Tudo em um lugar
- Admin sempre tem acesso rapido

**Desvantagens:**
- Sidebar fica ainda mais longa
- No mobile, BottomNav com muitos itens fica ruim
- Mistura contextos (gestao + operacional)

---

### Opcao 3: BottomNav Contextual para Admin

**Conceito:** Admin ganha BottomNav proprio com acoes mais usadas

```
Admin BottomNav:
+----------------------------------+
| [Home] [+Ocorr] [Alertas] [Menu] |
+----------------------------------+
```

- **Home:** Dashboard admin
- **+Ocorr:** Registrar ocorrencia (direto)
- **Alertas:** Central de alertas (com badge)
- **Menu:** Abre sidebar completa

**Vantagens:**
- Acesso rapido as acoes principais
- Nao precisa de "modo"
- Mobile-first

**Desvantagens:**
- BottomNav diferente do professor (confuso se usuario tem ambos papeis)
- Menos espacos que o professor (4 vs 4, mas conteudo diferente)
- "Menu" e redundante com hamburger

---

### Opcao 4: FAB (Floating Action Button) para Registrar

**Conceito:** Botao flutuante no canto inferior direito sempre visivel

```
+------------------+
|    [TopBar]      |
|------------------|
|                  |
|    Conteudo      |
|              [+] |  <- FAB
|------------------|
```

- Clique simples: Abre modal de registro rapido
- Clique longo: Menu com opcoes (Registrar, Minhas, etc.)

**Vantagens:**
- Sempre acessivel
- Nao muda a estrutura atual
- Padrao mobile conhecido (Gmail, etc.)

**Desvantagens:**
- Pode cobrir conteudo importante
- Menos intuitivo que BottomNav
- Apenas uma acao principal

---

### Opcao 5: Rota Compartilhada /registrar

**Conceito:** Criar rota `/admin/registrar` que usa o mesmo componente do professor

```
/professor/registrar -> RegistrarOcorrencia.tsx
/admin/registrar     -> RegistrarOcorrencia.tsx (mesmo componente)
```

- Adicionar link "Registrar Ocorrencia" na sidebar do admin
- No mobile, adicionar ao BottomNav do admin

**Vantagens:**
- Simples de implementar
- Reutiliza codigo existente
- Sem mudanca de UX drastica

**Desvantagens:**
- Ainda precisa navegar pelo menu no mobile
- Nao resolve o problema do BottomNav

---

## RECOMENDACAO

### Opcao 1 + Opcao 5 Combinadas

**Implementacao sugerida:**

1. **Criar `/admin/registrar`** usando o mesmo componente do professor
2. **Criar `/admin/ocorrencias/minhas`** para "Minhas Ocorrencias" do admin
3. **Adicionar Toggle na Sidebar** para alternar visualizacao
4. **Mostrar BottomNav quando em Modo Professor**

```
FLUXO:
1. Admin abre app no mobile
2. Ve sidebar padrao (gestao)
3. Clica no toggle "Modo Professor"
4. Sidebar muda para itens do professor
5. BottomNav aparece na parte inferior
6. Admin registra ocorrencias normalmente
7. Pode voltar ao "Modo Admin" quando precisar
```

**Estado persistido:** `localStorage.adminMode = 'admin' | 'professor'`

---

## WIREFRAMES CONCEITUAIS

### Mobile - Modo Admin (padrao)
```
+----------------------+
| [=] Escola ABC   [!] |
|----------------------|
|                      |
|   Dashboard Admin    |
|   Cards de resumo    |
|                      |
|   Ultimas ocorrencias|
|                      |
+----------------------+
      (sem BottomNav)
```

### Mobile - Modo Professor
```
+----------------------+
| [=] Escola ABC   [!] |
|----------------------|
|                      |
|   Dashboard Prof     |
|   KPIs de ocorrencias|
|                      |
|   Acoes rapidas      |
|                      |
|----------------------|
|[Home][+][List][Chart]|
+----------------------+
```

### Sidebar - Toggle de Modo
```
+------------------------+
|   ESCOLA ABC           |
|   [Admin] [Professor]  |  <- Toggle
|------------------------|
|                        |
| (itens mudam conforme  |
|  modo selecionado)     |
|                        |
+------------------------+
```

---

## ARQUIVOS A MODIFICAR

| Arquivo | Mudanca |
|---------|---------|
| `components/layout/Sidebar.tsx` | Adicionar toggle de modo, logica condicional |
| `components/layout/BottomNav.tsx` | Aceitar prop `role` para mostrar para admin tambem |
| `components/layout/DashboardLayout.tsx` | Passar modo para BottomNav |
| `app/admin/registrar/page.tsx` | NOVO - reutiliza componente do professor |
| `app/admin/ocorrencias/minhas/page.tsx` | NOVO - minhas ocorrencias do admin |
| `lib/utils.ts` | Helper para persistir modo |

---

## PROXIMOS PASSOS

1. **Escolher opcao preferida** (ou combinacao)
2. **Validar UX** com mockup ou prototipo
3. **Implementar** em fases:
   - Fase 1: Rotas compartilhadas
   - Fase 2: Toggle de modo
   - Fase 3: BottomNav condicional
4. **Testar** em dispositivos mobile reais
