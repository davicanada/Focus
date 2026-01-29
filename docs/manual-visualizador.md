# Manual do Visualizador - Focus

## Introdução

Bem-vindo ao Focus! Como **Visualizador** (Admin Viewer), você tem acesso de leitura aos dados da instituição. Este perfil é ideal para coordenadores, orientadores educacionais ou gestores que precisam acompanhar as ocorrências sem necessidade de fazer alterações.

### O que você pode fazer:
- Visualizar estatísticas e resumos
- Acessar gráficos de analytics
- Gerar relatórios em PDF e Excel
- Visualizar alertas de ocorrências
- Consultar regras de alerta configuradas

### O que você NÃO pode fazer:
- Registrar ou editar ocorrências
- Cadastrar turmas, alunos ou professores
- Alterar configurações da instituição

---

## 1. Acessando o Sistema

### 1.1 Obtendo Acesso
O acesso de Visualizador é concedido pelo Administrador ou Master:
1. Solicite ao administrador da sua instituição
2. Você receberá um email com sua senha temporária
3. Faça login e altere sua senha

### 1.2 Login
1. Acesse a página inicial do Focus
2. Digite seu email e senha
3. Você será direcionado ao painel de Visualizador

### 1.3 Recuperação de Senha
1. Na tela de login, clique em "Esqueci minha senha"
2. Digite seu email
3. Siga as instruções do email

---

## 2. Navegação

### 2.1 Menu Lateral (Sidebar)

| Ícone | Página | Descrição |
|-------|--------|-----------|
| 📊 | Visão Geral | Dashboard com resumo |
| 📈 | Analytics | Gráficos interativos |
| 📄 | Relatórios | Gerar relatórios |
| 🔔 | Alertas | Central de notificações |
| ⚙️ | Configurações | Ver regras de alerta |

### 2.2 Responsividade
O sistema funciona em qualquer dispositivo:
- **Desktop**: Menu lateral sempre visível
- **Mobile/Tablet**: Menu acessível pelo ícone ≡

---

## 3. Visão Geral

A página inicial apresenta um resumo completo da instituição.

### 3.1 Cards de Estatísticas

| Card | Descrição |
|------|-----------|
| Total de Alunos | Quantidade de alunos ativos na instituição |
| Turmas Ativas | Quantidade de turmas em funcionamento |
| Professores | Quantidade de professores vinculados |
| Ocorrências (Mês) | Total de ocorrências no mês atual |

### 3.2 Alerta de Ocorrências Graves
Se houver ocorrências graves no mês, um banner vermelho destaca a quantidade.

### 3.3 Ações Rápidas
Atalhos para:
- **Ver Analytics**: Acessar gráficos
- **Gerar Relatório**: Ir para relatórios

### 3.4 Últimas Dez Ocorrências
Lista as 10 ocorrências mais recentes com:
- Nome do aluno e turma
- Tipo da ocorrência
- Data/hora e professor responsável
- Badge de gravidade (Leve, Média, Grave)

---

## 4. Analytics

O painel de Analytics oferece visualizações completas dos dados.

### 4.1 Filtro de Ano
Selecione o ano que deseja analisar no topo da página.

### 4.2 Gráficos Disponíveis

#### Distribuição por Categoria
Gráfico de barras horizontais mostrando a quantidade de ocorrências por tipo.
- Ordenado do maior para o menor
- Mostra todos os tipos configurados

#### Distribuição por Severidade
Gráfico de rosca mostrando a proporção:
- 🟢 Leve
- 🟡 Média
- 🔴 Grave

#### Distribuição por Nível de Ensino
Gráfico de rosca dividindo por:
- Educação Infantil
- Ensino Fundamental
- Ensino Médio

#### Tendência Mensal
Gráfico de barras mostrando a evolução mês a mês (Janeiro a Dezembro).

#### Ocorrências por Turma
Ranking de turmas por quantidade de ocorrências.
- Turma com mais ocorrências destacada em vermelho
- Turma com menos ocorrências destacada em verde

#### Alunos com Ocorrências
Lista completa de alunos que tiveram ocorrências, ordenados por quantidade.

### 4.3 Cross-Filtering
Os gráficos são interativos:
1. Clique em um elemento de qualquer gráfico
2. Todos os outros gráficos são filtrados automaticamente
3. Clique novamente para remover o filtro

**Exemplo:** Clique em "Grave" no gráfico de severidade para ver apenas ocorrências graves em todos os outros gráficos.

### 4.4 Nota sobre IA
O chat com IA está disponível apenas para Administradores. Como Visualizador, você não terá acesso a essa funcionalidade.

---

## 5. Relatórios

Gere relatórios detalhados para análise ou impressão.

### 5.1 Relatório por Período

Gere relatórios baseados nos períodos acadêmicos configurados.

**Passo a passo:**
1. Acesse Relatórios > Por Período
2. Clique no botão do período desejado (ex: "1º Bimestre")
3. O período atual é destacado com badge "Atual"
4. Escolha o formato: PDF ou Excel
5. O arquivo será baixado automaticamente

**Conteúdo do relatório:**
- Resumo estatístico do período
- Lista de todas as ocorrências
- Gráficos de distribuição
- Ranking de turmas e alunos

### 5.2 Relatório por Aluno

Gere um relatório focado em um aluno específico.

**Passo a passo:**
1. Acesse Relatórios > Por Aluno
2. Busque o aluno pelo nome ou matrícula
3. Selecione o aluno na lista
4. (Opcional) Escolha um período específico
5. Gere o relatório em PDF ou Excel

**Conteúdo do relatório:**
- Dados do aluno
- Histórico completo de ocorrências
- Gráfico de evolução temporal
- Distribuição por tipo e gravidade

### 5.3 Formatos Disponíveis

| Formato | Melhor uso |
|---------|------------|
| PDF | Impressão, arquivo, apresentações |
| Excel | Análise adicional, filtros, gráficos personalizados |

---

## 6. Alertas

Visualize as notificações automáticas geradas pelo sistema.

### 6.1 Central de Alertas
A página mostra todos os alertas gerados quando:
- Um aluno atinge um threshold de ocorrências
- Uma turma atinge um limite configurado
- Ocorrências graves são registradas

### 6.2 Informações do Alerta
Cada alerta mostra:
- Data/hora da geração
- Regra que foi acionada
- Entidade afetada (aluno ou turma)
- Status (lido/não lido)

### 6.3 Marcar como Lido
Clique no ícone de check para marcar um alerta como lido.

### 6.4 Badge de Notificação
O menu lateral mostra um badge vermelho com a quantidade de alertas não lidos.

---

## 7. Configurações de Alertas

Visualize as regras de alerta configuradas (somente leitura).

### 7.1 O que você pode ver
- Nome da regra
- Escopo (aluno, turma ou instituição)
- Tipo de filtro (por tipo ou severidade)
- Threshold (quantidade e período)
- Status (ativa/inativa)

### 7.2 Limitações
Como Visualizador, você **não pode**:
- Criar novas regras
- Editar regras existentes
- Ativar ou desativar regras

Para alterações, contate o Administrador.

---

## 8. Configurações do Usuário

### 8.1 Alterar Senha
1. Acesse Configurações no menu
2. Digite sua nova senha
3. Confirme a senha
4. Clique em "Salvar"

### 8.2 Encerrar Sessão
Clique em "Sair" para fazer logout seguro.

---

## Casos de Uso Comuns

### Acompanhamento Semanal
1. Acesse a Visão Geral para ver o resumo
2. Confira as últimas ocorrências
3. Vá para Analytics para análise detalhada
4. Verifique se há alertas pendentes

### Reunião de Conselho
1. Gere relatório por período (bimestre/trimestre)
2. Analise os gráficos de tendência
3. Identifique turmas ou alunos que precisam de atenção
4. Exporte os dados em Excel para análise adicional

### Acompanhamento de Aluno Específico
1. Acesse Relatórios > Por Aluno
2. Busque o aluno
3. Gere o relatório completo
4. Analise o histórico e evolução

---

## Perguntas Frequentes

### Posso editar ou excluir ocorrências?
Não. O perfil de Visualizador é apenas para consulta. Entre em contato com o Administrador para alterações.

### Posso cadastrar novos alunos ou turmas?
Não. Essas funções são exclusivas do Administrador.

### Por que não vejo o chat com IA?
O chat com IA está disponível apenas para Administradores. Como Visualizador, você tem acesso aos gráficos, mas não à funcionalidade de perguntas.

### Posso exportar os dados dos gráficos?
Use a função de Relatórios para exportar dados em PDF ou Excel. Os gráficos em si não podem ser exportados individualmente.

### Como solicito uma nova regra de alerta?
Entre em contato com o Administrador da instituição informando os critérios desejados.

### Posso ver ocorrências de anos anteriores?
Sim. Use o filtro de ano no Analytics para selecionar o ano desejado. Os relatórios também podem ser gerados para qualquer período.

---

## Suporte

Em caso de dúvidas ou problemas:
- Contate o administrador da sua instituição
- Consulte este manual
- Reporte problemas técnicos ao suporte do sistema
