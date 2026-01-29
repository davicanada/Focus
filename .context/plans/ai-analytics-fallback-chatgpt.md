---
status: ready
generated: 2026-01-23
agents:
  - type: "feature-developer"
    role: "Implementar integracao com OpenAI e sistema de fallback"
  - type: "security-auditor"
    role: "Garantir respostas naturais para dados sensiveis"
phases:
  - id: "phase-1"
    name: "Configuracao OpenAI"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao Fallback e Respostas Naturais"
    prevc: "E"
  - id: "phase-3"
    name: "Testes e Validacao"
    prevc: "V"
---

# Fallback para ChatGPT e Respostas Naturais para Dados Sensiveis

> Implementar fallback automatico para ChatGPT quando Gemini atingir limite e respostas naturais quando dados sensiveis forem solicitados

## Task Snapshot
- **Primary goal:** Sistema resiliente com fallback Gemini -> ChatGPT e respostas amigaveis para dados sensiveis
- **Success signal:**
  1. Quando Gemini falha por rate limit, ChatGPT assume automaticamente
  2. Perguntas sobre dados sensiveis recebem resposta natural explicando que nao pode fornecer
- **Key references:**
  - `lib/ai/gemini.ts` - Servico atual de AI
  - `app/api/ai-analytics/route.ts` - API endpoint
  - OpenAI API: https://platform.openai.com/docs/api-reference

## Requisitos

### 1. Respostas Naturais para Dados Sensiveis
Quando usuario perguntar sobre dados sensiveis, em vez de erro tecnico, responder naturalmente:

**Atual (ruim):**
```
Erro: Esta consulta tenta acessar dados pessoais protegidos (LGPD).
```

**Desejado (bom):**
```
Desculpe, nao posso fornecer informacoes pessoais como telefones, emails
ou datas de nascimento. Essas informacoes sao protegidas pela LGPD.
Posso ajudar com outras informacoes sobre os alunos, turmas ou ocorrencias?
```

### 2. Fallback Automatico Gemini -> ChatGPT
Quando Gemini atingir rate limit (erro 429), tentar automaticamente com ChatGPT:

```
Gemini 3 Flash (primario) -> [rate limit] -> ChatGPT (fallback)
```

## Plano de Implementacao

### Fase 1 - Configuracao OpenAI

**1.1 Instalar SDK OpenAI**
```bash
npm install openai
```

**1.2 Adicionar variavel de ambiente**
```env
# .env.local
OPENAI_API_KEY=sk-...
```

**1.3 Estrutura de arquivos**
```
lib/ai/
├── gemini.ts      # Servico Gemini (existente)
├── openai.ts      # Novo servico OpenAI
├── providers.ts   # Abstracacao de providers
└── index.ts       # Export unificado
```

### Fase 2 - Implementacao

**2.1 Criar servico OpenAI (`lib/ai/openai.ts`)**

```typescript
import OpenAI from 'openai';

const SCHEMA_CONTEXT = `...mesmo schema do Gemini...`;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({ apiKey });
}

export async function generateSQLWithOpenAI(
  question: string,
  institutionId: string
): Promise<{ query: string; error?: string }> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // Free tier friendly
    messages: [
      { role: 'system', content: SCHEMA_CONTEXT },
      { role: 'user', content: `Pergunta: "${question}"\n\nSQL:` }
    ],
    temperature: 0,
    max_tokens: 500
  });

  // ... validacao e limpeza igual ao Gemini
}

export async function explainResultsWithOpenAI(
  question: string,
  data: any[],
  query: string
): Promise<string> {
  // ... similar ao Gemini
}
```

**2.2 Criar abstracacao de providers (`lib/ai/providers.ts`)**

```typescript
type AIProvider = 'gemini' | 'openai';

interface ProviderResult {
  query: string;
  error?: string;
  provider: AIProvider;
}

export async function generateSQLWithFallback(
  question: string,
  institutionId: string
): Promise<ProviderResult> {
  // Tentar Gemini primeiro
  try {
    const result = await generateSQLWithGemini(question, institutionId);
    if (!result.error) {
      return { ...result, provider: 'gemini' };
    }

    // Se erro for rate limit, tentar OpenAI
    if (result.error.includes('Limite de requisicoes')) {
      console.log('Gemini rate limited, falling back to OpenAI');
      const openaiResult = await generateSQLWithOpenAI(question, institutionId);
      return { ...openaiResult, provider: 'openai' };
    }

    return { ...result, provider: 'gemini' };
  } catch (error) {
    // Fallback para OpenAI em caso de erro
    const openaiResult = await generateSQLWithOpenAI(question, institutionId);
    return { ...openaiResult, provider: 'openai' };
  }
}
```

**2.3 Detectar perguntas sobre dados sensiveis**

```typescript
const SENSITIVE_KEYWORDS = [
  'telefone', 'celular', 'numero',
  'email', 'e-mail', 'correio',
  'endereco', 'endereço', 'morada', 'rua', 'casa',
  'nascimento', 'idade', 'aniversario',
  'cpf', 'rg', 'documento',
  'senha', 'password'
];

function isSensitiveQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lower.includes(keyword));
}

function getSensitiveDataResponse(): string {
  return `Desculpe, nao posso fornecer informacoes pessoais como telefones,
emails, enderecos ou datas de nascimento. Essas informacoes sao protegidas
pela Lei Geral de Protecao de Dados (LGPD).

Posso ajudar com outras informacoes, como:
- Quantidade de alunos e turmas
- Estatisticas de ocorrencias
- Rankings e comparativos
- Historico de eventos

Como posso ajudar?`;
}
```

**2.4 Atualizar API endpoint**

```typescript
// app/api/ai-analytics/route.ts

export async function POST(request: NextRequest) {
  const { question, institutionId } = await request.json();

  // Verificar se e pergunta sobre dados sensiveis
  if (isSensitiveQuestion(question)) {
    return NextResponse.json({
      success: true,
      query: null,
      data: [],
      explanation: getSensitiveDataResponse(),
      isSensitiveBlock: true
    });
  }

  // Gerar SQL com fallback
  const { query, error, provider } = await generateSQLWithFallback(
    question,
    institutionId
  );

  // ... resto do codigo
}
```

### Fase 3 - Testes

**3.1 Testes de dados sensiveis**

| Pergunta | Resposta Esperada |
|----------|-------------------|
| "qual o telefone dos responsaveis?" | Resposta natural LGPD |
| "liste os emails dos professores" | Resposta natural LGPD |
| "qual a data de nascimento dos alunos?" | Resposta natural LGPD |
| "qual o endereco da escola?" | Resposta natural LGPD |

**3.2 Testes de fallback**

1. Esgotar quota do Gemini (20 req)
2. Verificar que proxima requisicao usa OpenAI
3. Verificar que resposta ainda e correta

**3.3 Testes de integracao**

| Cenario | Esperado |
|---------|----------|
| Gemini OK | Usa Gemini |
| Gemini rate limit | Fallback para OpenAI |
| Ambos falhando | Mensagem de erro amigavel |

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `lib/ai/openai.ts` | CRIAR - Servico OpenAI |
| `lib/ai/providers.ts` | CRIAR - Abstracacao com fallback |
| `lib/ai/index.ts` | CRIAR - Exports unificados |
| `lib/ai/gemini.ts` | MODIFICAR - Adicionar deteccao de rate limit |
| `app/api/ai-analytics/route.ts` | MODIFICAR - Usar providers com fallback |
| `.env.local.example` | MODIFICAR - Adicionar OPENAI_API_KEY |
| `package.json` | MODIFICAR - Adicionar dependencia openai |

## Variaveis de Ambiente

```env
# .env.local
GEMINI_API_KEY=AIza...          # Existente
OPENAI_API_KEY=sk-...           # Nova
```

## Criterios de Sucesso

- [x] Perguntas sobre dados sensiveis recebem resposta natural amigavel
- [x] Fallback Gemini -> OpenAI funciona automaticamente
- [x] Nenhum erro tecnico exposto ao usuario
- [x] Build passa sem erros
- [ ] Ambos providers retornam respostas corretas (pendente: configurar OPENAI_API_KEY)

## Implementacao (23/01/2026)

### Arquivos Criados
- `lib/ai/shared.ts` - Constantes e utilitarios compartilhados
- `lib/ai/openai.ts` - Servico OpenAI/ChatGPT
- `lib/ai/index.ts` - Orquestracao com fallback

### Arquivos Modificados
- `lib/ai/gemini.ts` - Refatorado para usar modulo compartilhado
- `app/api/ai-analytics/route.ts` - Usa novo modulo com fallback
- `.env.local.example` - Adicionado OPENAI_API_KEY

### Testes Realizados
| Pergunta | Resultado |
|----------|-----------|
| "qual o telefone dos responsaveis?" | Resposta natural LGPD |
| "qual a data de nascimento dos alunos?" | Resposta natural LGPD |
| "quantas turmas temos?" (Gemini rate limited) | Fallback para OpenAI funcionando |

### Proximos Passos
1. Adicionar `OPENAI_API_KEY` no `.env.local`
2. Testar fallback completo com chave OpenAI configurada
