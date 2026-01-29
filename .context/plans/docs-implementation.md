---
type: plan
title: Implementação do Visualizador de Documentação Interna
summary: Implementar interface de visualização da documentação interna (.context/docs) dentro do painel administrativo do sistema.
status: proposed
authors:
  - Planner Agent
reviewers:
  - Technical Lead
approvers:
  - Project Manager
created_at: 2026-01-23
updated_at: 2026-01-23
---

# Plan: Implementação do Visualizador de Documentação Interna

## Goal & Scope
Este plano visa expor a documentação técnica localizada em `.context/docs` para usuários com permissão elevada (Master/Admin) diretamente através da interface web da aplicação.
Isso permitirá que administradores consultem glossários, regras de negócio e manuais sem precisar acessar o repositório de código.

### In Scope
- Criação de rota protegida `/admin/docs`.
- Leitura dos arquivos markdown na pasta `.context/docs`.
- Renderização segura de Markdown para HTML.
- Navegação entre documentos.
- Estilização usando o sistema de design existente (Tailwind).

### Out of Scope
- Edição de documentos pela interface web.
- Visualização de documentos de Agentes (`.context/agents`), apenas `docs/`.
- Integração com sistemas de documentação externos.

## Proposed Solution
A solução envolve o uso de **Next.js Server Components** para ler o sistema de arquivos local (no servidor) e passar o conteúdo para componentes de renderização.

**Componentes Chave:**
1. **`lib/docs.ts`**: Utilitário para ler arquivos do diretório `.context/docs`.
2. **`app/admin/docs/layout.tsx`**: Sidebar com lista de documentos disponíveis.
3. **`app/admin/docs/[slug]/page.tsx`**: Renderizador do conteúdo Markdown.

**Bibliotecas:**
- `fs/promises` (Node nativo) para leitura.
- `gray-matter` para parsing de frontmatter.
- `react-markdown` ou `markdown-to-jsx` para renderização.

## Detailed Phases

### Phase 1: Setup & Utilities (Backend)
Configuração da infraestrutura de leitura de arquivos.

**Steps:**
1. **Instalar dependências**: `npm install gray-matter react-markdown @tailwindcss/typography`.
2. **Criar utilitário de leitura**: `lib/docs.ts`.
   - Função `getDocsList()`: Retorna lista de arquivos com metadados.
   - Função `getDocContent(slug)`: Retorna conteúdo e frontmatter de um arquivo.
3. **Teste unitário**: Validar se consegue ler os arquivos de `.context/docs`.

### Phase 2: User Interface Implementation
Criação das páginas no Next.js App Router.

**Steps:**
1. **Criar Layout**: `app/admin/docs/layout.tsx`.
   - Implementar sidebar dinâmica listando os arquivos retornados por `getDocsList`.
2. **Criar Página de Índice**: `app/admin/docs/page.tsx`.
   - Mostrar dashboard simples com cards dos documentos disponíveis ("Project Overview", "Glossary", etc).
3. **Criar Visualizador**: `app/admin/docs/[slug]/page.tsx`.
   - Usar `react-markdown` para renderizar o corpo.
   - Aplicar classes `prose` (Tailwind Typography) para estilização automática.
4. **Proteção de Rota**: Garantir que apenas `role === 'master' | 'admin'` acessem.

### Phase 3: Integration & Polishing
Refinamento da experiência.

**Steps:**
1. **Renderização de Tabelas**: Estilizar tabelas HTML geradas pelo markdown.
2. **Links Internos**: Garantir que links entre documentos (`[Link](glossary.md)`) funcionem na navegação web.
3. **Mobile Responsive**: Ajustar layout para mobile (menu colapsável).

## Agent Assignments

- **Backend Specialist**: Phase 1 (Utilitários de FS, tratamento de erros de leitura).
- **Frontend Specialist**: Phase 2 & 3 (Layout, Typography, Responsividade).
- **Security Auditor**: Validar sanitização do Markdown e checagem de permissões na rota.

## Success Criteria
- [ ] Usuário Admin consegue navegar para `/admin/docs`.
- [ ] Lista lateral mostra todos os arquivos de `.context/docs` com títulos amigáveis (lidos do frontmatter).
- [ ] Clicar em um documento carrega o conteúdo instantaneamente.
- [ ] Formatação (Headers, Listas, Tabelas) é legível.
- [ ] Acesso negado para usuários não logados ou sem permissão.

## Documentation Touchpoints
- Atualizar `docs/project-overview.md` mencionando a nova seção administrativa.
- Adicionar `react-markdown` e `gray-matter` em `docs/tooling.md`.

## Rollback Plan
Se a leitura de arquivos causar falhas no build ou runtime (ex: Vercel não ter acesso a pastas fora de process.cwd em runtime serverless de forma trivial):
- **Backup Strategy**: Mover docs para `public/docs` ou usar um CMS headless se o sistema de arquivos local for bloqueado em produção (Vercel Serverless pode restringir leitura de arquivos arbitrários).
- **Trigger**: Erro 500 ao acessar `/admin/docs` em produção.
