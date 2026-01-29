# PRD - Product Requirements Document
# Focus: Sistema de Gestão Escolar

**Versão:** 3.0
**Última Atualização:** Janeiro 2026
**Status:** Produção

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Descrição
Focus é um sistema de gestão escolar multi-tenant projetado para rastrear ocorrências disciplinares, pedagógicas e administrativas em instituições educacionais brasileiras. O sistema oferece dashboards analíticos, geração de relatórios, alertas automáticos e assistente de IA para análise de dados.

### 1.2 Público-Alvo
- **Master**: Administrador da plataforma (gerencia múltiplas instituições)
- **Administrador**: Gestor escolar (gerencia uma instituição)
- **Professor**: Registra ocorrências dos alunos
- **Visualizador**: Acesso de leitura para coordenadores/orientadores

### 1.3 Proposta de Valor
- Centralização do registro de ocorrências disciplinares
- Analytics em tempo real com visualizações interativas
- Geração de relatórios automatizados
- Alertas configuráveis por threshold
- Auditoria completa de todas as operações
- Assistente de IA para análise de dados em linguagem natural

---

## 2. STACK TECNOLÓGICA

### 2.1 Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js (App Router) | 14.x | Framework React |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 3.4.x | Estilização |
| Lucide React | Latest | Ícones |
| Apache ECharts | 5.6.x | Gráficos interativos |

### 2.2 Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Supabase | Latest | BaaS (PostgreSQL + Auth) |
| PostgreSQL | 17.x | Banco de dados |
| Next.js API Routes | 14.x | Endpoints REST |

### 2.3 Serviços Externos
| Serviço | Uso |
|---------|-----|
| Nodemailer + Gmail SMTP | Envio de emails |
| Google Gemini 3 Flash | IA primária para analytics |
| Groq (llama-3.3-70b) | IA fallback |
| Google Places API | Autocomplete de endereços |

### 2.4 Exportação
| Tecnologia | Uso |
|------------|-----|
| ExcelJS | Geração de planilhas Excel |
| jsPDF + AutoTable | Geração de relatórios PDF |

---

## 3. ARQUITETURA DO SISTEMA

### 3.1 Estrutura de Pastas

```
Focus/
├── app/
│   ├── page.tsx                    # Landing + Login
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Estilos globais
│   ├── master/                     # Painel Master
│   ├── admin/                      # Painel Admin
│   │   ├── page.tsx               # Visão Geral
│   │   ├── analytics/             # Gráficos + AI Chat
│   │   ├── turmas/                # Gestão de turmas
│   │   ├── alunos/                # Gestão de alunos
│   │   ├── professores/           # Gestão de professores
│   │   ├── tipos-ocorrencias/     # Tipos de ocorrência
│   │   ├── trimestres/            # Períodos acadêmicos
│   │   ├── anos-letivos/          # Anos letivos
│   │   ├── relatorios/            # Relatórios
│   │   ├── alertas/               # Central de alertas
│   │   └── configuracoes/         # Regras de alerta
│   ├── professor/                  # Painel Professor
│   │   ├── page.tsx               # Visão Geral
│   │   ├── registrar/             # Registrar ocorrência
│   │   ├── ocorrencias/           # Minhas ocorrências
│   │   └── analytics/             # Analytics (leitura)
│   ├── viewer/                     # Painel Visualizador
│   │   ├── page.tsx               # Visão Geral
│   │   ├── analytics/             # Analytics (leitura)
│   │   ├── relatorios/            # Relatórios
│   │   ├── alertas/               # Alertas
│   │   └── configuracoes/         # Regras (leitura)
│   ├── settings/                   # Configurações do usuário
│   ├── reset-password/             # Reset de senha
│   ├── verify-email/               # Verificação de email
│   └── api/                        # API Routes
├── components/
│   ├── ui/                        # Componentes base
│   ├── layout/                    # DashboardLayout, Sidebar
│   ├── dashboard/                 # StatCard, QuickAction
│   ├── analytics/                 # AIChat, gráficos
│   └── admin/                     # Componentes específicos
├── lib/
│   ├── supabase/                  # Clients Supabase
│   ├── ai/                        # Gemini + Groq
│   ├── email/                     # Nodemailer
│   ├── alerts/                    # Avaliação de regras
│   ├── constants/                 # Níveis de ensino
│   └── utils.ts                   # Utilitários
├── types/
│   └── index.ts                   # Interfaces TypeScript
└── docs/
    ├── manual-administrador.md
    ├── manual-professor.md
    └── manual-visualizador.md
```

---

## 4. MODELO DE DADOS

### 4.1 Diagrama de Entidades

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   institutions  │     │   user_institutions │     │      users      │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │◄────│ institution_id (FK) │     │ id (PK)         │
│ name            │     │ user_id (FK)        │────►│ email           │
│ city            │     │ role                │     │ full_name       │
│ state_code      │     │ is_active           │     │ is_active       │
│ is_active       │     └─────────────────────┘     │ is_master       │
│ created_at      │                                 │ deleted_at      │
└────────┬────────┘                                 └─────────────────┘
         │
         │ institution_id
         ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│     classes     │     │      students       │     │   occurrences   │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │◄────│ class_id (FK)       │     │ id (PK)         │
│ name            │     │ id (PK)             │◄────│ student_id (FK) │
│ institution_id  │     │ full_name           │     │ class_id_at_occ │
│ education_level │     │ registration_number │     │ occurrence_type │
│ grade           │     │ institution_id      │     │ registered_by   │
│ section         │     │ is_active           │     │ institution_id  │
│ shift           │     │ deleted_at          │     │ description     │
│ school_year_id  │     └─────────────────────┘     │ occurrence_date │
│ is_active       │                                 │ deleted_at      │
│ deleted_at      │                                 │ deleted_by      │
└─────────────────┘                                 └─────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│  occurrence_types   │     │    school_years     │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ category            │     │ institution_id (FK) │
│ severity            │     │ year                │
│ institution_id (FK) │     │ is_current          │
│ is_active           │     │ is_archived         │
│ deleted_at          │     │ created_at          │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│    alert_rules      │     │ alert_notifications │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ institution_id (FK) │     │ rule_id (FK)        │
│ name                │     │ institution_id (FK) │
│ scope_type          │     │ entity_id           │
│ scope_id            │     │ message             │
│ filter_type         │     │ is_read             │
│ filter_value        │     │ created_at          │
│ threshold_count     │     └─────────────────────┘
│ threshold_days      │
│ is_active           │     ┌─────────────────────┐
│ deleted_at          │     │    system_logs      │
└─────────────────────┘     ├─────────────────────┤
                            │ id (PK)             │
┌─────────────────────┐     │ user_id (FK)        │
│      quarters       │     │ institution_id (FK) │
├─────────────────────┤     │ action              │
│ id (PK)             │     │ entity_type         │
│ institution_id (FK) │     │ entity_id           │
│ name                │     │ details (JSONB)     │
│ start_date          │     │ created_at          │
│ end_date            │     └─────────────────────┘
│ created_at          │
└─────────────────────┘
```

### 4.2 Roles do Sistema

| Role | Descrição | Scope |
|------|-----------|-------|
| `master` | Super administrador | Plataforma inteira |
| `admin` | Administrador escolar | Uma instituição |
| `professor` | Professor | Uma instituição |
| `admin_viewer` | Visualizador | Uma instituição (leitura) |

### 4.3 Severidade de Ocorrências

| Valor | Label | Cor |
|-------|-------|-----|
| `leve` | Leve | Verde |
| `media` | Média | Amarelo |
| `grave` | Grave | Vermelho |

### 4.4 Níveis de Ensino

| Valor | Label | Séries |
|-------|-------|--------|
| `creche` | Creche | Berçário I/II, Maternal I/II |
| `pre_escola` | Pré-escola | Pré I, Pré II |
| `fundamental` | Ensino Fundamental | 1º ao 9º ano |
| `ensino_medio` | Ensino Médio | 1ª a 4ª série |
| `custom` | Personalizado | Definido pelo usuário |

---

## 5. FUNCIONALIDADES POR ROLE

### 5.1 Master

| Funcionalidade | Descrição |
|----------------|-----------|
| Gerenciar Solicitações | Aprovar/rejeitar acessos pendentes |
| Aprovar Todos | Bulk approve de solicitações |
| Gerenciar Usuários | Ver, editar, alterar role de usuários |
| Gerenciar Instituições | Ver, excluir instituições |
| Logs do Sistema | Filtrar, paginar, ver detalhes de auditoria |

### 5.2 Admin

| Funcionalidade | Descrição |
|----------------|-----------|
| Visão Geral | Dashboard com stats e últimas ocorrências |
| Analytics | Gráficos interativos + AI Chat |
| Turmas | CRUD + lixeira + restauração |
| Alunos | CRUD + import/export Excel + desligar/reativar |
| Professores | Aprovar, cadastrar direto, editar |
| Tipos de Ocorrência | CRUD com categoria e severidade |
| Períodos | Configurar bimestres/trimestres/semestres |
| Anos Letivos | Gerenciar anos, virada de ano |
| Relatórios | Por período (visual) ou por aluno |
| Alertas | Central de notificações |
| Configurações | CRUD de regras de alerta |

### 5.3 Professor

| Funcionalidade | Descrição |
|----------------|-----------|
| Visão Geral | Dashboard com minhas ocorrências |
| Registrar Ocorrência | Turma, checkbox de alunos, tipo, data/hora |
| Minhas Ocorrências | Listar, visualizar, editar próprias |
| Analytics | Visualização de gráficos (leitura) |

### 5.4 Visualizador

| Funcionalidade | Descrição |
|----------------|-----------|
| Visão Geral | Dashboard com stats |
| Analytics | Visualização de gráficos (leitura) |
| Relatórios | Gerar por período ou aluno |
| Alertas | Visualizar notificações |
| Configurações | Ver regras de alerta (leitura) |

---

## 6. SEGURANÇA E COMPLIANCE

### 6.1 Row Level Security (RLS)
Todas as tabelas possuem políticas RLS que garantem:
- Isolamento de dados por instituição
- Professores só veem/editam próprias ocorrências
- Visualizadores têm acesso somente leitura
- Master tem acesso a tudo

### 6.2 Soft Delete
Entidades suportam exclusão lógica:
- `deleted_at`: Timestamp da exclusão
- `deleted_by`: Usuário que excluiu
- Dados preservados para auditoria e restauração

Entidades com soft delete:
- Users
- Students
- Classes
- Occurrences
- Occurrence Types
- Alert Rules

### 6.3 Auditoria
Sistema de logs automático via trigger PostgreSQL:
- `occurrence_create`: Registro de nova ocorrência
- `occurrence_update`: Edição com diff (old/new)
- `occurrence_delete`: Soft delete
- `role_change`: Alteração de permissão

Detalhes armazenados em JSONB com:
- Campos alterados (antes/depois)
- Usuário responsável
- Timestamp preciso

### 6.4 LGPD
- Dados sensíveis bloqueados no AI Chat
- Soft delete preserva histórico sem exposição
- Sem armazenamento de CPF, RG ou dados bancários

---

## 7. INTEGRAÇÕES

### 7.1 AI Analytics
```
Pergunta em PT-BR → Gemini/Groq → SQL → Supabase → Resposta Natural
```

Fluxo:
1. Usuário faz pergunta em português
2. IA converte para SQL seguro
3. SQL executado via função Supabase
4. Resultado formatado em linguagem natural

Fallback automático: Gemini → Groq (rate limit)

### 7.2 Emails
Sistema de emails para:
- Confirmação de solicitação de acesso
- Notificação para revisores (admins/master)
- Boas-vindas com senha temporária
- Reset de senha

Template profissional com:
- Header gradiente azul
- Logo Focus
- Botões estilizados
- Footer com copyright

### 7.3 Alertas Automáticos
Trigger de avaliação executado após cada ocorrência:
1. Busca regras ativas da instituição
2. Avalia se threshold foi atingido
3. Respeita cooldown de 1 hora
4. Cria notificação se aplicável

---

## 8. REQUISITOS NÃO-FUNCIONAIS

### 8.1 Performance
- Página inicial < 3 segundos
- API responses < 500ms
- Queries paralelas (Promise.all)
- Singleton pattern no Supabase client

### 8.2 Responsividade
- Mobile-first design
- Breakpoint principal: 768px (md)
- Sidebar colapsável em desktop
- Menu overlay em mobile

### 8.3 Acessibilidade
- Semântica HTML adequada
- Contraste de cores WCAG
- Navegação por teclado
- Labels em formulários

### 8.4 Internacionalização
- Idioma: Português brasileiro (pt-BR)
- Formato de data: DD/MM/YYYY
- Formato de hora: HH:mm (24h)
- Moeda: R$ (se aplicável)

---

## 9. VARIÁVEIS DE AMBIENTE

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Email
GMAIL_USER=email@gmail.com
GMAIL_APP_PASS=xxxx xxxx xxxx xxxx

# AI
GEMINI_API_KEY=xxx
GROQ_API_KEY=xxx

# Aplicação
NEXT_PUBLIC_APP_URL=https://focus.app

# Opcional
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx
```

---

## 10. ROADMAP FUTURO

### Fase 1 - MVP (Concluído)
- [x] Autenticação e roles
- [x] CRUD de entidades principais
- [x] Registro de ocorrências
- [x] Dashboard analytics
- [x] Relatórios PDF/Excel

### Fase 2 - Melhorias (Concluído)
- [x] AI Chat para analytics
- [x] Sistema de alertas
- [x] Auditoria via trigger
- [x] Soft delete universal
- [x] Anos letivos

### Fase 3 - Planejado
- [ ] App mobile (React Native)
- [ ] Notificações push
- [ ] Integração com sistemas de diário
- [ ] Dashboard para responsáveis
- [ ] Relatórios customizáveis
- [ ] Exportação para sistemas governamentais

---

## 11. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| Ocorrência | Registro de evento disciplinar/pedagógico |
| Turma | Classe/grupo de alunos (ex: 9º A) |
| Período | Bimestre, trimestre ou semestre |
| Severidade | Gravidade da ocorrência (leve/média/grave) |
| Threshold | Limite para disparo de alerta |
| Soft Delete | Exclusão lógica (preserva dados) |
| RLS | Row Level Security (isolamento de dados) |
| Cross-filtering | Filtro interativo entre gráficos |
