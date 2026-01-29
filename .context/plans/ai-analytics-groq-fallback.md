---
status: completed
generated: 2026-01-23
agents:
  - type: "feature-developer"
    role: "Substituir OpenAI por Groq no sistema de fallback"
  - type: "test-writer"
    role: "Atualizar e executar testes E2E"
phases:
  - id: "phase-1"
    name: "Configuracao Groq"
    prevc: "P"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-3"
    name: "Testes e Validacao"
    prevc: "V"
---

# Substituir OpenAI por Groq como Fallback

> Substituir o provider OpenAI pelo Groq (llama-3.3-70b-versatile) como fallback quando Gemini atingir rate limit

## Task Snapshot
- **Primary goal:** Usar Groq como fallback gratuito em vez de OpenAI (que requer creditos)
- **Success signal:** AI Analytics funciona com Gemini primario e Groq como fallback
- **Key references:**
  - `lib/ai/openai.ts` - Arquivo a ser substituido
  - `lib/ai/index.ts` - Orquestracao do fallback
  - Groq API: https://console.groq.com/docs/quickstart

## Motivacao

O usuario nao possui creditos na OpenAI, entao precisamos usar um provider gratuito.
Groq oferece acesso gratuito ao modelo llama-3.3-70b-versatile com limite generoso de requisicoes.

## Comparacao de Providers

| Provider | Modelo | Limite Free Tier | Status |
|----------|--------|------------------|--------|
| Gemini | gemini-3-flash-preview | 20 req/dia | Primario |
| ~~OpenAI~~ | ~~gpt-3.5-turbo~~ | ~~Requer creditos~~ | ~~Removido~~ |
| **Groq** | **llama-3.3-70b-versatile** | **30 req/min** | **Novo Fallback** |

## Plano de Implementacao

### Fase 1 - Configuracao

**1.1 Instalar SDK Groq**
```bash
npm install groq-sdk
```

**1.2 Atualizar variaveis de ambiente**
```env
# .env.local
GROQ_API_KEY=your_groq_api_key
```

```env
# .env.local.example
GROQ_API_KEY=your_groq_api_key
```

### Fase 2 - Implementacao

**2.1 Renomear/Substituir arquivo**
- DELETAR: `lib/ai/openai.ts`
- CRIAR: `lib/ai/groq.ts`

**2.2 Estrutura do `lib/ai/groq.ts`**

```typescript
import Groq from 'groq-sdk';
import {
  SCHEMA_CONTEXT,
  EXPLANATION_PROMPT,
  extractSQL,
  validateSQL,
  getFallbackExplanation,
  SQLGenerationResult,
} from './shared';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }
  return new Groq({ apiKey });
}

export async function generateSQLWithGroq(
  question: string,
  institutionId: string
): Promise<SQLGenerationResult> {
  const groq = getGroqClient();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SCHEMA_CONTEXT },
      { role: 'user', content: `Pergunta: "${question}"\n\nSQL:` }
    ],
    temperature: 0,
    max_tokens: 500
  });

  // ... validacao igual ao OpenAI
}

export async function explainResultsWithGroq(
  question: string,
  data: any[]
): Promise<string> {
  // ... similar ao OpenAI
}
```

**2.3 Atualizar `lib/ai/index.ts`**
- Substituir imports de `openai` para `groq`
- Trocar `generateSQLWithOpenAI` por `generateSQLWithGroq`
- Trocar `explainResultsWithOpenAI` por `explainResultsWithGroq`
- Atualizar provider name de `'openai'` para `'groq'`

**2.4 Atualizar `lib/ai/shared.ts`**
- Atualizar tipo `AIProvider` de `'gemini' | 'openai'` para `'gemini' | 'groq'`

### Fase 3 - Limpeza

**3.1 Remover dependencias nao utilizadas**
```bash
npm uninstall openai
```

**3.2 Atualizar `.env.local.example`**
- Remover `OPENAI_API_KEY`
- Adicionar `GROQ_API_KEY`

**3.3 Atualizar documentacao**
- `CLAUDE.md` - Atualizar stack e variaveis de ambiente
- `.context/plans/ai-analytics-fallback-chatgpt.md` - Marcar como obsoleto

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `lib/ai/openai.ts` | DELETAR |
| `lib/ai/groq.ts` | CRIAR |
| `lib/ai/index.ts` | MODIFICAR - Trocar OpenAI por Groq |
| `lib/ai/shared.ts` | MODIFICAR - Atualizar tipo AIProvider |
| `.env.local` | MODIFICAR - Adicionar GROQ_API_KEY, remover OPENAI_API_KEY |
| `.env.local.example` | MODIFICAR - Trocar OPENAI por GROQ |
| `package.json` | MODIFICAR - Trocar openai por groq-sdk |
| `CLAUDE.md` | MODIFICAR - Atualizar documentacao |

## Variaveis de Ambiente

```env
# Antes
OPENAI_API_KEY=sk-proj-...

# Depois
GROQ_API_KEY=your_groq_api_key
```

## Testes

Apos implementacao, executar:
```bash
npx playwright test e2e/ai-analytics.spec.ts --grep "API Tests"
```

Todos os 7 testes devem passar.

## Criterios de Sucesso

- [x] SDK Groq instalado
- [x] Arquivo `lib/ai/groq.ts` criado
- [x] Arquivo `lib/ai/openai.ts` deletado
- [x] `lib/ai/index.ts` atualizado para usar Groq
- [x] `.env.local` com GROQ_API_KEY
- [x] Dependencia `openai` removida do package.json
- [x] Build passando sem erros
- [x] Testes E2E passando (7/7)

## Resultados dos Testes (23/01/2026)

```
Running 7 tests using 1 worker

✓  1 should return valid SQL for normal query (3.2s) - provider: groq
✓  2 should block sensitive data - phone numbers (23ms) - LGPD response
✓  3 should block sensitive data - email addresses (25ms) - LGPD response
✓  4 should block sensitive data - birth dates (28ms) - LGPD response
✓  5 should block sensitive data - addresses (29ms) - LGPD response
✓  6 should handle complex queries with JOINs (1.3s) - provider: groq
✓  7 should return provider information (963ms) - provider: groq

7 passed (7.0s)
```

**Status: COMPLETO**
