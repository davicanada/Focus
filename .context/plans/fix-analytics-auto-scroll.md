---
status: completed
generated: 2026-01-28
agents:
  - type: "bug-fixer"
    role: "Identificar e corrigir o bug de scroll automatico"
  - type: "frontend-specialist"
    role: "Implementar a correcao de UX"
---

# Investigar e Corrigir Scroll Automatico na Pagina Analytics

> A pagina Analytics esta scrollando automaticamente para baixo ao ser aberta. Investigar a causa raiz e corrigir para que a pagina abra no topo.

## Task Snapshot
- **Primary goal:** Corrigir o scroll automatico para que a pagina abra no topo
- **Success signal:** Ao clicar na aba Analytics, a pagina abre no topo e nao desliza automaticamente
- **Afeta:** Admin, Professor e Viewer

## Analise da Causa Raiz

### Problema Identificado

O componente `AIChat` (`components/analytics/AIChat.tsx`) possui um `useEffect` que chama `scrollIntoView()` sempre que o estado `messages` muda:

```typescript
// Linhas 39-45 do AIChat.tsx
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

useEffect(() => {
  scrollToBottom();
}, [messages]);
```

### Fluxo do Bug

1. Usuario clica na aba "Analytics"
2. A pagina `AnalyticsDashboard` e renderizada
3. O componente `AIChat` e montado (linha 1209 do AnalyticsDashboard.tsx)
4. O estado `messages` e inicializado com uma mensagem de boas-vindas (linhas 27-34)
5. O `useEffect` observa `messages` e executa imediatamente na montagem
6. `scrollIntoView()` e chamado no elemento `messagesEndRef` (linha 177)
7. **O `scrollIntoView()` sem opcoes especificas faz scroll na pagina TODA**, nao apenas dentro do container do chat
8. Como o `AIChat` esta no final da pagina, a tela desliza para baixo

### Codigo Problematico

```typescript
// AIChat.tsx - Inicializacao do estado (executa na montagem)
const [messages, setMessages] = useState<Message[]>([
  {
    id: '0',
    role: 'assistant',
    content: 'Ola! Sou o assistente de analytics...',
    timestamp: new Date(),
  },
]);

// useEffect que dispara na montagem
useEffect(() => {
  scrollToBottom(); // <-- PROBLEMA: executa mesmo na montagem inicial
}, [messages]);

// Funcao que faz scroll na pagina toda
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); // <-- scrollIntoView afeta a viewport
};
```

### Localizacao do AIChat na Pagina

```typescript
// AnalyticsDashboard.tsx - Linha 1207-1210
{/* AI Analytics Chat - ULTIMO ELEMENTO DA PAGINA */}
{currentInstitution && (
  <AIChat institutionId={currentInstitution.id} />
)}
```

## Solucao Proposta

### Opcao 1: Evitar scroll na montagem inicial (RECOMENDADA)

Adicionar um ref para rastrear se e a montagem inicial e so fazer scroll em mensagens subsequentes:

```typescript
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return; // Nao faz scroll na montagem inicial
  }
  scrollToBottom();
}, [messages]);
```

### Opcao 2: Usar scrollTop no container ao inves de scrollIntoView

Fazer scroll apenas dentro do container do chat, nao na pagina:

```typescript
const containerRef = useRef<HTMLDivElement>(null);

const scrollToBottom = () => {
  if (containerRef.current) {
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }
};

// No JSX:
<CardContent ref={containerRef} className="flex-1 overflow-y-auto">
```

### Opcao 3: Usar block: 'nearest' no scrollIntoView

Limitar o scroll ao container mais proximo:

```typescript
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest' // Nao afeta scroll da pagina principal
  });
};
```

## Arquivos Afetados

| Arquivo | Modificacao |
| --- | --- |
| `components/analytics/AIChat.tsx` | Corrigir logica de scroll |

## Implementacao

A Opcao 1 e a mais simples e efetiva - apenas evita o scroll na montagem inicial, mantendo o comportamento correto quando novas mensagens sao adicionadas.

## Validacao

1. Abrir a pagina Analytics como Admin
2. Verificar que a pagina abre no topo
3. Enviar uma mensagem no chat
4. Verificar que o chat faz scroll para a resposta
5. Repetir para Professor e Viewer
