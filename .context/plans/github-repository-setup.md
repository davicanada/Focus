# GitHub Repository Setup - Focus

> Gerado em: 29/01/2026
> Escala: SMALL

## Objetivo
Criar repositório GitHub público com README em inglês, .gitignore atualizado, e configurar MCP GitHub para commits automáticos.

## Arquivos a EXCLUIR (adicionar ao .gitignore)

### Artefatos de teste
- `playwright-report/`
- `test-results/`

### Scripts de desenvolvimento
- `test-gemini-key.mjs`
- `list-models.mjs`

### Artefatos do Windows/ferramentas
- `nul` (artefato Windows)
- `.mcp.json` (config local MCP)

### Screenshots/imagens avulsas
- `New-Analytics-Tab.png`
- `posicao_correta_logo.png`

### AI context (opcional - manter para referência)
- `.claude/` — specs de agentes AI
- `.context/` — planos, workflows, docs gerados

## Arquivos a MANTER

### Código-fonte
- `app/` — todas as páginas e APIs
- `components/` — componentes React
- `lib/` — utilitários, AI, email, Supabase
- `types/` — tipos TypeScript
- `e2e/` — testes E2E Playwright
- `emails/` — templates de email
- `docs/` — manuais do usuário

### Configuração
- `package.json`, `package-lock.json`
- `next.config.mjs`
- `tailwind.config.ts`, `postcss.config.mjs`
- `tsconfig.json`
- `.eslintrc.json`
- `playwright.config.ts`
- `.env.local.example` (template sem credenciais)
- `CLAUDE.md`, `AGENTS.md` (referência de desenvolvimento)

### Assets
- `app/icon.svg` — favicon
- `app/globals.css` — estilos globais

## Arquivo .env.local.example — atualizar
Adicionar variáveis faltantes:
- `GMAIL_USER`
- `GMAIL_APP_PASS`
- `DATABASE_URL`

## README.md — reescrever em inglês
Conteúdo:
1. Project title + description
2. Tech stack
3. Features list
4. Screenshots (opcional)
5. Getting started (prerequisites, install, env setup, run)
6. Database setup (Supabase)
7. Testing (Playwright)
8. Project structure
9. License

## Checklist
- [ ] Atualizar .gitignore
- [ ] Atualizar .env.local.example
- [ ] Reescrever README.md em inglês
- [ ] git add + commit
- [ ] Criar repo no GitHub
- [ ] git push
