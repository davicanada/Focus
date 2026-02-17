---
status: ready
generated: 2026-02-05
priority: high
complexity: small
agents:
  - type: "bug-fixer"
    role: "Corrigir a lógica de detecção de palavras sensíveis"
  - type: "test-writer"
    role: "Adicionar testes para validar word boundaries"
---

# Corrigir detecção de palavras sensíveis no AI Analytics

> A função `isSensitiveQuestion` usa `.includes()` que detecta substrings, causando falsos positivos quando palavras como "quantidade" contêm "idade". Solução: usar regex com word boundaries.

## Problema Reportado

**Pergunta do usuário:** "Qual a turma com maior quantidade de ocorrências?"

**Resposta incorreta da IA:**
> "Desculpe, não posso fornecer informações pessoais como telefones, emails, endereços ou datas de nascimento..."

**Comportamento esperado:** A IA deveria responder com a turma que tem mais ocorrências, pois é uma pergunta estatística legítima sobre turmas.

## Diagnóstico

### Causa Raiz

O arquivo `lib/ai/shared.ts` contém:

```typescript
export const SENSITIVE_KEYWORDS = [
  // ...
  'nascimento', 'idade', 'aniversario', 'quantos anos',
  // ...
];

export function isSensitiveQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => lower.includes(keyword));
}
```

O problema é que `.includes('idade')` retorna `true` para "quantidade" porque:
- "quant**idade**" contém a substring "idade"

### Palavras Afetadas

Este bug afeta qualquer pergunta contendo:
| Palavra legítima | Keyword detectada |
|------------------|-------------------|
| quantidade | idade |
| qualidade | idade |
| realidade | idade |
| atividade | idade |
| contato (legítimo em contexto de "entrar em contato com a escola") | contato |

## Solução Proposta

### Opção 1: Regex com Word Boundaries (Recomendada)

Usar `\b` para garantir que apenas palavras inteiras sejam detectadas:

```typescript
export function isSensitiveQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => {
    // Criar regex com word boundaries para evitar falsos positivos
    // Ex: "idade" não deve casar com "quantidade"
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    return regex.test(lower);
  });
}

// Helper para escapar caracteres especiais de regex
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Opção 2: Lista de exceções

Manter `.includes()` mas adicionar exceções:

```typescript
const SAFE_WORDS = ['quantidade', 'qualidade', 'realidade', 'atividade'];

export function isSensitiveQuestion(question: string): boolean {
  const lower = question.toLowerCase();

  // Verificar se contém palavras seguras que poderiam causar falso positivo
  for (const safeWord of SAFE_WORDS) {
    if (lower.includes(safeWord)) {
      return false; // Não é sensível, é uma palavra composta legítima
    }
  }

  return SENSITIVE_KEYWORDS.some(keyword => lower.includes(keyword));
}
```

**Recomendação:** Opção 1 é mais robusta e não requer manutenção de lista de exceções.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `lib/ai/shared.ts` | Atualizar `isSensitiveQuestion()` para usar regex com word boundaries |

## Testes a Adicionar

Verificar que estas perguntas **NÃO** são bloqueadas:
- "Qual a turma com maior quantidade de ocorrências?"
- "Qual a quantidade de alunos por turma?"
- "Quantas ocorrências de cada tipo?"
- "Total de atividades registradas"

Verificar que estas perguntas **SÃO** bloqueadas:
- "Qual a idade dos alunos?"
- "Qual o telefone do responsável?"
- "Qual o email do professor?"
- "Qual o endereço da escola?"

## Passos de Implementação

1. **Modificar `lib/ai/shared.ts`:**
   - Criar função auxiliar `escapeRegex()`
   - Atualizar `isSensitiveQuestion()` para usar regex com `\b`

2. **Testar manualmente:**
   - Fazer login como admin
   - Ir em Analytics > AI Chat
   - Perguntar "Qual a turma com maior quantidade de ocorrências?"
   - Confirmar que retorna dados corretos

3. **Atualizar testes E2E (opcional):**
   - Adicionar caso de teste em `e2e/ai-analytics.spec.ts` para validar word boundaries

## Impacto

- **Risco:** Baixo - alteração pontual em uma função de validação
- **Rollback:** Simples - reverter o commit se necessário
- **Usuários afetados:** Todos que usam AI Analytics
