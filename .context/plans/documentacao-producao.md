---
status: completed
generated: 2026-01-28
agents:
  - type: "documentation-writer"
    role: "Criar manuais de usuário didáticos e PRD atualizado"
phases:
  - id: "phase-1"
    name: "Levantamento de Funcionalidades por Role"
    prevc: "P"
  - id: "phase-2"
    name: "Criação dos Documentos"
    prevc: "E"
  - id: "phase-3"
    name: "Revisão e Finalização"
    prevc: "V"
---

# Documentação para Produção - Manuais e PRD

> Criar documentação completa para lançamento em produção: manuais de usuário para cada role e atualização do PRD do projeto

## Task Snapshot
- **Primary goal:** Documentar todas as funcionalidades do sistema Focus de forma didática para usuários finais
- **Success signal:** Usuários conseguem navegar e utilizar o sistema sem suporte técnico
- **Deliverables:**
  1. `manual-administrador.md` - Manual completo para administradores
  2. `manual-professor.md` - Manual completo para professores
  3. `manual-visualizador.md` - Manual completo para visualizadores
  4. `PRD.md` - Product Requirements Document atualizado

---

## Parte 1: Análise das Funcionalidades por Role

### 1.1 Funcionalidades do Administrador (Admin)

| Página | Funcionalidades |
|--------|-----------------|
| **Visão Geral** (`/admin`) | Stats cards (alunos, turmas, professores, ocorrências), alertas de ocorrências graves, ações rápidas, últimas 10 ocorrências com turma |
| **Analytics** (`/admin/analytics`) | Gráficos interativos (categoria, severidade, nível de ensino, tendência mensal, turmas, alunos), filtro por ano, cross-filtering, AI Chat |
| **Turmas** (`/admin/turmas`) | CRUD de turmas, geração automática de nome, lixeira com restauração |
| **Alunos** (`/admin/alunos`) | CRUD de alunos, import/export Excel, toggle inativos, desligar/reativar |
| **Professores** (`/admin/professores`) | Aprovar/rejeitar solicitações, cadastrar professor direto, editar dados |
| **Tipos de Ocorrências** (`/admin/tipos-ocorrencias`) | CRUD de tipos com categoria e severidade (leve/média/grave) |
| **Períodos** (`/admin/trimestres`) | Configurar bimestres/trimestres/semestres do ano letivo |
| **Anos Letivos** (`/admin/anos-letivos`) | Gerenciar anos letivos, virada de ano, arquivamento |
| **Relatórios** (`/admin/relatorios`) | Relatório por período (seleção visual), relatório por aluno |
| **Alertas** (`/admin/alertas`) | Central de notificações de alertas automáticos |
| **Configurações** (`/admin/configuracoes`) | Regras de alerta (threshold, período, escopo) |
| **Settings** (`/settings`) | Perfil do usuário, logout |

### 1.2 Funcionalidades do Professor

| Página | Funcionalidades |
|--------|-----------------|
| **Visão Geral** (`/professor`) | Stats (minhas ocorrências total/mês, alunos), ações rápidas, minhas últimas 10 ocorrências |
| **Registrar Ocorrência** (`/professor/registrar`) | Selecionar turma, marcar alunos via checkbox, tipo, data/hora, descrição |
| **Minhas Ocorrências** (`/professor/ocorrencias`) | Listar ocorrências registradas, visualizar detalhes, editar (tipo, data/hora, descrição) |
| **Analytics** (`/professor/analytics`) | Visualização dos gráficos (somente leitura) |
| **Settings** (`/settings`) | Perfil do usuário, logout |

### 1.3 Funcionalidades do Visualizador (Admin Viewer)

| Página | Funcionalidades |
|--------|-----------------|
| **Visão Geral** (`/viewer`) | Stats cards, alertas de ocorrências graves, últimas 10 ocorrências |
| **Analytics** (`/viewer/analytics`) | Visualização dos gráficos (somente leitura) |
| **Relatórios** (`/viewer/relatorios`) | Gerar relatórios por período e por aluno |
| **Alertas** (`/viewer/alertas`) | Central de notificações de alertas |
| **Configurações** (`/viewer/configuracoes`) | Visualizar regras de alerta (somente leitura) |
| **Settings** (`/settings`) | Perfil do usuário, logout |

---

## Parte 2: Estrutura dos Manuais

### Estrutura Padrão de Cada Manual

```markdown
# Manual do [Role] - Focus

## Introdução
- O que é o Focus
- Seu papel no sistema

## Acessando o Sistema
- Como fazer login
- Primeiro acesso (senha temporária)
- Recuperação de senha

## Navegação
- Sidebar (menu lateral)
- Trocar de instituição (se aplicável)

## Funcionalidades
### [Seção por página]
- Descrição
- Passo a passo
- Dicas e boas práticas

## Perguntas Frequentes

## Suporte
```

---

## Parte 3: Estrutura do PRD Atualizado

### Seções do PRD

1. **Visão Geral do Produto**
   - Nome, propósito, público-alvo

2. **Problema que Resolve**
   - Dor atual das escolas
   - Como o Focus resolve

3. **Stakeholders e Personas**
   - Master (super admin)
   - Admin (gestor escolar)
   - Professor
   - Visualizador

4. **Funcionalidades Principais**
   - Por módulo/área

5. **Stack Tecnológica**
   - Frontend, Backend, IA, Infra

6. **Modelo de Dados**
   - Tabelas principais e relacionamentos

7. **Segurança e Compliance**
   - RLS, LGPD, soft delete, auditoria

8. **Roadmap Futuro**
   - Funcionalidades planejadas

---

## Checklist de Implementação

### Fase 1: Levantamento
- [x] Mapear funcionalidades do Admin
- [x] Mapear funcionalidades do Professor
- [x] Mapear funcionalidades do Visualizador
- [x] Definir estrutura dos manuais
- [x] Definir estrutura do PRD

### Fase 2: Criação dos Documentos
- [x] Escrever `manual-administrador.md` → `docs/manual-administrador.md`
- [x] Escrever `manual-professor.md` → `docs/manual-professor.md`
- [x] Escrever `manual-visualizador.md` → `docs/manual-visualizador.md`
- [x] Escrever `PRD.md` atualizado → `.context/docs/PRD.md`

### Fase 3: Revisão
- [x] Verificar consistência entre manuais
- [x] Garantir linguagem didática
- [x] PRD atualizado substituiu versão obsoleta

---

## Notas de Implementação

- Usar linguagem simples e direta (pt-BR)
- Evitar jargões técnicos nos manuais de usuário
- Incluir exemplos práticos
- Mencionar atalhos e dicas de produtividade
- PRD deve ser técnico mas compreensível para stakeholders
