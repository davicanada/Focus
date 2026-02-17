# Deploy Focus na Vercel para producao

> Gerado em: 29/01/2026
> Escala: MEDIUM

## Objetivo
Fazer deploy do Focus na Vercel com todas as variaveis de ambiente configuradas, endpoints de setup protegidos, e app funcional em producao.

## Compatibilidade
O projeto ja e 100% compativel com Vercel:
- Next.js 14 App Router (framework nativo da Vercel)
- 43 API routes viram serverless functions automaticamente
- Nodemailer, Gemini SDK, Groq SDK funcionam em serverless
- Nenhuma dependencia nativa (nao precisa de Docker)
- `next.config.mjs` sem configuracoes incompativeis

## Vercel MCP
A Vercel tem um MCP oficial hospedado em `https://mcp.vercel.com`. Para conectar:
```bash
claude mcp add --transport http vercel https://mcp.vercel.com
```
Porem o MCP da Vercel e **somente leitura** (consultar deployments, logs, docs). Para criar projetos e configurar env vars, usamos a **Vercel CLI** ou o **Dashboard**.

## Fase 1 — Preparacao do Codigo

### 1.1 Proteger endpoints de setup
Os seguintes endpoints sao de desenvolvimento e nao devem ser acessiveis em producao sem autenticacao:
- `POST /api/setup` — setup inicial
- `POST /api/setup/seed` — popular dados de teste
- `POST /api/setup/clean` — limpar dados
- `POST /api/setup/cleanup-e2e` — limpar testes E2E
- `POST /api/setup/fix-role-constraint` — corrigir constraints
- `POST /api/setup/migrate-*` — migrations
- `POST /api/test-email` — email de teste

**Solucao**: Adicionar verificacao de master em cada endpoint, ou bloquear em producao:
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
}
```

### 1.2 Atualizar NEXT_PUBLIC_APP_URL
8 arquivos usam `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`.
O fallback localhost so funciona em dev. Em producao, a variavel DEVE estar definida.
Nao precisa mudar codigo — apenas configurar a variavel na Vercel.

## Fase 2 — Deploy na Vercel

### 2.1 Conectar repositorio
1. Acessar https://vercel.com/new
2. Importar repositorio `davicanada/Focus` do GitHub
3. Framework preset: Next.js (auto-detectado)
4. Root directory: `.` (padrao)

### 2.2 Configurar variaveis de ambiente
**Publicas (disponiveis no browser):**
| Variavel | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase |
| `NEXT_PUBLIC_APP_URL` | `https://focus-xxx.vercel.app` (ou dominio custom) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Key do Google Maps (Places API) |

**Secretas (server-side only):**
| Variavel | Valor |
|----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase |
| `DATABASE_URL` | Connection string PostgreSQL |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GROQ_API_KEY` | Groq Console key |
| `GMAIL_USER` | Email Gmail |
| `GMAIL_APP_PASS` | App password do Gmail |

**Total: 10 variaveis (4 publicas + 6 secretas)**

### 2.3 Fazer deploy
- Clicar "Deploy"
- Build leva ~2-3 minutos
- Vercel gera URL automatica: `focus-xxx.vercel.app`

### 2.4 (Opcional) Dominio customizado
- Settings > Domains > Adicionar dominio
- Configurar DNS (CNAME ou A record) no registrador

## Fase 3 — Validacao pos-deploy

### 3.1 Testes manuais
- [ ] Login master: `davialmeida1996@gmail.com`
- [ ] Login admin: `admin@escolaexemplo.com`
- [ ] Login professor: `prof.maria@escolaexemplo.com`
- [ ] Dashboard admin: cards com dados corretos
- [ ] Dashboard professor: registrar ocorrencia
- [ ] Analytics: graficos carregando
- [ ] AI Chat: perguntar "quantos alunos temos?"
- [ ] Relatorios: exportar PDF e Excel
- [ ] Email: enviar teste via `/api/test-email`
- [ ] Solicitacao de acesso: modal abre, dropdown de instituicoes funciona

### 3.2 Verificar serverless functions
- Vercel Dashboard > Functions > verificar execucoes
- Monitorar timeouts (Hobby: 10s max, Pro: 60s)
- AI Analytics pode precisar do plano Pro se queries forem lentas

### 3.3 Seguranca pos-deploy
- [ ] Endpoints de setup bloqueados em producao
- [ ] CORS correto (Vercel gerencia automaticamente)
- [ ] Headers de seguranca (Vercel adiciona automaticamente)
- [ ] Supabase RLS ativo (ja configurado)

## Riscos

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| AI Analytics timeout (>10s no Hobby) | Medio | Upgrade para Pro ou otimizar prompts |
| Gmail rate limit (500/dia) | Baixo | Suficiente para MVP, migrar para Resend/SendGrid se crescer |
| Variavel de ambiente esquecida | Alto | Checklist de 10 variaveis acima |
| Endpoints de setup expostos | Critico | Bloquear em producao antes do deploy |

## Alternativa: Vercel CLI (sem Dashboard)

Se quiser fazer tudo via terminal:
```bash
npm i -g vercel
vercel login
vercel --prod
```
A CLI pede as env vars interativamente ou usa `vercel env add`.

## Checklist final
- [ ] Endpoints de setup protegidos
- [ ] Build passando localmente
- [ ] Repositorio atualizado no GitHub
- [ ] Vercel conectada ao repo
- [ ] 10 variaveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] Testes manuais passando
- [ ] URL final funcionando
