# Focus - Sistema de Gestão Escolar

## Resumo do Projeto
Sistema multi-tenant de gestão escolar para instituições brasileiras, com rastreamento de ocorrências disciplinares, pedagógicas e administrativas.

## Stack Tecnológica
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Charts:** Apache ECharts (echarts-for-react)
- **Export:** ExcelJS + jsPDF
- **Icons:** Lucide React
- **AI:** Gemini 3 Flash (primario) + Groq llama-3.3-70b (fallback)

## Credenciais de Teste
- **Master:** davialmeida1996@gmail.com / Focus@123
- **Admin:** admin@escolaexemplo.com / Focus@123
- **Professores:** prof.maria@escolaexemplo.com, prof.joao@escolaexemplo.com, prof.ana@escolaexemplo.com (todos Focus@123)

## Estrutura de Pastas Importantes
```
gestao-escolar/
├── app/
│   ├── admin/          # Painel do administrador
│   ├── master/         # Painel master (super admin)
│   ├── professor/      # Painel do professor
│   └── api/setup/      # APIs de setup, seed, reset-password
├── components/
│   ├── ui/             # Componentes base (Button, Input, Modal, etc.)
│   └── layout/         # DashboardLayout, Sidebar, TopBar
├── lib/
│   ├── constants/      # education.ts (níveis de ensino brasileiros)
│   ├── supabase/       # client.ts, server.ts
│   └── utils.ts        # Funções utilitárias
└── types/index.ts      # Tipos TypeScript
```

## Arquivos SQL Pendentes para Executar no Supabase
1. `supabase-fix-rls-circular.sql` - Corrige políticas RLS (JÁ EXECUTADO)
2. `supabase-add-shift-column.sql` - Adiciona coluna 'shift' na tabela classes (JÁ EXECUTADO)
3. `supabase-migration-address.sql` - Adiciona campos de endereço às tabelas institutions e access_requests (JÁ EXECUTADO)
4. `supabase-migration-soft-delete-universal.sql` - Soft delete universal + class_id_at_occurrence (JÁ EXECUTADO 25/01/2026)
5. `supabase-migration-school-years.sql` - Sistema de anos letivos e matrículas (JÁ EXECUTADO 25/01/2026)

## Funcionalidades Implementadas
- [x] Autenticação com Supabase Auth
- [x] Sistema de roles (master, admin, professor)
- [x] CRUD de turmas com geração automática de nome
- [x] CRUD de alunos com import/export Excel
- [x] CRUD de tipos de ocorrência (nome + severidade)
- [x] Dashboard com gráficos interativos (cross-filtering tipo Power BI)
- [x] Registro de ocorrências (com data e hora, seleção de alunos por checkbox)
- [x] Edição de ocorrências pelo professor (apenas próprias, com data e hora)
- [x] Google Places API para endereços
- [x] Validação de telefone brasileiro
- [x] AI Analytics - Chat com IA para perguntas em português sobre dados

## Padrões do Projeto
- Soft delete com `deleted_at` e `is_active`
- Multi-tenant via `institution_id`
- RLS (Row Level Security) no Supabase
- Função `is_current_user_master()` para verificar master sem loop RLS

## Acesso Direto ao Banco de Dados

Para executar migrations SQL diretamente (CREATE, ALTER, DROP, etc.) sem precisar do Supabase Dashboard:

```javascript
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
await client.connect();
await client.query('SQL AQUI');
await client.end();
```

A variável `DATABASE_URL` está configurada em `.env.local` e dá acesso total ao PostgreSQL do Supabase.

**Uso recomendado:**
- Migrations de schema (CREATE TABLE, ALTER TABLE, ADD CONSTRAINT)
- Correções de dados em massa (UPDATE, DELETE com condições complexas)
- Verificação de constraints e índices

**Nota:** Para queries normais de leitura/escrita, continue usando o Supabase client (`createClient` ou `createServiceClient`).

## Níveis de Ensino (lib/constants/education.ts)
- Educação Infantil: Creche, Pré-escola (sem turmas A/B/C)
- Ensino Fundamental: 1º ao 9º ano (com turmas A-H)
- Ensino Médio: 1ª à 4ª série (com turmas A-H)
- Turnos: Matutino, Vespertino, Noturno, Integral

## Última Sessão (22/01/2026)
- Corrigido truncamento do nome da instituição no sidebar
- Refatorado formulário de turmas (auto-gera nome)
- Adicionado template Excel para importação de alunos
- Implementado cross-filtering nos gráficos do dashboard
- Build passando com sucesso

## Sessão Atual (23/01/2026)
- Verificada estrutura da pasta .context (inicializada com docs, agents, plans)
- Executada migration `add_address_fields` no Supabase
- Comparada estrutura de tabelas do banco com tipos TypeScript
- Todas as tabelas agora correspondem aos tipos definidos no código
- Criado plano detalhado para cadastro de professores (`.context/plans/cadastro-professores.md`)
- Implementado CRUD de professores:
  - API `POST /api/teachers` - Cadastro direto pelo admin
  - API `PUT /api/teachers/[id]` - Edição de professor
  - Componente `TeacherModal` para cadastro/edição
  - Botão "Adicionar Professor" na página de professores
  - Botão de editar em cada linha da tabela
  - Envio de email de boas-vindas ao aprovar solicitação
- Simplificado formulário de cadastro de alunos para MVP:
  - Campos mantidos: Nome, Matrícula, Turma
  - Campos removidos: Data de Nascimento, Dados do Responsável, Observações
  - Template Excel simplificado (apenas Nome e Matrícula)
  - Tabela sem coluna "Responsável"
- Gerado dados de teste realistas para 2025 (~439 ocorrencias distribuidas ao longo do ano)
- Correção de coesão do sistema de ocorrências:
  - Removida categoria 'positiva' (sistema agora foca apenas em ocorrências disciplinares)
  - Deletadas 132 ocorrências e 2 tipos positivos do banco
  - Adicionados 8 novos tipos de ocorrência realistas (Uso de Celular, Conversa Durante Aula, etc.)
- Simplificação do modelo de ocorrências:
  - Removida coluna `name` da tabela `occurrence_types`
  - Coluna `category` agora armazena diretamente o tipo (Atraso, Briga, etc.) em vez de meta-classificação
  - Modelo simplificado: `category` (tipo) + `severity` (leve/media/grave)
  - Migrations aplicadas: removeu constraint, copiou name para category, removeu coluna name
  - Atualizados todos os arquivos TypeScript para usar `category` em vez de `name`
- Otimizacao de Performance:
  - Singleton pattern no Supabase client (`lib/supabase/client.ts`)
  - Promise.all() para queries paralelas no Admin Dashboard (7 queries)
  - Promise.all() para queries paralelas no Professor Dashboard (4 queries)
  - Auth check nao-bloqueante na pagina de login
  - Testes Playwright otimizados (34s -> 4.2s)
- Implementado AI Analytics com Gemini:
  - Instalado SDK `@google/generative-ai`
  - Servico `lib/ai/gemini.ts` para conversao de perguntas em SQL
  - API Route `POST /api/ai-analytics`
  - Componente de chat `components/analytics/AIChat.tsx`
  - Funcao SQL `execute_ai_query` no Supabase (com word boundaries para validacao)
  - Integrado na pagina Analytics do admin
- Atualizado AI Analytics para Gemini 3 Flash:
  - Modelo: `gemini-3-flash-preview`
  - API key inicializada em runtime (nao em build time)
  - Validacao SQL com word boundaries para evitar falsos positivos (ex: deleted_at)
  - Funcao Supabase remove ponto-e-virgula trailing
- Corrigido bugs do AI Analytics e implementado seguranca:
  - Funcao `extractSQL()` para extrair SELECT de respostas com texto extra
  - Protecao de dados pessoais (LGPD): colunas bloqueadas (guardian_phone, birth_date, email, etc.)
  - Prompt melhorado com exemplos das queries mais comuns
  - Respostas em linguagem natural profissional (estilo analista de dados)
  - Schema simplificado sem colunas sensiveis
  - Plano detalhado em `.context/plans/ai-analytics-security-ux.md`
- Implementado fallback Gemini -> Groq:
  - SDK Groq instalado (`groq-sdk`)
  - Modulo `lib/ai/` com estrutura modular:
    - `shared.ts` - Constantes e utilitarios compartilhados
    - `gemini.ts` - Provider Gemini 3 Flash (primario)
    - `groq.ts` - Provider Groq llama-3.3-70b-versatile (fallback)
    - `index.ts` - Orquestracao com fallback automatico
  - Fallback automatico quando Gemini atinge rate limit
  - Resposta natural para perguntas sobre dados sensiveis (LGPD)
  - Keywords sensiveis: telefone, email, nascimento, endereco, cpf, rg, senha
  - Plano detalhado em `.context/plans/ai-analytics-groq-fallback.md`
- Variaveis de ambiente necessarias:
  - `GEMINI_API_KEY` - Google AI Studio (primario)
  - `GROQ_API_KEY` - Groq Console (fallback)
- Testes E2E do AI Analytics (`e2e/ai-analytics.spec.ts`):
  - ✅ Todos os 7 testes passando
  - ✅ Bloqueio de dados sensiveis (4/4)
  - ✅ Queries normais com Groq
  - ✅ Queries complexas com JOINs
  - Plano de testes em `.context/plans/ai-analytics-e2e-tests.md`
- Melhorias no Dashboard de Analytics:
  - Grafico de Tendencia Mensal: Trocado de linha para barras
  - Grafico de Turmas: Ordenado alfabeticamente com cores gradiente
    - Vermelho (#EF4444) para turma com mais ocorrencias
    - Verde (#10B981) para turma com menos ocorrencias
  - Nova tabela "Alunos sem Ocorrencias" no periodo filtrado
  - Cross-filtering completo entre TODOS os graficos (category, severity, month, classId, studentId)
  - Plano detalhado em `.context/plans/analytics-dashboard-improvements.md`
- Testes de validacao da AI (`e2e/ai-validation.spec.ts`):
  - Compara respostas da AI com dados reais do banco
  - Verifica contagens, ordenacao e agregacoes
- Correcao de queries CTE na AI Analytics:
  - Funcao SQL `execute_ai_query` agora aceita `WITH%` (CTEs) alem de `SELECT%`
  - `lib/ai/shared.ts` - extractSQL e validateSQL corrigidos para CTEs
  - `components/analytics/AIChat.tsx` - Removido SQL e tabela da UI (apenas texto natural)
  - `lib/ai/index.ts` - stripMarkdown remove `**` das explicacoes (texto limpo)
- Correcao de explicacoes incompletas:
  - `EXPLANATION_PROMPT` agora envia ate 50 registros (antes 10)
  - Instrucoes adicionais para mencionar TODOS os grupos em queries de ranking
  - Exemplo de resposta para queries "top N por grupo"
  - Plano detalhado em `.context/plans/fix-ai-cte-queries.md`
- Testes E2E para fluxo de aprovacao de contas (`e2e/account-approval.spec.ts`):
  - 8 testes cobrindo todo o fluxo de solicitacao e aprovacao
  - Testa solicitacao de professor, admin_existing, admin_new
  - Testa duplicatas e rejeicao com motivo
  - Verifica criacao de usuario no Supabase Auth
  - Verifica login apos aprovacao
  - Verifica criacao de nova instituicao (admin_new)
  - Verifica email de boas-vindas (logado no console)
  - Plano detalhado em `.context/plans/account-approval-e2e-tests.md`
- Status dos emails:
  - Supabase Auth: `email_confirm: true` (auto-confirma, sem email)
  - Resend: Codigo preparado mas em modo mock (logando no console)
  - Para ativar Resend: descomentar codigo em `lib/email/sendVerificationEmail.ts`
- Build passando com sucesso

## Sessao Atual (24/01/2026)
- Validacao do fluxo de confirmacao de usuarios e instituicoes:
  - Plano detalhado em `.context/plans/validacao-fluxo-usuarios.md`
  - Verificado Supabase Auth funcionando (logs confirmam login e criacao de usuarios)
  - Verificado Resend em modo sandbox (403 - precisa dominio verificado para producao)
  - Emails sendo logados no console em desenvolvimento
- Testes E2E expandidos (`e2e/account-approval.spec.ts`):
  - 8 testes originais + 9 novos testes = 17 testes passando
  - T1: Validacao de campos obrigatorios (4 testes)
    - POST sem email, sem nome, sem request_type, com email vazio
  - T3: Testes de seguranca (5 testes)
    - Aprovar request inexistente, ja processada
    - Aprovar sem request_id, sem reviewer_id
    - Aprovar com action invalida
- Componentes validados:
  - `/api/access-request` - Criacao de solicitacoes
  - `/api/approve-user` - Aprovacao/rejeicao de usuarios
  - Supabase Auth `admin.createUser()` com `email_confirm: true`
  - Rollback automatico em caso de falha apos criar usuario Auth
- Build passando com sucesso (apenas warnings, sem erros)
- Migracao de Resend para Nodemailer + Gmail SMTP:
  - Removido pacote `resend`, instalado `nodemailer` + `@types/nodemailer`
  - Refatorado `lib/email/sendVerificationEmail.ts` para usar Gmail SMTP
  - Configuracao: smtp.gmail.com, porta 465, secure: true
  - Variaveis de ambiente: `GMAIL_USER` e `GMAIL_APP_PASS`
  - API de teste: `POST /api/test-email`
  - Testes E2E (`e2e/email-nodemailer.spec.ts`): 5/5 passando
  - Email de teste enviado com sucesso para davialmeida1996@gmail.com
- Design profissional de emails:
  - Header gradiente azul com logo Focus (HTML/CSS puro - compativel com Gmail)
  - Templates para: welcome, access-request, occurrence, test
  - Componentes: emailWrapper, focusLogoTable, emailButton, infoBox, credentialBox
  - Footer com copyright e ano dinamico
- Correcao bug 500 no Access Request (admin_new):
  - Causa raiz: campo `institution_state` recebia nome completo do estado (ex: "Sao Paulo")
  - Coluna no banco e `character(2)` - so aceita 2 caracteres
  - Correcao: `AccessRequestModal.tsx` linha 195 - usar `addressData.stateCode` em vez de `addressData.state`
  - Plano detalhado em `.context/plans/fix-access-request-state-field.md`
  - Todos os 3 fluxos funcionando: admin_new, admin_existing, professor
  - Testes E2E: 17/17 passando (account-approval) + 5/5 passando (email)
- Correções de acentos portugueses em todo o código:
  - 150+ correções em 15 arquivos
  - Grupos: Admin pages, Professor pages, Home/Master, APIs
  - Exemplos: instituição, solicitação, usuário, ocorrência, descrição
- Design Mobile Responsivo implementado:
  - Plano detalhado em `.context/plans/mobile-responsive-design.md`
  - **DashboardLayout.tsx**: State `sidebarOpen`, padding responsivo (`pl-0 md:pl-64`, `p-4 md:p-6`)
  - **Sidebar.tsx**: Overlay mobile com backdrop, fecha ao clicar em link
  - **TopBar.tsx**: Botão hamburger (Menu icon) visível apenas em mobile (md:hidden)
  - **professor/ocorrencias/page.tsx**: Tabela com scroll horizontal (`overflow-x-auto`)
  - **playwright.config.ts**: Projeto mobile com viewport 375x667
  - Testes E2E (`e2e/mobile-responsive.spec.ts`): 3 passando, 4 skipped (login)
  - Breakpoint principal: md (768px) separa mobile/desktop
- Correção CASCADE DELETE e botão "Aprovar Todos":
  - Plano detalhado em `.context/plans/master-admin-crud-improvements.md`
  - **Migration CASCADE DELETE** (`supabase-cascade-delete.sql`): aplicada via MCP
    - `user_institutions`, `classes`, `students` → CASCADE
    - `occurrence_types`, `occurrences`, `quarters` → CASCADE
    - `access_requests`, `system_logs` → SET NULL (preservar histórico)
  - **API Bulk Approve** (`app/api/approve-user/bulk/route.ts`):
    - Aprova múltiplas solicitações de uma vez (limite: 50)
    - Retorna contagem de sucesso/falha e senhas temporárias
  - **Master page melhorada** (`app/master/page.tsx`):
    - Botão "Aprovar Todos" com modal de confirmação
    - Modal de exclusão de instituição com confirmação por digitação do nome
    - Lista dados que serão excluídos (turmas, alunos, ocorrências, etc.)
    - Ícones: CheckCheck, AlertTriangle importados do Lucide
- Correção do Select de Instituições em Solicitações de Acesso:
  - Plano detalhado em `.context/plans/fix-institution-select.md`
  - **Problema:** RLS bloqueava leitura de instituições para usuários não autenticados
  - **API Pública** (`app/api/institutions/public/route.ts`):
    - GET endpoint que usa `createServiceClient()` para bypassa RLS
    - Retorna apenas campos públicos: id, name, city, state_code
    - Filtra apenas instituições ativas
  - **AccessRequestModal.tsx atualizado**:
    - Usa fetch('/api/institutions/public') em vez de Supabase client direto
    - Tratamento de erro com botão "Tentar novamente"
    - Mensagem quando nenhuma instituição cadastrada
  - **Testes E2E** (`e2e/institution-select.spec.ts`): 10/10 passando
    - API retorna instituições ordenadas por nome
    - Modal abre e exibe dropdown com instituições
    - Solicitação professor em instituição existente
    - Solicitação admin em instituição existente
    - Fluxo admin_new (nova instituição)
    - Validação de campo obrigatório
- Build passando com sucesso
- Correção do erro 500 no cadastro de novas contas:
  - **Causa raiz**: Testes E2E usavam `institution_id` hardcoded que foi deletado do banco
  - **Erro Postgres**: `23503` (foreign_key_violation) - ID não existe na tabela institutions
  - **Solução**: Buscar `institution_id` dinamicamente via API `/api/institutions/public`
  - **Arquivos modificados**:
    - `e2e/account-approval.spec.ts` - Adicionada `getTestInstitutionId()`
    - `e2e/ai-analytics.spec.ts` - Removido ID hardcoded
    - `e2e/ai-validation.spec.ts` - Removido ID hardcoded
  - **Testes E2E**: 34/34 passando
  - **Plano detalhado**: `.context/plans/fix-access-request-500.md`
- Implementado fluxo de notificacoes por email ao criar solicitacoes de acesso:
  - **Nova funcao** `sendRequestConfirmationEmail()` em `lib/email/sendVerificationEmail.ts`
  - **Fluxo completo**:
    1. Usuario faz solicitacao → salva no banco
    2. Email de confirmacao enviado ao solicitante ("Sua solicitacao foi recebida")
    3. Email de notificacao enviado aos revisores:
       - Se professor/admin_existing: admins da instituicao + master
       - Se admin_new: apenas master
  - **Arquivos modificados**:
    - `lib/email/sendVerificationEmail.ts` - Nova funcao de confirmacao
    - `app/api/access-request/route.ts` - Integracao de envio de emails
  - **Plano detalhado**: `.context/plans/email-notification-flow.md`
- Ampliação do Design Mobile Responsivo (overflow-x-auto em todas as tabelas):
  - **master/page.tsx**: 3 tabelas (Usuários, Instituições, Logs) com `overflow-x-auto`
  - **admin/alunos/page.tsx**: Tabela com scroll horizontal + header responsivo (`flex-col sm:flex-row`)
  - **admin/turmas/page.tsx**: 2 tabelas (Ativas e Lixeira) com `overflow-x-auto`
  - **admin/professores/page.tsx**: 2 tabelas (Solicitações e Professores) com `overflow-x-auto`
  - **admin/tipos-ocorrencias/page.tsx**: Tabela com scroll horizontal
  - **admin/trimestres/page.tsx**: Tabela com scroll horizontal
  - Testes Playwright mobile: 3/3 passando (4 skipped por requerem login autenticado)
  - Build passando com sucesso

## Sessao Atual (25/01/2026)
- Edição de Ocorrências pelo Professor:
  - **Plano detalhado**: `.context/plans/professor-edit-occurrences.md`
  - **RLS Policy**: `Professors can update own occurrences` (migration via MCP)
    - USING: `registered_by = auth.uid()`
    - WITH CHECK: `registered_by = auth.uid()`
  - **API Route**: `PUT /api/occurrences/[id]/route.ts`
    - Valida autenticação, ownership (registered_by === user), tipo válido
    - Retorna 401/403/404 apropriadamente
  - **UI**: `app/professor/ocorrencias/page.tsx`
    - Botão Pencil ao lado do Eye (visualizar)
    - Modal de edição com campos: Tipo, Data, Descrição
    - Aluno exibido como read-only (não editável)
    - Toast de sucesso/erro, recarrega lista após salvar
  - **Campos editáveis**: occurrence_type_id, occurrence_date, description
  - **Campo NÃO editável**: student_id (evita confusão no histórico)
- Adição de Hora nas Ocorrências:
  - **Plano detalhado**: `.context/plans/professor-occurrence-time.md`
  - **Banco de dados**: Coluna `occurrence_date` já era `timestamp with time zone` - sem migration
  - **Registro** (`app/professor/registrar/page.tsx`):
    - Novo state `occurrenceTime` com valor padrão = hora atual
    - Grid com inputs Data e Hora lado a lado
    - Combina ao salvar: `${date}T${time}:00`
  - **Edição** (`app/professor/ocorrencias/page.tsx`):
    - Novo campo `occurrence_time` no editForm
    - Extrai hora do timestamp existente ao abrir modal
    - Grid com inputs Data e Hora lado a lado no modal
  - **Formato**: HH:mm (24 horas, padrão brasileiro)
  - **Compatibilidade**: Ocorrências antigas continuam funcionando (hora = 00:00)
- Melhoria na Seleção de Alunos ao Registrar Ocorrências:
  - **Plano detalhado**: `.context/plans/student-selection-improvement.md`
  - **Antes**: Campo de busca textual para encontrar alunos
  - **Depois**: Grid de checkboxes mostrando todos os alunos da turma
  - **Arquivos modificados**:
    - `app/professor/registrar/page.tsx` - Nova UI com checkboxes
    - `components/ui/checkbox.tsx` - Corrigido bug do ícone Check
  - **Removidos**: state `searchTerm`, input de busca, dropdown filtrado
  - **Responsividade**:
    - Mobile (< 640px): 1 coluna de checkboxes
    - Desktop (>= 640px): 2 colunas de checkboxes
    - Scroll interno com `max-h-64` para não empurrar formulário
  - **UX melhorada**: Visão geral da turma, seleção direta sem digitar
- Correção: Listagem de Instituições no Painel Master:
  - **Plano detalhado**: `.context/plans/fix-master-institutions-list.md`
  - **Problema**: RLS bloqueava leitura de instituições pelo master (lista vazia)
  - **Causa raiz**: `loadInstitutions` usava `createClient()` que respeita RLS
  - **Solução**: Nova API `GET /api/institutions/admin` com `createServiceClient()`
  - **Segurança**:
    - Verifica autenticação (401 se não logado)
    - Verifica `is_master` (403 se não for master)
    - Usa serviceClient para bypassa RLS
  - **Arquivos**:
    - `app/api/institutions/admin/route.ts` - Nova API protegida
    - `app/master/page.tsx` - Usa fetch em vez de client direto
- Melhorias nos Gráficos do Analytics Dashboard:
  - **Plano detalhado**: `.context/plans/analytics-dashboard-improvements-v2.md`
  - **Distribuição por Categoria**:
    - Antes: Gráfico de rosca (donut)
    - Depois: Barras horizontais ordenadas por quantidade (maior no topo)
    - Altura dinâmica baseada na quantidade de categorias
    - Data labels com quantidade em cada barra
  - **Distribuição por Severidade**:
    - Antes: Donut com legenda na parte inferior
    - Depois: Donut com labels mostrando "Tipo\nQtd (X%)", sem legenda
  - **NOVO: Ocorrências por Nível de Ensino**:
    - Gráfico donut com Ed. Infantil, Fundamental, Médio
    - Labels com quantidade e porcentagem
    - Cross-filtering integrado com todos os outros gráficos
    - Novo filtro `educationLevels: string[]` no FilterState
    - Query inclui `education_level` no join de classes
  - **Alunos com Ocorrências**:
    - Antes: Top 10 alunos, números no eixo X
    - Depois: TODOS os alunos com scroll, sem eixo X, data labels
    - Altura dinâmica: `Math.max(400, alunos * 30)`
    - Container com `max-h-[500px]` e scroll vertical
  - **Ocorrências por Turma**:
    - Antes: Eixo Y visível, gradiente de cores do verde ao vermelho
    - Depois: Sem eixo Y, apenas MAX (vermelho) e MIN (verde) coloridos
    - Resto das barras em cinza (#6B7280)
    - Data labels no topo de cada barra
  - **Arquivos modificados**:
    - `app/admin/dashboard/page.tsx` - Todas as alterações de gráficos
  - **Novas constantes**:
    - `educationLevelLabels` - Labels traduzidos
    - `educationLevelKeysFromLabels` - Mapeamento reverso para filtros
- Harmonização de Cores dos Gráficos:
  - **Plano detalhado**: `.context/plans/analytics-chart-colors-harmony.md`
  - **Problema**: Cores hardcoded sem harmonia, azul escuro difícil de ler
  - **Solução**: Nova paleta baseada em cores analogous (adjacentes no círculo cromático)
  - **CHART_COLORS atualizado** (`lib/utils.ts`):
    - `primary`: `#2563eb` (Blue 600 - mais vibrante)
    - `success`: `#22c55e` (Green 500)
    - `warning`: `#eab308` (Yellow 500 - amarelo puro)
    - `danger`: `#ef4444` (Red 500)
    - `palette`: 8 cores analogous (azul → ciano → teal → verde → lima → amarelo → laranja → vermelho)
    - `severity`: objeto com leve/media/grave
    - `educationLevel`: objeto com infantil/fundamental/medio/custom
  - **Gráficos atualizados**:
    - Severidade: usa `CHART_COLORS.severity.*` (verde → amarelo → vermelho)
    - Nível de Ensino: usa `CHART_COLORS.educationLevel.*`
    - Turmas: usa `CHART_COLORS.danger/success/gray`
    - Todos: rgba com nova cor primária (#2563eb)
- Layout Responsivo dos Gráficos de Distribuição:
  - **Plano detalhado**: `.context/plans/analytics-layout-responsive.md`
  - **Problema**: Gráfico "Por Nível de Ensino" sozinho em linha própria
  - **Solução**: Grid responsivo com 3 colunas em desktop
  - **Breakpoints**:
    - Mobile (< 768px): 1 coluna - charts empilhados
    - Tablet (768px - 1023px): 2 colunas com wrap
    - Desktop (>= 1024px): 3 colunas lado a lado
  - **Grid atualizado**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - **Cards otimizados**:
    - Headers compactos: `pb-2`, `pt-0` no content
    - Fontes responsivas: `text-base lg:text-lg` no título
    - Descrição truncada: `text-xs lg:text-sm line-clamp-1`
  - **Charts ajustados**:
    - Donuts (Severidade, Nível): height 280px, fontSize 11, lineHeight 14
    - Barras (Categoria): height dinâmica `Math.max(220, items * 30)`
    - labelLine mais curta: `length: 10, length2: 5`
- Filtro de Ano e Melhorias nos Gráficos:
  - **Plano detalhado**: `.context/plans/analytics-year-filter-chart-improvements.md`
  - **Filtro de Ano (Slicer)**:
    - Select no topo da página com ano atual + 2 anteriores
    - State `selectedYear` com default = ano atual
    - Todos os dados filtrados pelo ano selecionado
  - **Gráfico de Tendência Mensal**:
    - Antes: Últimos 6 meses dinâmicos
    - Depois: Janeiro a Dezembro do ano selecionado
    - Eixo Y oculto (`show: false`)
    - Data labels no topo de cada barra
    - Título inclui ano: "Tendência Mensal - {selectedYear}"
  - **Gráfico de Distribuição por Categoria**:
    - `axisLabel.width`: 120 → 180 (nomes completos)
    - `fontSize`: 11 (mais compacto)
    - `barMaxWidth`: 20 (barras proporcionais)
  - **Responsividade com Sidebar Colapsado**:
    - Estado `collapsed` levantado para DashboardLayout
    - Sidebar recebe `collapsed` e `onToggleCollapse` como props
    - Main content: `pl-64` → `pl-16` quando colapsado
    - Gráficos expandem automaticamente com CSS flex/grid
  - **Arquivos modificados**:
    - `app/admin/dashboard/page.tsx` - Filtro de ano + queries com ano
    - `components/layout/DashboardLayout.tsx` - Estado collapsed + padding dinâmico
    - `components/layout/Sidebar.tsx` - Props collapsed ao invés de state local
- Correção Dashboard Professores (contagem zero):
  - **Problema**: Dashboard admin mostrava 0 professores devido a RLS
  - **Solução**: Nova API `GET /api/dashboard/stats` com `createServiceClient()`
  - **Arquivo**: `app/api/dashboard/stats/route.ts` (novo)
  - **Marcado como dynamic**: `export const dynamic = 'force-dynamic'`
- Simplificação da Página de Configurações:
  - **Antes**: Card "Zona de Perigo" com "Ações irreversíveis" (inadequado para logout)
  - **Depois**: Card "Sessão" com ícone LogOut e "Encerrar sessão atual"
  - **Estilo**: Removido border/text destructive, botão outline neutro
- Relatórios por Período Acadêmico:
  - **Plano detalhado**: `.context/plans/relatorios-por-periodo-academico.md`
  - **Antes**: Inputs manuais de data inicial e final
  - **Depois**: Botões clicáveis para cada período configurado (bimestre/trimestre/semestre)
  - **Arquivo modificado**: `app/admin/relatorios/periodo/page.tsx`
  - **Funcionalidades**:
    - Carrega períodos da tabela `quarters` da instituição
    - Grid 2 colunas com botões para cada período
    - Badge "Atual" no período corrente (verde)
    - Estado selecionado com borda primária e ring
    - Alerta se nenhum período configurado + link para configurar
    - Nome do período no título do relatório (ex: "1º Bimestre")
    - Arquivo de download com nome do período
  - **Removidos**: inputs de data manual, labels Data Inicial/Final
- TypeScript e compilacao passando com sucesso
- Sistema de Alertas Configuraveis para Ocorrencias:
  - **Plano detalhado**: `.context/plans/admin-alert-rules.md`
  - **Banco de dados**: Tabelas `alert_rules` e `alert_notifications` ja existiam
  - **Tipos TypeScript**: `AlertRule`, `AlertNotification`, `AlertScopeType`, `AlertFilterType`
  - **APIs criadas**:
    - `POST/GET /api/alert-rules` - CRUD de regras
    - `GET/PUT/DELETE /api/alert-rules/[id]` - Operacoes em regra especifica
    - `GET/POST /api/alert-notifications` - Listar e marcar todas como lidas
    - `PUT /api/alert-notifications/[id]/read` - Marcar como lida
    - `GET /api/alert-notifications/count` - Contar nao lidas (para badge)
  - **Funcao `evaluateAlertRules`**: Avalia regras apos cada nova ocorrencia
  - **API `POST /api/occurrences`**: Integra avaliacao de alertas
  - **Paginas criadas**:
    - `/admin/alertas` - Central de notificacoes de alerta
    - `/admin/configuracoes` - Gerenciamento de regras de alerta
  - **Sidebar atualizado**:
    - Links para Alertas e Configuracoes no menu admin
    - Badge vermelho com contagem de alertas nao lidos
    - Atualizacao automatica a cada 60 segundos
  - **Funcionalidades**:
    - Criar regras com escopo (aluno/turma/instituicao)
    - Filtrar por tipo de ocorrencia ou severidade
    - Definir threshold (quantidade + periodo em dias)
    - Ativar/desativar regras
    - Cooldown de 1 hora para evitar spam
  - Build passando com sucesso
- Correcao da Ordenacao de Ocorrencias Recentes no Dashboard:
  - **Plano detalhado**: `.context/plans/admin-dashboard-recent-occurrences.md`
  - **Problema**: Lista ordenava por `created_at` (data de cadastro no sistema)
  - **Solução**: Ordenar por `occurrence_date` (data real do evento)
  - **Arquivo modificado**: `app/api/dashboard/stats/route.ts` (linha 86)
  - Agora a seção "Ocorrências Recentes" mostra as mais recentes por data do evento
- Plano de Segurança e Integridade de Dados:
  - **Plano detalhado**: `.context/plans/seguranca-integridade-dados.md`
  - **Análise completa** da arquitetura atual de relacionamentos e CASCADE deletes
  - **Cenários cobertos**:
    - Transferência de aluno entre turmas (preservar turma original nas ocorrências)
    - Aluno saindo da escola (soft delete vs hard delete)
    - Professor saindo/voltando (reativação de conta)
    - Turmas obsoletas (desligamento vs exclusão)
    - Tipos de ocorrência desativados
    - Virada de ano letivo (arquivamento + novo ano)
  - **Migration executada** (`supabase-migration-EXECUTAR-AGORA.sql`):
    - Soft Delete Universal: `deleted_at` em users, occurrence_types, user_institutions
    - `class_id_at_occurrence` em occurrences com trigger automático
    - Tabelas `school_years` e `student_enrollments` criadas
    - 120 matrículas criadas, 77 ocorrências atualizadas com turma histórica
  - **APIs criadas**:
    - `PUT /api/users/[id]/deactivate` - Desligar usuário
    - `PUT /api/users/[id]/reactivate` - Reativar usuário
    - `PUT /api/students/[id]/deactivate` - Desligar aluno
    - `PUT /api/classes/[id]/deactivate` - Desligar turma
    - `GET/POST /api/school-years` - CRUD anos letivos
    - `GET/PUT/DELETE /api/school-years/[id]` - Operações em ano específico
    - `POST /api/school-years/rollover` - Virada de ano letivo
  - **Tipos TypeScript atualizados**:
    - `User` com `deleted_at`, `deactivation_reason`
    - `Class` com `school_year_id`
    - `Occurrence` com `class_id_at_occurrence`
    - Novos tipos: `SchoolYear`, `StudentEnrollment`, `EnrollmentStatus`
  - Build passando com sucesso
- UI de Segurança e Integridade de Dados (Fase 3):
  - **Página de Alunos** (`app/admin/alunos/page.tsx`):
    - Toggle "Mostrar inativos" para visualizar alunos desligados
    - Botão "Desligar" (UserX) em vez de "Excluir" (Trash2)
    - Botão "Reativar" (UserCheck) para alunos inativos
    - Coluna "Status" com badge Ativo/Inativo
    - Visual "(desligado)" no nome de alunos inativos
    - Linha com opacidade reduzida para inativos
    - Chamada à API `/api/students/[id]/deactivate` com motivo
    - Mensagem de sucesso informando preservação do histórico
  - **Página de Anos Letivos** (`app/admin/anos-letivos/page.tsx` - NOVA):
    - Card destacado para ano letivo atual
    - Estatísticas: turmas, matrículas, ocorrências por ano
    - Botões: Arquivar/Desarquivar, Tornar Atual
    - Modal "Virada de Ano Letivo" com opções:
      - Arquivar ano atual
      - Criar turmas baseadas no ano anterior
      - Promover alunos automaticamente
      - Copiar períodos acadêmicos
    - Card informativo sobre como funciona a virada de ano
  - **Sidebar atualizado** (`components/layout/Sidebar.tsx`):
    - Novo link "Anos Letivos" com ícone CalendarRange
    - Posicionado após "Períodos" no menu admin
  - Build passando com sucesso
- Análise Completa de Governança de Dados:
  - **Plano detalhado**: `.context/plans/governanca-dados-completa.md`
  - **Objetivo**: Garantir que nenhuma ação de usuário cause quebra de integridade referencial
  - **Pontos CRÍTICOS corrigidos**:
    1. **Soft delete em occurrences** - Agora ocorrências têm `deleted_at` e `deleted_by`
    2. **Bloqueio de delete permanente de turmas** - Valida dependências antes de deletar
    3. **Preview de contagem na exclusão de instituição** - Mostra números reais de dados
  - **Migration criada** (`supabase-migration-governanca-dados.sql`):
    - `deleted_at` e `deleted_by` em occurrences
    - `deleted_at` em alert_rules
    - Índices para queries de ocorrências ativas
    - Preenche `class_id_at_occurrence` em ocorrências antigas
    - Cria anos letivos para turmas órfãs
    - Desativa alert_rules com entidades inválidas
  - **Código atualizado**:
    - `types/index.ts` - Occurrence com deleted_at, deleted_by
    - `app/api/dashboard/stats/route.ts` - Filtro .is('deleted_at', null)
    - `app/admin/dashboard/page.tsx` - Todas as 5 queries com filtro de soft delete
    - `app/professor/ocorrencias/page.tsx` - Query com filtro de soft delete
    - `app/admin/turmas/page.tsx` - handlePermanentDelete valida dependências
    - `app/master/page.tsx` - openDeleteModal carrega contagem real de dados
    - `app/api/students/[id]/deactivate/route.ts` - Desativa alert_rules do aluno
    - `app/api/classes/[id]/deactivate/route.ts` - Desativa alert_rules da turma
  - **Status**: JÁ EXECUTADO (confirmado 28/01/2026)
  - Build passando com sucesso

## Sessao (28/01/2026)
- Feedback Visual de Navegacao para Todas as Roles:
  - **Plano detalhado**: `.context/plans/feedback-visual-navegacao.md`
  - **Problema**: Usuario clicava em links e nao via feedback imediato
  - **Causa raiz**: Todas as paginas sao Client Components (`'use client'`), entao `loading.tsx` nao funciona
  - **Solucao**: Overlay de loading global que aparece imediatamente ao clicar
  - **Arquitetura**:
    - `showLoadingOverlay()` - Chamado pelo ProgressLink ao clicar
    - `hideLoadingOverlay()` - Chamado pelo NavigationProgress ao mudar de rota
    - Overlay com backdrop blur + spinner Loader2 centralizado
  - **Arquivos criados/modificados**:
    - `components/LoadingOverlay.tsx` - NOVO componente de overlay global
    - `components/NavigationProgress.tsx` - Integrado hideLoadingOverlay()
    - `components/ProgressLink.tsx` - Integrado showLoadingOverlay()
    - `app/layout.tsx` - Adicionado <LoadingOverlay />
  - **Resultado**: Feedback visual duplo (barra NProgress no topo + overlay central)
  - **Funciona em todas as roles**: admin, professor, viewer, master
  - Build passando com sucesso

## Sessao Atual (29/01/2026)
- Migration de Governanca de Dados confirmada como JA EXECUTADA:
  - `deleted_at` e `deleted_by` em occurrences, `deleted_at` em alert_rules
  - Indices `idx_occurrences_active` e `idx_occurrences_student_active`
  - `class_id_at_occurrence` preenchido (0 pendentes)
  - `school_year_id` vinculado (0 turmas orfas)
- Botao Analytics na navegacao mobile do professor:
  - **Plano detalhado**: `.context/plans/professor-analytics-mobile-button.md`
  - **Arquivo modificado**: `components/layout/BottomNav.tsx`
  - Adicionado icone `BarChart3` e item `{ href: '/professor/analytics', label: 'Analytics' }`
  - Barra inferior agora tem 4 itens: Inicio, Registrar, Minhas, Analytics
- Correcao definitiva das Ultimas 10 Ocorrencias (admin e viewer):
  - **Plano detalhado**: `.context/plans/fix-recent-occurrences-definitive.md`
  - **Causa raiz**: `createServerClient` do `@supabase/ssr` NAO bypassa RLS, mesmo com service role key. A API route `/api/dashboard/stats` usava esse client, causando dados desatualizados/filtrados. O professor funcionava porque buscava direto no browser client.
  - **Solucao**: Migrar TODAS as queries do dashboard admin e viewer para browser client (`createClient()` de `lib/supabase/client.ts`), igual ao professor. Sem intermediarios, dados sempre frescos.
  - **Arquivos modificados**:
    - `lib/supabase/server.ts` - `createServiceClient` agora usa `createClient` do `@supabase/supabase-js` (nao mais `createServerClient` do SSR)
    - `app/admin/page.tsx` - Todas as 7 queries (alunos, turmas, professores, total ocorrencias, mes, graves, recentes) via browser client direto
    - `app/viewer/page.tsx` - Todas as 6 queries via browser client direto
    - `app/api/dashboard/stats/route.ts` - Header `Cache-Control: no-store` (mantida como fallback)
  - **Cards corrigidos**: Total de Alunos, Turmas Ativas, Professores, Ocorrencias (Mes), Graves, Ultimas 10 Ocorrencias
- Correcao RLS para card de Professores:
  - **Problema**: RLS de `user_institutions` so permitia leitura dos proprios registros (`Users can read their own`), entao admin nao conseguia contar professores
  - **Solucao**: Funcao `get_user_institution_ids()` (SECURITY DEFINER) que retorna institution_ids do usuario sem recursao RLS
  - **Nova policy**: `Users can read same institution user_institutions` usando a funcao
  - **Policy removida**: Tentativa anterior com subquery recursiva que causava problema de login
- Testes Playwright: 17/19 passando (1 skipped por login, 1 falha pre-existente em modal timing)
- Correcao: Admin nao conseguia desativar usuarios:
  - **Plano detalhado**: `.context/plans/fix-user-deactivation-admin.md`
  - **Causa raiz**: `handleToggleStatus()` fazia `.update()` direto via browser client em `user_institutions`, mas RLS nao tem policy de UPDATE para admins (apenas masters tem `*`)
  - **Solucao**: Substituir update direto por `fetch('/api/users/{id}/deactivate')` e `fetch('/api/users/{id}/reactivate')` (APIs existentes com service client)
  - **Arquivo modificado**: `app/admin/professores/page.tsx` (handleToggleStatus)
- Visualizacao e reativacao de usuarios desativados:
  - **Plano detalhado**: `.context/plans/reactivate-deactivated-users.md`
  - **Problema**: Apos desativar, usuario sumia da lista (filtro `deleted_at IS NULL`) sem forma de reativar
  - **API modificada**: `GET /api/teachers` - novo parametro `include_inactive=true` que remove filtro `deleted_at`
  - **Frontend** (`app/admin/professores/page.tsx`):
    - Botao "Mostrar inativos" / "Ocultar inativos" no header da lista
    - Usuarios inativos: linha com opacidade 50%, texto "(desativado)", badge "Inativo"
    - Botao Reativar (UserCheck verde) para inativos
    - Botao Desativar (Power vermelho) para ativos
    - Admin nao pode desativar a si mesmo (botao oculto)
    - Sem exclusao permanente — preserva dados transacionados (ocorrencias registradas)
- Build passando com sucesso

## Sessao Atual (15/02/2026)
- Subcategorias de Ocorrencias implementadas:
  - **Plano detalhado**: `.context/plans/add-occurrence-subcategories.md`
  - **Migration SQL** (`add_occurrence_subcategories`): Executada via MCP
    - Tabela `occurrence_subcategories` com 5 subcategorias padrao do sistema
    - Padrao: Pedagogico, Comportamento Inadequado, Indisciplinar Leve, Indisciplinar Grave, Infracional
    - FK `subcategory_id` em `occurrence_types` (ON DELETE SET NULL)
    - RLS: leitura de padrao + propria instituicao, CRUD apenas admin
    - Indices: institution, default, occurrence_types.subcategory_id
  - **Tipos TypeScript** (`types/index.ts`):
    - Nova interface `OccurrenceSubcategory`
    - `OccurrenceType` com `subcategory_id` e `subcategory` (JOIN opcional)
  - **APIs criadas**:
    - `GET/POST /api/occurrence-subcategories` - Listar e criar subcategorias
    - `PUT/DELETE /api/occurrence-subcategories/[id]` - Editar e soft delete
    - Bloqueio de edicao/exclusao de subcategorias padrao (is_default=true)
    - Validacao de nome duplicado por instituicao
  - **CRUD Tipos de Ocorrencia** (`app/admin/tipos-ocorrencias/page.tsx`):
    - Dropdown "Subcategoria" no modal de criar/editar tipo
    - Coluna "Subcategoria" com badge colorido na tabela
    - JOIN de subcategoria no select de tipos
  - **Analytics Dashboard** (`components/analytics/AnalyticsDashboard.tsx`):
    - Grafico donut de Severidade SUBSTITUIDO por donut de Subcategoria
    - Novo filtro `subcategories: string[]` no FilterState
    - Cross-filtering completo com subcategoria em TODOS os graficos (8 blocos)
    - Cores via `CHART_COLORS.subcategory` + cor da subcategoria do banco
    - Click handler `handleSubcategoryClick` com suporte a Ctrl+Click
  - **Registro de Ocorrencias** (`app/professor/registrar/page.tsx`):
    - Select de tipo exibe subcategoria: "Atraso (leve) - Indisciplinar Leve"
    - JOIN de subcategoria na query de tipos
  - **Ocorrencias do Professor** (`app/professor/ocorrencias/page.tsx`):
    - Coluna "Subcategoria" na tabela com badge colorido
    - Tipo local `OccurrenceWithRelations` atualizado com subcategory
  - **Dashboards** (admin, viewer):
    - Badge de subcategoria nas ocorrencias recentes
    - JOIN de subcategoria na query de recentes
  - **OccurrenceDetailModal**: Exibe subcategoria no detalhe
  - **AI Analytics** (`lib/ai/shared.ts`):
    - Tabela `occurrence_subcategories` adicionada ao schema
    - Campo `subcategory_id` documentado em `occurrence_types`
  - **Relatorios** (`app/admin/relatorios/*/page.tsx`):
    - JOIN de subcategoria nas queries de periodo e aluno
  - **Cores** (`lib/utils.ts`):
    - `CHART_COLORS.subcategory` com 5 cores padrao + "Nao classificado"
  - Build passando com sucesso
