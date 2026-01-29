# Manual do Administrador - Focus

## Introdução

Bem-vindo ao Focus, o sistema de gestão escolar que centraliza o acompanhamento de ocorrências disciplinares da sua instituição. Como **Administrador**, você tem acesso completo à gestão da escola, incluindo cadastros, relatórios e análises.

### O que você pode fazer:
- Gerenciar turmas, alunos e professores
- Configurar tipos de ocorrências e sua gravidade
- Visualizar analytics com gráficos interativos
- Gerar relatórios em PDF e Excel
- Configurar alertas automáticos
- Gerenciar períodos acadêmicos e anos letivos

---

## 1. Acessando o Sistema

### 1.1 Primeiro Acesso
Ao ser aprovado no sistema, você recebe um email com uma **senha temporária**.

1. Acesse o sistema pelo navegador
2. Digite seu email e a senha temporária
3. Após o login, acesse **Configurações** no menu para alterar sua senha

### 1.2 Recuperação de Senha
Esqueceu sua senha? Na tela de login:
1. Clique em "Esqueci minha senha"
2. Digite seu email cadastrado
3. Você receberá um link para criar uma nova senha

---

## 2. Navegação

### 2.1 Menu Lateral (Sidebar)
O menu lateral está sempre visível e contém todas as páginas disponíveis:

| Ícone | Página | Descrição |
|-------|--------|-----------|
| 📊 | Visão Geral | Dashboard com resumo e últimas ocorrências |
| 📈 | Analytics | Gráficos interativos e chat com IA |
| 📚 | Turmas | Cadastro e gestão de turmas |
| 🎓 | Alunos | Cadastro e gestão de alunos |
| 👨‍🏫 | Professores | Aprovar solicitações e gerenciar professores |
| 📋 | Tipos de Ocorrências | Definir categorias e gravidade |
| 📅 | Períodos | Configurar bimestres/trimestres |
| 🗓️ | Anos Letivos | Gerenciar anos letivos |
| 📄 | Relatórios | Gerar relatórios por período ou aluno |
| 🔔 | Alertas | Central de notificações |
| ⚙️ | Configurações | Regras de alerta |

### 2.2 Trocar de Instituição
Se você administra mais de uma instituição:
1. Clique no nome da instituição no topo da sidebar
2. Selecione a instituição desejada
3. Os dados serão atualizados automaticamente

---

## 3. Visão Geral

A página inicial mostra um resumo da sua instituição:

### 3.1 Cards de Estatísticas
- **Total de Alunos**: Quantidade de alunos ativos
- **Turmas Ativas**: Quantidade de turmas em funcionamento
- **Professores**: Quantidade de professores vinculados
- **Ocorrências (Mês)**: Total do mês atual, com destaque para graves

### 3.2 Alerta de Ocorrências Graves
Se houver ocorrências graves no mês, um banner vermelho aparecerá com a quantidade.

### 3.3 Ações Rápidas
Atalhos para as tarefas mais comuns:
- Ver Analytics
- Nova Turma
- Novo Aluno
- Gerar Relatório

### 3.4 Últimas Dez Ocorrências
Lista as 10 ocorrências mais recentes, mostrando:
- Nome do aluno e turma
- Tipo da ocorrência
- Data/hora e professor que registrou
- Badge de gravidade (Leve, Média, Grave)

**Dica:** Os dados são atualizados automaticamente quando você volta para essa aba.

---

## 4. Analytics

O painel de Analytics oferece visualizações interativas dos dados de ocorrências.

### 4.1 Filtro de Ano
No topo da página, selecione o ano que deseja analisar. Por padrão, mostra o ano atual.

### 4.2 Gráficos Disponíveis

#### Distribuição por Categoria
Gráfico de barras horizontais mostrando quantidade por tipo de ocorrência.

#### Distribuição por Severidade
Gráfico de rosca (donut) mostrando proporção de Leve, Média e Grave.

#### Distribuição por Nível de Ensino
Gráfico de rosca mostrando ocorrências por Ed. Infantil, Fundamental e Médio.

#### Tendência Mensal
Gráfico de barras mostrando quantidade por mês (Janeiro a Dezembro).

#### Ocorrências por Turma
Ranking de turmas por quantidade de ocorrências.

#### Alunos com Ocorrências
Lista de todos os alunos que tiveram ocorrências, ordenados por quantidade.

### 4.3 Cross-Filtering
Clique em qualquer elemento de um gráfico para filtrar todos os outros. Por exemplo:
- Clique em "Grave" no gráfico de severidade
- Todos os outros gráficos mostrarão apenas ocorrências graves

### 4.4 Chat com IA
Na parte inferior da página, você pode fazer perguntas em português sobre os dados:
- "Quantos alunos tiveram ocorrências em janeiro?"
- "Qual turma tem mais ocorrências graves?"
- "Quais são os tipos de ocorrência mais comuns?"

A IA analisa seus dados e responde em linguagem natural.

---

## 5. Turmas

### 5.1 Criar Nova Turma
1. Clique em "Nova Turma"
2. Preencha:
   - **Nível de Ensino**: Ed. Infantil, Fundamental, Médio ou Personalizado
   - **Série/Ano**: Selecione ou digite
   - **Identificador**: A, B, C... ou personalizado
   - **Turno**: Matutino, Vespertino, Noturno ou Integral
3. O nome da turma é gerado automaticamente (ex: "9º Ano A - Matutino")
4. Clique em "Salvar"

### 5.2 Editar Turma
1. Clique no ícone de lápis na linha da turma
2. Faça as alterações necessárias
3. Clique em "Salvar"

### 5.3 Desativar Turma
1. Clique no ícone de lixeira na linha da turma
2. A turma vai para a Lixeira (pode ser restaurada)

### 5.4 Lixeira
- Turmas desativadas ficam na aba "Lixeira"
- Clique em "Restaurar" para reativar uma turma
- O histórico de ocorrências é preservado

---

## 6. Alunos

### 6.1 Cadastrar Aluno
1. Clique em "Novo Aluno"
2. Preencha:
   - **Nome Completo**: Nome do aluno
   - **Matrícula**: Número de matrícula (opcional)
   - **Turma**: Selecione a turma
3. Clique em "Salvar"

### 6.2 Importar Alunos (Excel)
Para cadastrar vários alunos de uma vez:
1. Clique em "Importar Excel"
2. Baixe o template clicando em "Baixar Template"
3. Preencha a planilha com Nome e Matrícula
4. Faça upload do arquivo preenchido
5. Selecione a turma de destino
6. Clique em "Importar"

### 6.3 Exportar Alunos
1. Clique em "Exportar Excel"
2. Um arquivo com todos os alunos será baixado

### 6.4 Desligar Aluno
Quando um aluno sai da escola:
1. Clique no ícone de desligar na linha do aluno
2. Informe o motivo (opcional)
3. O aluno fica inativo, mas o histórico é preservado

### 6.5 Ver Alunos Inativos
Ative o toggle "Mostrar inativos" para ver alunos desligados e poder reativá-los.

---

## 7. Professores

### 7.1 Solicitações Pendentes
Quando um professor solicita acesso:
1. A solicitação aparece na seção "Solicitações Pendentes"
2. Você pode:
   - **Aprovar**: O professor recebe email com senha temporária
   - **Rejeitar**: Informe o motivo (opcional)

### 7.2 Cadastrar Professor Diretamente
1. Clique em "Adicionar Professor"
2. Preencha nome e email
3. O professor recebe email com senha temporária

### 7.3 Editar Professor
1. Clique no ícone de lápis na linha do professor
2. Altere os dados necessários
3. Clique em "Salvar"

---

## 8. Tipos de Ocorrências

Configure os tipos de ocorrência disponíveis para registro.

### 8.1 Criar Tipo
1. Clique em "Novo Tipo"
2. Preencha:
   - **Categoria**: Nome do tipo (ex: "Atraso", "Briga", "Uso de Celular")
   - **Severidade**: Leve, Média ou Grave
3. Clique em "Salvar"

### 8.2 Severidade
| Nível | Cor | Exemplos |
|-------|-----|----------|
| Leve | Verde | Atraso, Conversa durante aula |
| Média | Amarelo | Uso de celular, Material incompleto |
| Grave | Vermelho | Briga, Vandalismo, Bullying |

---

## 9. Períodos Acadêmicos

Configure os períodos do ano letivo (bimestres, trimestres ou semestres).

### 9.1 Criar Período
1. Clique em "Novo Período"
2. Preencha:
   - **Nome**: Ex: "1º Bimestre", "1º Trimestre"
   - **Data de Início**
   - **Data de Término**
3. Clique em "Salvar"

### 9.2 Dica
Configure todos os períodos do ano letivo no início do ano para facilitar a geração de relatórios.

---

## 10. Anos Letivos

Gerencie os anos letivos da instituição.

### 10.1 Ano Atual
O card destacado mostra o ano letivo em vigor.

### 10.2 Virada de Ano
No final do ano letivo:
1. Clique em "Virada de Ano"
2. Escolha as opções:
   - Arquivar ano atual
   - Criar turmas baseadas no ano anterior
   - Promover alunos automaticamente
   - Copiar períodos acadêmicos
3. Confirme a operação

---

## 11. Relatórios

### 11.1 Relatório por Período
1. Acesse Relatórios > Por Período
2. Clique no período desejado (ex: "1º Bimestre")
3. O sistema gera o relatório em PDF ou Excel

### 11.2 Relatório por Aluno
1. Acesse Relatórios > Por Aluno
2. Busque e selecione o aluno
3. Escolha o período (opcional)
4. Gere o relatório

---

## 12. Alertas

### 12.1 Central de Alertas
Visualize notificações automáticas quando:
- Um aluno atinge X ocorrências em Y dias
- Uma turma atinge um threshold definido
- Ocorrências graves são registradas

### 12.2 Marcar como Lida
Clique no ícone de check para marcar um alerta como lido.

---

## 13. Configurações de Alertas

Crie regras para alertas automáticos.

### 13.1 Criar Regra
1. Clique em "Nova Regra"
2. Configure:
   - **Nome**: Descrição da regra
   - **Escopo**: Aluno específico, Turma ou Toda instituição
   - **Filtro**: Por tipo ou por severidade
   - **Threshold**: Quantidade de ocorrências
   - **Período**: Em quantos dias
3. Clique em "Salvar"

### 13.2 Exemplo de Regra
"Alertar quando qualquer aluno tiver 3 ocorrências graves em 30 dias"

---

## 14. Configurações do Usuário

Acesse pelo ícone de engrenagem no menu.

### 14.1 Alterar Senha
1. Acesse Configurações
2. Digite a nova senha
3. Confirme a senha
4. Clique em "Salvar"

### 14.2 Encerrar Sessão
Clique em "Sair" para fazer logout do sistema.

---

## Perguntas Frequentes

### Como recupero um aluno que foi desligado por engano?
Ative "Mostrar inativos" na página de Alunos, encontre o aluno e clique em "Reativar".

### Posso excluir uma ocorrência?
Não. Ocorrências são preservadas para auditoria. Em caso de erro, o professor pode editar a ocorrência.

### Como vejo quem editou uma ocorrência?
No painel Master, a aba "Logs" mostra todas as alterações com detalhes de antes/depois.

### Posso ter mais de uma instituição?
Sim. Se você for admin de várias escolas, pode alternar entre elas pelo seletor no menu.

---

## Suporte

Em caso de dúvidas ou problemas:
- Contate o administrador master do sistema
- Verifique a documentação online
- Reporte bugs pelo sistema de tickets
