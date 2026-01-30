---
status: active
generated: 2026-01-30
type: research
agents:
  - type: "security-auditor"
    role: "Avaliar riscos legais e éticos de perguntas julgamentais"
---

# Filtro de Perguntas Prejudiciais/Julgamentais no AI Analytics

> Bloquear perguntas que emitam juízo de valor sobre alunos para proteger dignidade de menores

## O Problema

Hoje a IA responde perguntas como:
- "Qual o pior aluno da escola?"
- "Quem é o aluno mais problemático?"
- "Qual o aluno mais indisciplinado?"

Mesmo com a anonimização LGPD (Aluno 1, Aluno 2), o frontend resolve os nomes. O resultado final é: **a IA classifica crianças com rótulos negativos**.

## Análise Legal

### ECA (Estatuto da Criança e do Adolescente)
- **Art. 17** — Direito ao respeito: inviolabilidade da integridade física, psíquica e moral, incluindo preservação da imagem e identidade
- **Art. 18** — Dever de todos velar pela dignidade da criança, pondo-a a salvo de tratamento desumano, vexatório ou constrangedor
- **Art. 53** — Direito de ser respeitado por seus educadores

### LGPD (Lei Geral de Proteção de Dados)
- **Art. 6, IV** — Princípio da não-discriminação: impossibilidade de tratamento para fins discriminatórios ilícitos ou abusivos
- **Art. 14** — Tratamento de dados de menores deve ser realizado no melhor interesse da criança

### Conclusão Legal
Não há lei que proíba explicitamente a pergunta "qual o pior aluno". Mas:
1. Classificar crianças com rótulos negativos via IA pode ser interpretado como **tratamento discriminatório** (LGPD Art. 6, IV)
2. Pode violar o **princípio do melhor interesse** da criança (LGPD Art. 14)
3. Se o rótulo vaza, configura **exposição vexatória** (ECA Art. 18)

**Recomendação: bloquear e redirecionar.** Não é ilegal perguntar, mas a ferramenta não deve facilitar a criação de rótulos negativos sobre menores.

## Estratégia de Implementação

### Duas categorias de perguntas a filtrar:

**1. Perguntas com juízo de valor direto (BLOQUEAR)**
- "pior aluno", "pior estudante"
- "aluno mais problemático/indisciplinado/bagunceiro"
- "aluno que mais atrapalha"
- "quem é o pior", "quem dá mais trabalho"

**2. Perguntas estatísticas legítimas (PERMITIR, já anonimizadas)**
- "aluno com mais ocorrências" → OK, é dado factual anonimizado
- "quantas ocorrências por turma" → OK, agregado
- "top 3 alunos com mais ocorrências" → OK, factual

### Diferença-chave
- "Quem tem mais ocorrências?" → **factual** (dado numérico, sem julgamento)
- "Quem é o pior aluno?" → **julgamental** (rótulo de valor sobre a pessoa)

A IA deve fornecer dados, não emitir juízos sobre crianças.

## Resposta ao Bloqueio

Quando detectar pergunta julgamental, retornar:

> "Não posso classificar alunos com rótulos como 'pior', 'mais problemático' ou similares. Isso viola o princípio de proteção à dignidade da criança (ECA Art. 17).
>
> Posso ajudar com dados objetivos, como:
> - Alunos com maior número de ocorrências no período
> - Distribuição de ocorrências por turma
> - Evolução mensal de ocorrências
>
> Reformule sua pergunta usando termos objetivos."

## Palavras-chave a Filtrar

```
JUDGMENTAL_KEYWORDS (bloquear quando no contexto de aluno/estudante):
- pior, piores
- problemático, problematico, problematica
- indisciplinado, indisciplinada
- bagunceiro, bagunceira
- terrível, terrivel
- insuportável, insuportavel
- difícil, dificil (no contexto "aluno mais difícil")
- atrapalha, atrapalhar
- pestinha, encrenqueiro
- mal comportado, mal-comportado, mau comportamento
```

## Arquivos a Modificar

1. `lib/ai/shared.ts` — Nova constante `JUDGMENTAL_KEYWORDS`, nova função `isJudgmentalQuestion()`
2. `lib/ai/index.ts` — Integrar check antes de gerar SQL
3. Resposta dedicada (diferente da resposta LGPD de dados pessoais)
