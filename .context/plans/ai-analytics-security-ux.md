---
status: ready
generated: 2026-01-23
agents:
  - type: "bug-fixer"
    role: "Corrigir validacao SQL que bloqueia queries validas"
  - type: "security-auditor"
    role: "Garantir protecao de dados pessoais e seguranca do banco"
  - type: "feature-developer"
    role: "Implementar respostas em linguagem natural"
phases:
  - id: "phase-1"
    name: "Analise e Diagnostico"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao das Correcoes"
    prevc: "E"
  - id: "phase-3"
    name: "Testes e Validacao"
    prevc: "V"
---

# Correcao de Seguranca e UX do AI Analytics

> Corrigir bugs de validacao SQL, implementar protecao de dados pessoais e melhorar respostas para linguagem natural profissional

## Task Snapshot
- **Primary goal:** Tornar o AI Analytics seguro, confiavel e com respostas naturais
- **Success signal:** Todas as perguntas validas retornam respostas em linguagem natural sem expor dados sensiveis
- **Key references:**
  - `lib/ai/gemini.ts` - Servico de geracao SQL
  - `app/api/ai-analytics/route.ts` - API endpoint
  - `components/analytics/AIChat.tsx` - Interface de chat

## Bugs Identificados

### Bug 1: Validacao SQL Bloqueando Queries Validas
**Sintoma:** Pergunta "quais foram as ultimas 3 ocorrencias?" retorna erro "Apenas consultas SELECT sao permitidas"
**Causa Provavel:** O Gemini 3 Flash esta retornando a query com formatacao (markdown, explicacoes) que nao comeca com SELECT
**Evidencia:** O modelo funciona para algumas queries mas falha em outras

### Bug 2: Respostas Nao Sao em Linguagem Natural
**Sintoma:** Resposta mostra dados brutos em tabela ao inves de texto explicativo
**Causa:** A funcao `explainResults` existe mas pode nao estar sendo chamada ou o resultado nao esta sendo usado corretamente na UI
**Esperado:** "O aluno com mais ocorrencias e Miguel Ribeiro, com 44 ocorrencias registradas."

### Bug 3: Exposicao de Dados Pessoais (Potencial)
**Risco:** O sistema pode expor dados sensiveis como telefone de responsaveis, enderecos, etc.
**Mitigacao:** Restringir colunas que podem ser retornadas

## Plano de Implementacao

### Fase 1 - Analise e Diagnostico

**1.1 Testar o output do Gemini 3 Flash**
- Criar script de teste para verificar exatamente o que o modelo retorna
- Testar com a pergunta problematica "quais foram as ultimas 3 ocorrencias?"
- Identificar se o modelo esta retornando markdown ou explicacoes

**1.2 Verificar fluxo de explainResults**
- Checar se a funcao esta sendo chamada no endpoint
- Verificar se o resultado esta sendo passado para o frontend
- Confirmar que o componente AIChat renderiza a explicacao

### Fase 2 - Implementacao das Correcoes

**2.1 Melhorar Limpeza do Output do Modelo**

Arquivo: `lib/ai/gemini.ts`

```typescript
// Limpar resposta do modelo de forma mais robusta
function cleanSQLResponse(response: string): string {
  let sql = response.trim();

  // Remover blocos de codigo markdown
  sql = sql.replace(/```sql\n?/gi, '');
  sql = sql.replace(/```\n?/gi, '');

  // Remover explicacoes antes/depois do SQL
  // Procurar por SELECT e extrair apenas a query
  const selectMatch = sql.match(/SELECT[\s\S]+?(?:;|$)/i);
  if (selectMatch) {
    sql = selectMatch[0];
  }

  // Remover ponto-e-virgula final (Supabase nao aceita)
  sql = sql.replace(/;\s*$/, '');

  return sql.trim();
}
```

**2.2 Melhorar o Prompt para Respostas Mais Precisas**

Arquivo: `lib/ai/gemini.ts`

Adicionar ao SCHEMA_CONTEXT:
```
IMPORTANTE - FORMATO DA RESPOSTA:
- Responda APENAS com a query SQL
- NAO inclua explicacoes, comentarios ou markdown
- NAO use blocos de codigo (sem ```)
- A query deve comecar diretamente com SELECT
- Termine a query com ponto-e-virgula
```

**2.3 Proteger Dados Pessoais**

Arquivo: `lib/ai/gemini.ts`

Adicionar ao prompt:
```
COLUNAS PROIBIDAS (nunca inclua na query):
- guardian_phone (telefone do responsavel)
- guardian_name (nome do responsavel)
- birth_date (data de nascimento)
- email (email de usuarios)
- full_address (endereco completo)

COLUNAS PERMITIDAS:
- Nomes de alunos (full_name em students)
- Nomes de turmas e instituicoes
- Dados de ocorrencias (data, descricao, categoria, severidade)
- Contagens e agregacoes
```

Adicionar validacao pos-query:
```typescript
const BLOCKED_COLUMNS = [
  'guardian_phone', 'guardian_name', 'birth_date',
  'email', 'full_address', 'password'
];

function validateNoSensitiveData(query: string): boolean {
  const upperQuery = query.toUpperCase();
  for (const col of BLOCKED_COLUMNS) {
    if (upperQuery.includes(col.toUpperCase())) {
      return false;
    }
  }
  return true;
}
```

**2.4 Garantir Respostas em Linguagem Natural**

Arquivo: `app/api/ai-analytics/route.ts`

Verificar que explainResults esta sendo chamada:
```typescript
// Apos executar a query
const explanation = await explainResults(question, data, query);

return NextResponse.json({
  success: true,
  query,
  data,
  explanation // Deve sempre ter uma explicacao
});
```

Arquivo: `components/analytics/AIChat.tsx`

Garantir que a explicacao e exibida como resposta principal:
- A explicacao deve ser o conteudo principal da mensagem
- Os dados brutos devem ser secundarios/colapsaveis

**2.5 Melhorar Prompt de Explicacao**

Arquivo: `lib/ai/gemini.ts`

```typescript
export async function explainResults(...) {
  const prompt = `Voce e um analista de dados escolar experiente e amigavel.

O usuario perguntou: "${question}"

Dados encontrados:
${JSON.stringify(data.slice(0, 10), null, 2)}
${data.length > 10 ? `\n... e mais ${data.length - 10} registros` : ''}

INSTRUCOES:
1. Responda de forma natural e profissional, como um analista conversando
2. Use linguagem clara e direta em portugues brasileiro
3. Destaque os numeros importantes
4. Se nao houver dados, explique gentilmente
5. NAO mencione SQL, JSON, banco de dados ou termos tecnicos
6. NAO liste os dados em formato de tabela
7. Seja conciso (2-3 frases no maximo)

Exemplos de boas respostas:
- "Encontrei 3 ocorrencias recentes. A mais recente foi um atraso do aluno Joao no dia 15/01."
- "O aluno com mais ocorrencias e Miguel Ribeiro, com 44 registros no total."
- "Sua escola tem 156 alunos ativos distribuidos em 8 turmas."
`;
}
```

### Fase 3 - Testes e Validacao

**3.1 Testes Manuais**

Perguntas a testar:
| Pergunta | Esperado |
|----------|----------|
| "quais foram as ultimas 3 ocorrencias?" | Resposta natural com 3 ocorrencias |
| "quantos alunos temos?" | Resposta natural com contagem |
| "quem e o aluno com mais ocorrencias?" | Resposta natural com nome e numero |
| "qual o telefone dos responsaveis?" | Bloqueio - dado sensivel |
| "liste os emails dos professores" | Bloqueio - dado sensivel |
| "quais turmas tem mais alunos?" | Resposta natural com ranking |

**3.2 Verificacao de Seguranca**

- Confirmar que nenhuma query com colunas sensiveis e executada
- Verificar logs de tentativas bloqueadas
- Testar SQL injection (deve ser bloqueado)

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `lib/ai/gemini.ts` | Melhorar limpeza, prompt e validacao |
| `app/api/ai-analytics/route.ts` | Garantir retorno de explicacao |
| `components/analytics/AIChat.tsx` | Exibir explicacao como resposta principal |

## Criterios de Sucesso

- [x] Todas as perguntas validas retornam respostas em linguagem natural
- [x] Dados pessoais (telefone, email, endereco) nunca sao expostos
- [x] Nenhuma operacao de modificacao e possivel (DELETE, UPDATE, etc.)
- [x] Respostas sao profissionais e amigaveis
- [x] Build passa sem erros

## Resultados dos Testes (23/01/2026)

### Queries Testadas com Sucesso
| Pergunta | Resultado |
|----------|-----------|
| "quais foram as ultimas 3 ocorrencias?" | OK - Retornou dados e explicacao natural |
| "quem e o aluno com mais ocorrencias?" | OK - Miguel Ribeiro com 44 ocorrencias |
| "liste os emails dos professores" | OK - Retornou nomes SEM emails (protegido) |
| "quantas turmas temos?" | OK - 6 turmas |

### Limitacao Importante
O Gemini 3 Flash no free tier tem limite de **20 requisicoes por dia por modelo**.
Apos atingir o limite, o sistema retorna: "Limite de requisicoes da API atingido. Tente novamente em alguns minutos."

### Recomendacoes
1. Para uso em producao, considerar upgrade para plano pago do Google AI
2. Ou usar modelo com maior cota no free tier (ex: gemini-2.5-flash)
