---
status: active
generated: 2026-01-24
agents:
  - type: "frontend-specialist"
    role: "Corrigir textos em componentes React"
  - type: "code-reviewer"
    role: "Revisar consistencia das correcoes"
phases:
  - id: "phase-1"
    name: "Mapeamento de Arquivos"
    prevc: "P"
  - id: "phase-2"
    name: "Correcao dos Textos"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao e Build"
    prevc: "V"
---

# Correcao de Acentuacao Portuguesa no App

> Revisar todos os textos visiveis ao usuario e corrigir acentos (agudo, grave, circunflexo), cedilha e til

## Task Snapshot
- **Primary goal:** Corrigir todas as palavras em portugues que estao sem acentos corretos
- **Success signal:** Build passando e todos os textos visiveis com acentuacao correta
- **Total de correcoes:** 150+ palavras/frases em 15 arquivos

## Acentos a Corrigir

| Acento | Exemplo Errado | Exemplo Correto |
|--------|----------------|-----------------|
| Agudo (´) | valido | válido |
| Til (~) | nao, solicitacao | não, solicitação |
| Cedilha (ç) | acao | ação |
| Circunflexo (^) | numero | número |
| Grave (`) | a instituicao | à instituição |

## Arquivos a Corrigir (15 arquivos)

### Grupo 1: Componentes de Layout e Auth (Alta Prioridade)

#### 1. components/layout/Sidebar.tsx
| Errado | Correto |
|--------|---------|
| Instituicao | Instituição |
| Configuracoes | Configurações |
| Tipos de Ocorrencias | Tipos de Ocorrências |
| Relatorios | Relatórios |
| Registrar Ocorrencia | Registrar Ocorrência |
| Minhas Ocorrencias | Minhas Ocorrências |

#### 2. components/auth/LoginForm.tsx
| Errado | Correto |
|--------|---------|
| Usuario nao encontrado | Usuário não encontrado |
| esta desativada | está desativada |
| Voce nao tem acesso a nenhuma instituicao | Você não tem acesso a nenhuma instituição |

#### 3. components/auth/AccessRequestModal.tsx (23 correcoes)
| Errado | Correto |
|--------|---------|
| Telefone invalido | Telefone inválido |
| Email invalido | Email inválido |
| Por favor, insira um email valido | Por favor, insira um email válido |
| Por favor, insira um telefone valido com DDD | Por favor, insira um telefone válido com DDD |
| Preencha o nome da instituicao | Preencha o nome da instituição |
| Selecione um endereco valido da lista de sugestoes | Selecione um endereço válido da lista de sugestões |
| Selecione uma instituicao | Selecione uma instituição |
| Erro ao enviar solicitacao | Erro ao enviar solicitação |
| Solicitacao enviada com sucesso! Aguarde a aprovacao. | Solicitação enviada com sucesso! Aguarde a aprovação. |
| Tipo de Solicitacao | Tipo de Solicitação |
| Professor em instituicao existente | Professor em instituição existente |
| Administrador em instituicao existente | Administrador em instituição existente |
| Nova instituicao + Administrador | Nova instituição + Administrador |
| Instituicao * | Instituição * |
| Nome da Instituicao * | Nome da Instituição * |
| Endereco da Instituicao * | Endereço da Instituição * |
| Digite o endereco e selecione da lista... | Digite o endereço e selecione da lista... |
| Endereco selecionado: | Endereço selecionado: |
| Informacoes adicionais... | Informações adicionais... |
| Enviar Solicitacao | Enviar Solicitação |

#### 4. components/teachers/TeacherModal.tsx
| Errado | Correto |
|--------|---------|
| Email invalido | Email inválido |
| O professor recebera um email com instrucoes de acesso | O professor receberá um email com instruções de acesso |

### Grupo 2: Paginas do Admin

#### 5. app/admin/professores/page.tsx
| Errado | Correto |
|--------|---------|
| Gerencie os professores vinculados a instituicao | Gerencie os professores vinculados à instituição |
| Professores sao adicionados atraves de solicitacoes de acesso | Professores são adicionados através de solicitações de acesso |
| Acoes | Ações |
| Opcao 1: | Opção 1: |
| O professor recebera um email com as credenciais de acesso. | O professor receberá um email com as credenciais de acesso. |
| Opcao 2: | Opção 2: |
| O administrador master podera aprovar a solicitacao. | O administrador master poderá aprovar a solicitação. |
| Edicao | Edição |

#### 6. app/admin/turmas/page.tsx
| Errado | Correto |
|--------|---------|
| Serie/Ano e obrigatorio | Série/Ano é obrigatório |
| Turno e obrigatorio | Turno é obrigatório |
| Gerencie as turmas da instituicao | Gerencie as turmas da instituição |
| Nivel | Nível |
| Esta acao nao pode ser desfeita. | Esta ação não pode ser desfeita. |
| Turma excluida permanentemente | Turma excluída permanentemente |
| Turmas excluidas podem ser restauradas | Turmas excluídas podem ser restauradas |

#### 7. app/admin/alunos/page.tsx
| Errado | Correto |
|--------|---------|
| Nome e turma sao obrigatorios | Nome e turma são obrigatórios |
| Aluno excluido | Aluno excluído |
| Exportacao concluida | Exportação concluída |
| Gerencie os alunos da instituicao | Gerencie os alunos da instituição |
| Instrucoes de Importacao | Instruções de Importação |
| Colunas obrigatorias: | Colunas obrigatórias: |
| Colunas opcionais: | Colunas opcionais: |
| Cabecalho: | Cabeçalho: |
| A primeira linha deve conter os titulos das colunas | A primeira linha deve conter os títulos das colunas |
| Obrigatorio. Nome completo do aluno. | Obrigatório. Nome completo do aluno. |
| Numero de matricula do aluno. | Número de matrícula do aluno. |
| A primeira linha deve conter os cabecalhos (nao remova). | A primeira linha deve conter os cabeçalhos (não remova). |

#### 8. app/admin/tipos-ocorrencias/page.tsx
| Errado | Correto |
|--------|---------|
| Erro ao carregar tipos de ocorrencia | Erro ao carregar tipos de ocorrência |
| Nome do tipo e obrigatorio | Nome do tipo é obrigatório |
| Tipo de ocorrencia atualizado | Tipo de ocorrência atualizado |
| Tipo de ocorrencia criado | Tipo de ocorrência criado |
| Tipo de ocorrencia excluido | Tipo de ocorrência excluído |
| Erro ao excluir tipo de ocorrencia | Erro ao excluir tipo de ocorrência |
| Configure os tipos de ocorrencias disponiveis | Configure os tipos de ocorrências disponíveis |
| tipo(s) de ocorrencia | tipo(s) de ocorrência |
| Nenhum tipo de ocorrencia cadastrado | Nenhum tipo de ocorrência cadastrado |
| Descricao | Descrição |
| Descricao detalhada do tipo de ocorrencia... | Descrição detalhada do tipo de ocorrência... |

#### 9. app/admin/dashboard/page.tsx
| Errado | Correto |
|--------|---------|
| media (severidade) | média |
| Analise detalhada de ocorrencias - Ctrl+Clique para multi-selecao | Análise detalhada de ocorrências - Ctrl+Clique para multi-seleção |
| Evolucao das ocorrencias nos ultimos 6 meses | Evolução das ocorrências nos últimos 6 meses |
| Distribuicao por Categoria | Distribuição por Categoria |
| Ocorrencias agrupadas por tipo | Ocorrências agrupadas por tipo |
| Distribuicao por Severidade | Distribuição por Severidade |
| Classificacao por gravidade | Classificação por gravidade |
| Alunos com Mais Ocorrencias | Alunos com Mais Ocorrências |
| Vermelho: mais ocorrencias, Verde: menos | Vermelho: mais ocorrências, Verde: menos |
| Alunos sem Ocorrencias | Alunos sem Ocorrências |
| aluno(s) sem registro no periodo | aluno(s) sem registro no período |
| Todos os alunos possuem ocorrencias no periodo selecionado | Todos os alunos possuem ocorrências no período selecionado |

### Grupo 3: Paginas do Professor

#### 10. app/professor/registrar/page.tsx
| Errado | Correto |
|--------|---------|
| A data nao pode ser no futuro | A data não pode ser no futuro |
| Registrando ocorrencia(s)... | Registrando ocorrência(s)... |
| Erro ao registrar ocorrencia | Erro ao registrar ocorrência |
| Registre uma nova ocorrencia para um ou mais alunos | Registre uma nova ocorrência para um ou mais alunos |
| Informe o tipo, data e descricao | Informe o tipo, data e descrição |
| Descricao (opcional) | Descrição (opcional) |
| Descreva os detalhes da ocorrencia... | Descreva os detalhes da ocorrência... |

#### 11. app/professor/ocorrencias/page.tsx
| Errado | Correto |
|--------|---------|
| Media (severidade) | Média |
| Visualize todas as ocorrencias que voce registrou | Visualize todas as ocorrências que você registrou |
| Lista de Ocorrencias | Lista de Ocorrências |
| ocorrencia(s) | ocorrência(s) |
| Nenhuma ocorrencia encontrada | Nenhuma ocorrência encontrada |
| Detalhes da Ocorrencia | Detalhes da Ocorrência |

### Grupo 4: Pagina Inicial e Master

#### 12. app/page.tsx
| Errado | Correto |
|--------|---------|
| Sistema de Gestao Escolar | Sistema de Gestão Escolar |
| Gerencie ocorrencias disciplinares, pedagogicas e administrativas | Gerencie ocorrências disciplinares, pedagógicas e administrativas |
| Cada instituicao com seus proprios dados isolados | Cada instituição com seus próprios dados isolados |
| Historico completo de ocorrencias por aluno | Histórico completo de ocorrências por aluno |
| Relatorios | Relatórios |
| Exportacao em PDF e Excel com filtros avancados | Exportação em PDF e Excel com filtros avançados |
| Dashboards e graficos para analise de dados | Dashboards e gráficos para análise de dados |

#### 13. app/master/page.tsx (30+ correcoes)
| Errado | Correto |
|--------|---------|
| Erro ao carregar solicitacoes | Erro ao carregar solicitações |
| Erro ao carregar usuarios | Erro ao carregar usuários |
| Erro ao carregar instituicoes | Erro ao carregar instituições |
| Erro ao aprovar solicitacao | Erro ao aprovar solicitação |
| Solicitacao aprovada! Senha temporaria: | Solicitação aprovada! Senha temporária: |
| Erro ao rejeitar solicitacao | Erro ao rejeitar solicitação |
| Usuario desativado/ativado | Usuário desativado/ativado |
| Esta acao ira excluir todos os dados relacionados. | Esta ação irá excluir todos os dados relacionados. |
| Instituicao excluida | Instituição excluída |
| Erro ao excluir instituicao | Erro ao excluir instituição |
| Nova Instituicao + Admin | Nova Instituição + Admin |
| Admin em Instituicao Existente | Admin em Instituição Existente |
| Gerencie solicitacoes de acesso, usuarios e instituicoes | Gerencie solicitações de acesso, usuários e instituições |
| Solicitacoes | Solicitações |
| Usuarios | Usuários |
| Instituicoes | Instituições |
| Solicitacoes de Acesso | Solicitações de Acesso |
| solicitacao(oes) pendente(s) | solicitação(ões) pendente(s) |
| Nenhuma solicitacao pendente | Nenhuma solicitação pendente |
| Nova Instituicao: | Nova Instituição: |
| usuario(s) cadastrado(s) | usuário(s) cadastrado(s) |
| instituicao(oes) cadastrada(s) | instituição(ões) cadastrada(s) |
| Ultimas 100 acoes registradas | Últimas 100 ações registradas |
| Acao | Ação |
| Rejeitar Solicitacao | Rejeitar Solicitação |
| Informe o motivo da rejeicao (opcional) | Informe o motivo da rejeição (opcional) |
| Motivo da rejeicao (opcional) | Motivo da rejeição (opcional) |

### Grupo 5: APIs e Emails

#### 14. app/api/access-request/route.ts
| Errado | Correto |
|--------|---------|
| Campos obrigatorios nao preenchidos | Campos obrigatórios não preenchidos |
| Ja existe uma solicitacao pendente para este email | Já existe uma solicitação pendente para este email |
| Este email ja esta cadastrado no sistema | Este email já está cadastrado no sistema |
| Erro ao criar solicitacao | Erro ao criar solicitação |
| Erro ao buscar solicitacoes | Erro ao buscar solicitações |

#### 15. lib/email/sendVerificationEmail.ts
| Errado | Correto |
|--------|---------|
| Sistema de Gestao Escolar | Sistema de Gestão Escolar |
| Sua solicitacao de acesso ao Focus foi aprovada. | Sua solicitação de acesso ao Focus foi aprovada. |
| Senha temporaria: | Senha temporária: |
| Por favor, altere sua senha apos o primeiro login por motivos de seguranca. | Por favor, altere sua senha após o primeiro login por motivos de segurança. |

## Working Phases

### Phase 1 - Mapeamento (P) - COMPLETO
1. [x] Identificar todos os arquivos com textos em portugues
2. [x] Listar todas as palavras/frases sem acentos
3. [x] Organizar por prioridade (componentes mais usados primeiro)
4. [x] Documentar correcoes necessarias

### Phase 2 - Correcao dos Textos (E)
1. [ ] Grupo 1: Componentes de Layout e Auth (4 arquivos)
2. [ ] Grupo 2: Paginas do Admin (5 arquivos)
3. [ ] Grupo 3: Paginas do Professor (2 arquivos)
4. [ ] Grupo 4: Pagina Inicial e Master (2 arquivos)
5. [ ] Grupo 5: APIs e Emails (2 arquivos)

### Phase 3 - Validacao (V)
1. [ ] Executar build para verificar erros
2. [ ] Testar navegacao pelo app
3. [ ] Verificar emails enviados
4. [ ] Atualizar CLAUDE.md

## Rollback Plan
- Todas as alteracoes sao apenas em strings de texto
- Nao afeta logica de negocio ou banco de dados
- Rollback: `git checkout -- <arquivo>` para cada arquivo modificado

## Evidence & Follow-up
- [ ] Build passando
- [ ] Screenshots das paginas corrigidas
- [ ] Total de arquivos modificados
- [ ] Total de correcoes aplicadas
