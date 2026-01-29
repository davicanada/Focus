---
status: completed
generated: 2026-01-23
completed: 2026-01-23
agents:
  - type: "database-specialist"
    role: "Executar alterações no schema do banco"
  - type: "frontend-specialist"
    role: "Atualizar tipos TypeScript e componentes"
phases:
  - id: "phase-1"
    name: "Alterações no Banco de Dados"
    prevc: "E"
  - id: "phase-2"
    name: "Atualização do Código TypeScript"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Simplificar Modelo de Ocorrências

> Remover a meta-classificação (disciplinar/pedagogica/administrativa) e usar `category` para armazenar diretamente o tipo da ocorrência (Atraso, Briga, etc.)

## Problema

O modelo anterior tinha redundância:
- `name`: continha o tipo real da ocorrência (Atraso, Briga, Bullying, etc.)
- `category`: continha uma meta-classificação (disciplinar, pedagogica, administrativa)
- `severity`: grau de severidade (leve, media, grave)

O usuário não precisa da meta-classificação. Só precisa saber:
1. **Qual foi a ocorrência** (Atraso, Briga, etc.)
2. **Qual a severidade** (leve, media, grave)

## Estrutura Final

```
occurrence_types:
  - category: "Atraso"  ← tipo da ocorrência (antes era name)
  - severity: "leve"    ← severidade
  - (coluna name removida)
```

## Execução Realizada (23/01/2026)

### Fase 1: Alterações no Banco de Dados ✅

Migrations aplicadas:
1. `simplify_occurrence_types_step1`: Removeu constraint CHECK de category
2. `simplify_occurrence_types_step2_fix`: Aumentou tamanho da coluna category para VARCHAR(100)
3. `simplify_occurrence_types_step3`: Copiou valores de name para category
4. `simplify_occurrence_types_step4`: Removeu coluna name

### Fase 2: Atualização do Código TypeScript ✅

Arquivos atualizados:
- `types/index.ts`:
  - Removido `name` de OccurrenceType
  - Alterado tipo de `category` de union para `string`
  - Removido OCCURRENCE_CATEGORIES constant
  - Alterado DashboardStats.occurrencesByCategory para Record<string, number>

- `app/api/setup/seed/route.ts`: Atualizado para usar apenas `category`
- `app/admin/dashboard/page.tsx`: Removido categoryLabels e categoryKeysFromLabels
- `app/admin/tipos-ocorrencias/page.tsx`: Alterado para usar `category` em vez de `name`
- `app/admin/page.tsx`: Alterado `.name` para `.category`
- `app/admin/relatorios/gerar/page.tsx`: Alterado referências de `name` para `category`
- `app/professor/page.tsx`: Alterado referências de `name` para `category`
- `app/professor/ocorrencias/page.tsx`: Alterado referências de `name` para `category`, removido getCategoryBadge
- `app/professor/registrar/page.tsx`: Alterado dropdown para mostrar `category` diretamente

### Fase 3: Validação ✅

- Build passando sem erros
- Todas as queries atualizadas para usar `category`
- 13 tipos de ocorrência mantidos no banco com a nova estrutura

## Estrutura Final dos Tipos (13 total)

| category | severity |
|----------|----------|
| Atraso | leve |
| Conversa Durante Aula | leve |
| Falta | leve |
| Falta de Material | leve |
| Sem Uniforme | leve |
| Uso de Celular | leve |
| Desrespeito ao Professor | media |
| Indisciplina | media |
| Uso de Palavrões | media |
| Briga | grave |
| Bullying | grave |
| Cola em Prova | grave |
| Vandalismo | grave |
