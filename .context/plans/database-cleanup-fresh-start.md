---
status: in-progress
generated: 2026-01-24
phases:
  - id: "phase-1"
    name: "Análise de Colunas Redundantes"
    prevc: "P"
  - id: "phase-2"
    name: "Limpeza do Banco de Dados"
    prevc: "E"
  - id: "phase-3"
    name: "Criação de Dados da Escola Fictícia"
    prevc: "E"
  - id: "phase-4"
    name: "Validação"
    prevc: "V"
---

# Limpeza do Banco e Configuração de Escola Fictícia

> Identificar colunas redundantes, limpar banco e criar dados realistas para escola fictícia

## Fase 1: Análise de Colunas Redundantes

### Tabela `students` - Colunas não utilizadas no MVP:
| Coluna | Motivo | Ação |
|--------|--------|------|
| `birth_date` | Não usado no MVP simplificado | MANTER (pode ser útil futuramente) |
| `guardian_name` | Removido na simplificação do MVP | MANTER (opcional) |
| `guardian_phone` | Removido na simplificação do MVP | MANTER (opcional) |
| `guardian_email` | Removido na simplificação do MVP | MANTER (opcional) |
| `notes` | Removido na simplificação do MVP | MANTER (opcional) |

### Tabela `institutions` - Campos de endereço:
- Todos os campos de endereço são úteis para Google Places API
- Nenhuma remoção necessária

### Conclusão da Análise:
**Não há colunas verdadeiramente redundantes.** As colunas "não usadas" são opcionais e podem ser úteis no futuro. O schema está bem estruturado.

## Fase 2: Limpeza do Banco de Dados

Ordem de deleção (respeitando foreign keys com CASCADE):
1. Deletar todas as ocorrências
2. Deletar todos os alunos
3. Deletar todas as turmas
4. Deletar todos os tipos de ocorrência
5. Deletar todos os quarters
6. Deletar user_institutions (vínculos)
7. Deletar access_requests
8. Deletar system_logs
9. Deletar users (exceto master)
10. Deletar institutions
11. Deletar usuários do Supabase Auth

## Fase 3: Criação de Dados da Escola Fictícia

### Escola: Colégio Estadual Professor Carlos Drummond de Andrade
- **Localização:** Belo Horizonte, MG
- **Endereço:** Av. Amazonas, 5855 - Nova Suíça
- **Início das aulas:** 5 de Janeiro de 2026

### Usuários:
**Administradores (2):**
1. Maria Helena Santos - admin1@drummond.edu.br
2. Roberto Oliveira Costa - admin2@drummond.edu.br

**Professores (4):**
1. Ana Paula Ferreira - prof.ana@drummond.edu.br
2. Carlos Eduardo Lima - prof.carlos@drummond.edu.br
3. Fernanda Rodrigues - prof.fernanda@drummond.edu.br
4. José Ricardo Almeida - prof.jose@drummond.edu.br

### Turmas (6):
**Ensino Fundamental:**
1. 8º Ano A - Matutino (20 alunos)
2. 8º Ano B - Vespertino (19 alunos)
3. 9º Ano A - Matutino (21 alunos)
4. 9º Ano B - Matutino (18 alunos)

**Ensino Médio:**
1. 1ª Série A - Matutino (22 alunos)
2. 1ª Série B - Vespertino (20 alunos)

**Total: 120 alunos**

### Tipos de Ocorrência:
1. Atraso (leve)
2. Conversa Durante Aula (leve)
3. Uso de Celular (leve)
4. Falta de Material (leve)
5. Desrespeito ao Professor (média)
6. Briga Verbal (média)
7. Briga Física (grave)
8. Vandalismo (grave)

### Ocorrências:
- Período: 5 de Janeiro a 24 de Janeiro de 2026 (14 dias úteis)
- Distribuição realista por tipo e severidade
- ~50-80 ocorrências no total

## Fase 4: Validação

- Verificar login dos usuários criados
- Verificar dashboard com dados
- Verificar registro de novas ocorrências
- Verificar relatórios

## Critérios de Sucesso

1. ✅ Banco limpo (exceto master user)
2. ✅ 1 instituição criada
3. ✅ 2 admins + 4 professores funcionando
4. ✅ 6 turmas com 18-22 alunos cada
5. ✅ Tipos de ocorrência configurados
6. ✅ Ocorrências distribuídas realisticamente
