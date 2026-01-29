'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface AIChatProps {
  institutionId: string;
}

// Exemplos de perguntas para o usuario
const EXAMPLE_QUESTIONS = [
  'Qual foi a ultima ocorrencia grave?',
  'Quantos alunos temos por turma?',
  'Top 3 alunos com mais ocorrencias de cada turma',
];

// Convert markdown bold (**text**) to HTML strong tags
const formatMarkdown = (text: string): string => {
  // Convert **text** to <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

export function AIChat({ institutionId }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    // Scroll apenas dentro do container do chat, nao na pagina
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Faz scroll apenas quando ha mensagens (nao no estado inicial vazio)
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          institutionId,
        }),
      });

      const result = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.success
          ? result.explanation || 'Consulta executada com sucesso.'
          : result.error || 'Ocorreu um erro ao processar sua pergunta.',
        timestamp: new Date(),
        isError: !result.success,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro de conexao. Verifique sua internet e tente novamente.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Analytics
          <span className="text-xs font-normal text-muted-foreground ml-2">
            Powered by Gemini
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Estado inicial: mostra exemplos clicaveis */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-primary/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Faca perguntas sobre os dados da sua instituicao
            </p>
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs text-muted-foreground mb-2">Experimente:</p>
              {EXAMPLE_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="w-full text-left px-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-primary/20"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensagens da conversa */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.isError
                    ? 'bg-destructive/10 border border-destructive/30'
                    : 'bg-muted'
              }`}
            >
              {message.isError && (
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Erro</span>
                </div>
              )}
              <p
                className="whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
              />
              {message.isError && message.content.includes('aistudio.google.com') && (
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir Google AI Studio
                </a>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analisando...</span>
            </div>
          </div>
        )}

      </CardContent>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faca uma pergunta sobre seus dados..."
            className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
