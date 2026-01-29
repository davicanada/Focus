---
status: completed
generated: 2026-01-23
completed: 2026-01-23
agents:
  - type: "database-specialist"
    role: "Executar alterações no schema e dados"
  - type: "frontend-specialist"
    role: "Atualizar tipos TypeScript se necessário"
phases:
  - id: "phase-1"
    name: "Análise e Planejamento"
    prevc: "P"
  - id: "phase-2"
    name: "Alterações no Banco de Dados"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Correção de Coesão - Sistema de Ocorrências Disciplinares

> Ajustar o sistema para focar apenas em ocorrências negativas/disciplinares, removendo categorias positivas e criando tipos de ocorrência padrão realistas

## Problema Identificado

O sistema atualmente permite registrar ocorrências "positivas" (Participação, Destaque), mas a proposta de valor é ser um **sistema de registro de ocorrências disciplinares**. Isso gera confusão e falta de coesão.

## Situação Atual

### Categorias no Banco
- `disciplinar` - MANTER
- `pedagogica` - MANTER
- `administrativa` - MANTER
- `positiva` - **REMOVER**

### Tipos de Ocorrência Atuais
| Tipo | Categoria | Severidade | Ação |
|------|-----------|------------|------|
| Atraso | disciplinar | leve | MANTER |
| Indisciplina | disciplinar | media | MANTER |
| Briga | disciplinar | grave | MANTER |
| Falta de Material | pedagogica | leve | MANTER |
| Falta | administrativa | leve | MANTER |
| Participacao | positiva | leve | **REMOVER** |
| Destaque | positiva | leve | **REMOVER** |

### Impacto nos Dados
- 132 ocorrências com categoria "positiva" serão removidas
- 307 ocorrências negativas serão mantidas

## Solução Proposta

### Novos Tipos de Ocorrência Padrão
| Tipo | Categoria | Severidade | Notifica Admin |
|------|-----------|------------|----------------|
| Uso de Celular | disciplinar | leve | Não |
| Conversa Durante Aula | disciplinar | leve | Não |
| Sem Uniforme | disciplinar | leve | Não |
| Desrespeito ao Professor | disciplinar | media | Sim |
| Uso de Palavrões | disciplinar | media | Sim |
| Cola em Prova | disciplinar | grave | Sim |
| Bullying | disciplinar | grave | Sim |
| Vandalismo | disciplinar | grave | Sim |

### Alterações Necessárias

1. **Banco de Dados:**
   - Deletar ocorrências com tipos positivos
   - Deletar tipos de ocorrência positivos
   - Alterar constraint de `category` para remover 'positiva'
   - Inserir novos tipos de ocorrência padrão

2. **Código TypeScript:**
   - Atualizar tipo `OccurrenceCategory` em `types/index.ts`

## Fases de Execução

### Fase 1: Limpeza de Dados Positivos
- Deletar ocorrências vinculadas a tipos positivos
- Deletar tipos de ocorrência com categoria 'positiva'

### Fase 2: Alterar Schema
- Remover 'positiva' do constraint de category

### Fase 3: Adicionar Novos Tipos
- Inserir tipos de ocorrência padrão realistas

### Fase 4: Validação
- Verificar integridade dos dados
- Testar dashboard Analytics

## Execução Realizada (23/01/2026)

### Alterações no Banco de Dados ✅
1. Deletadas 132 ocorrências com tipos positivos
2. Deletados 2 tipos de ocorrência positivos (Participação, Destaque)
3. Aplicada migration para alterar constraint de category (removido 'positiva')
4. Inseridos 8 novos tipos de ocorrência padrão realistas

### Tipos de Ocorrência Finais (13 total)
| Tipo | Categoria | Severidade |
|------|-----------|------------|
| Atraso | disciplinar | leve |
| Uso de Celular | disciplinar | leve |
| Conversa Durante Aula | disciplinar | leve |
| Sem Uniforme | disciplinar | leve |
| Falta de Material | pedagogica | leve |
| Falta | administrativa | leve |
| Indisciplina | disciplinar | media |
| Desrespeito ao Professor | disciplinar | media |
| Uso de Palavrões | disciplinar | media |
| Briga | disciplinar | grave |
| Cola em Prova | disciplinar | grave |
| Bullying | disciplinar | grave |
| Vandalismo | disciplinar | grave |

### Alterações no Código TypeScript ✅
1. `types/index.ts`: Removido 'positiva' do tipo OccurrenceType.category
2. `types/index.ts`: Removido 'positiva' de DashboardStats.occurrencesByCategory
3. `types/index.ts`: Removido 'positiva' de OCCURRENCE_CATEGORIES
4. `app/api/setup/seed/route.ts`: Removidos tipos positivos e substituídos por novos tipos
5. `app/admin/dashboard/page.tsx`: Removido 'positiva' dos labels
6. `app/professor/ocorrencias/page.tsx`: Removido 'positiva' do getCategoryBadge

### Validação ✅
- Build passando sem erros
- 307 ocorrências mantidas no banco (todas negativas)
