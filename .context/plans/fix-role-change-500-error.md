# Plano: Corrigir Erro 500 na API de Mudança de Role

## Status: CONCLUÍDO ✅

## Problema Identificado

Ao tentar mudar a função de um professor para visualizador, o sistema retorna erro 500:
```
PUT http://localhost:3000/api/users/447c011c-38f9-49b9-94cb-58e1d9072713/role 500 (Internal Server Error)
```

## Análise do Código

### Arquivo: `app/api/users/[id]/role/route.ts`

Potenciais causas do erro:

1. **Acesso a `params` sem await (Next.js 15)**
   - Em versões recentes do Next.js, `params` é uma Promise
   - Código atual: `const targetUserId = params.id;`
   - Correção: `const { id: targetUserId } = await params;`

2. **Falta de logging detalhado**
   - O catch block só loga "Error in role change:" sem detalhes
   - Dificulta diagnóstico da causa raiz

## Correções Necessárias

### 1. Corrigir acesso ao params
```typescript
// ANTES
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const targetUserId = params.id;

// DEPOIS
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
```

### 2. Adicionar logging detalhado
```typescript
} catch (error) {
  console.error('Error in role change:', error);
  console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
```

## Arquivos a Modificar

- [x] `app/api/users/[id]/role/route.ts` - Corrigir params e logging

## Testes de Validação

1. Mudar professor → admin_viewer (deve funcionar)
2. Mudar admin_viewer → professor (deve funcionar)
3. Mudar único admin → professor (deve bloquear com mensagem)
4. Mudar role para o mesmo valor (deve retornar erro amigável)
