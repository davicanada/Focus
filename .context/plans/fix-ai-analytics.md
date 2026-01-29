---
status: waiting-for-user
generated: 2026-01-23
agents:
  - type: "bug-fixer"
    role: "Identificar e corrigir erro de API key invalida"
phases:
  - id: "phase-1"
    name: "Diagnostico"
    prevc: "P"
    status: completed
  - id: "phase-2"
    name: "Melhorar tratamento de erros"
    prevc: "E"
    status: completed
  - id: "phase-3"
    name: "Usuario configura API key"
    prevc: "E"
    status: waiting
  - id: "phase-4"
    name: "Validacao"
    prevc: "V"
    status: pending
---

# Corrigir AI Analytics - API Key

> Corrigir erro "Erro ao processar sua pergunta. Tente novamente." no AI Analytics

## Problema Identificado

A chave da API fornecida (`AIza...REDACTED`) **nao tem acesso** aos modelos Gemini.

### Erro Original
```
[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta
```

### Causa Raiz
A chave e uma Google Cloud API Key, mas o servico Generative Language API nao esta habilitado para ela. Para usar o Gemini, a chave precisa ser gerada no **Google AI Studio**.

## Fase 1: Diagnostico (Concluido)

1. [x] Testada API diretamente via curl
2. [x] Criado script de teste `test-gemini.mjs`
3. [x] Testados multiplos nomes de modelos
4. [x] Confirmado: chave nao tem acesso ao Gemini

## Fase 2: Melhorar Tratamento de Erros (Concluido)

### Alteracoes em `lib/ai/gemini.ts`
- [x] Movida inicializacao do cliente para runtime (evita erro de env vars)
- [x] Adicionadas mensagens de erro especificas:
  - 404/not found → "Gere uma nova chave em https://aistudio.google.com/"
  - 401/403 → "Chave da API invalida"
  - rate/quota → "Limite de requisicoes atingido"
  - network → "Erro de conexao"

### Alteracoes em `components/analytics/AIChat.tsx`
- [x] Adicionado estado `isError` nas mensagens
- [x] Mensagens de erro com estilo visual diferenciado (borda vermelha)
- [x] Icone de alerta em mensagens de erro
- [x] Link clicavel para Google AI Studio quando relevante

### Teste Playwright
- [x] Criado `e2e/ai-analytics.spec.ts` com 3 testes
- [x] Todos os testes passando

## Fase 3: Usuario Configura API Key (AGUARDANDO)

### Passos para o Usuario

1. Acesse **[Google AI Studio](https://aistudio.google.com/)**
2. Faca login com sua conta Google
3. Clique em **"Get API Key"** no menu lateral
4. Clique em **"Create API Key"**
5. Copie a nova chave (formato: `AIza...`)
6. Edite o arquivo `.env.local`:
   ```env
   GEMINI_API_KEY=SUA_NOVA_CHAVE_AQUI
   ```
7. Reinicie o servidor: `npm run dev`
8. Teste com o script: `node test-gemini-key.mjs`

## Fase 4: Validacao (Pendente)

Apos usuario configurar a nova chave:

1. [ ] Executar `node test-gemini-key.mjs` → deve retornar "SUCESSO"
2. [ ] Executar testes Playwright: `npx playwright test e2e/ai-analytics.spec.ts`
3. [ ] Testar no navegador: fazer pergunta no AI Analytics

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `lib/ai/gemini.ts` | Mensagens de erro mais claras |
| `components/analytics/AIChat.tsx` | UI para erros com link |
| `e2e/ai-analytics.spec.ts` | Testes Playwright |
| `test-gemini-key.mjs` | Script para testar a chave |

## Proximos Passos

1. **Usuario:** Gerar nova chave em https://aistudio.google.com/
2. **Usuario:** Atualizar `.env.local` com a nova chave
3. **Usuario:** Reiniciar servidor e testar
