---
status: active
generated: 2026-01-30
type: research
agents:
  - type: "security-auditor"
    role: "Avaliar riscos de privacidade e conformidade LGPD"
phases:
  - id: "phase-1"
    name: "Mapeamento de Dados Acessíveis pela IA"
    prevc: "P"
  - id: "phase-2"
    name: "Análise de Riscos e Cenários de Prejuízo"
    prevc: "P"
  - id: "phase-3"
    name: "Recomendações de Mitigação"
    prevc: "P"
---

# Avaliação de Risco - AI Analytics e Dados de Alunos (LGPD)

> A IA do Focus pode prejudicar alunos ao expor ou correlacionar dados de ocorrências disciplinares?

## Arquitetura Atual da IA

**Fluxo:** Pergunta (PT-BR) -> Gemini/Groq gera SQL -> `execute_ai_query()` executa -> IA explica resultado em linguagem natural

**Arquivos-chave:**
- `lib/ai/shared.ts` — Colunas bloqueadas, keywords sensíveis, validação SQL
- `lib/ai/gemini.ts` — Provider primário (Gemini 3 Flash)
- `lib/ai/groq.ts` — Provider fallback (Llama 3.3 70B)
- `lib/ai/index.ts` — Orquestração com fallback automático
- `app/api/ai-analytics/route.ts` — API route
- `components/analytics/AIChat.tsx` — Interface de chat

## Proteções Já Implementadas

| Proteção | Status | Detalhes |
| --- | --- | --- |
| Colunas bloqueadas (guardian_phone, birth_date, email, etc.) | OK | `BLOCKED_COLUMNS` em shared.ts |
| Keywords sensíveis (telefone, cpf, nascimento, etc.) | OK | `isSensitiveQuestion()` |
| Validação SQL (bloqueia DELETE, DROP, UPDATE, INSERT) | OK | `validateSQL()` + função Supabase |
| Isolamento multi-tenant (institution_id) | OK | Forçado no prompt da IA |
| Resposta natural LGPD para dados sensíveis | OK | Mensagem educativa |
| UI sem SQL/tabelas (só texto natural) | OK | AIChat.tsx |

---

## RISCOS IDENTIFICADOS

### RISCO ALTO — Nomes completos de alunos vinculados a ocorrências

**O que acontece:** A IA tem acesso irrestrito a `students.full_name` e pode listar alunos com suas ocorrências.

**Cenário de prejuízo:**
- Admin pergunta: "Liste todos os alunos com ocorrências graves"
- IA retorna: "João Silva - 5 brigas, Maria Santos - 3 agressões verbais"
- Admin compartilha tela ou screenshot em reunião
- Informação vaza para pais de outros alunos ou comunidade escolar

**Por que prejudica:** Cria um "rótulo digital" no aluno. Ocorrências disciplinares são dados sensíveis de menores de idade (LGPD Art. 14 — dados de crianças e adolescentes exigem proteção reforçada).

**Gravidade:** ALTA — Dados de menores + natureza disciplinar = potencial estigmatização.

---

### RISCO ALTO — Ranking de alunos por ocorrências

**O que acontece:** A IA pode criar rankings tipo "Top 10 alunos com mais ocorrências".

**Cenário de prejuízo:**
- Ranking chega ao conhecimento de outros professores/funcionários
- Aluno passa a ser tratado com preconceito ("esse aí é o campeão de ocorrências")
- Impacto psicológico e pedagógico negativo

**Por que prejudica:** Rankings de comportamento negativo violam o princípio da dignidade da criança (ECA Art. 17) e o princípio da não-discriminação (LGPD Art. 6, III).

---

### RISCO MÉDIO — Descrições livres podem conter dados sensíveis

**O que acontece:** O campo `description` das ocorrências é texto livre. Professores podem escrever:
- Informações médicas: "aluno teve crise de ansiedade"
- Situações familiares: "pais em processo de divórcio"
- Saúde mental: "apresentou comportamento autolesivo"

**Cenário de prejuízo:** A IA pode retornar essas descrições em respostas, expondo dados de saúde (LGPD Art. 11 — dados sensíveis).

---

### RISCO MÉDIO — Correlação temporal permite identificar padrões

**O que acontece:** A IA pode correlacionar:
- Horários de ocorrências (sempre na 1a aula = problema em casa?)
- Frequência crescente (piorando ao longo do ano)
- Concentração por professor (conflito com professor específico?)

**Cenário de prejuízo:** Padrões podem ser interpretados incorretamente e usados contra o aluno em decisões pedagógicas sem contexto adequado.

---

### RISCO MÉDIO — Performance de professores exposta

**O que acontece:** A IA responde perguntas como "qual professor registra mais ocorrências?"

**Cenário de prejuízo:** Professores mais rigorosos parecem "piores", criando desincentivo para registrar ocorrências (subnotificação).

---

### RISCO BAIXO — Sem audit trail

**O que acontece:** Não há log de quais perguntas foram feitas à IA nem quais dados foram retornados.

**Cenário de prejuízo:** Em caso de vazamento, impossível rastrear a origem ou provar conformidade LGPD.

---

## Quem Acessa a IA Hoje

| Role | Acessa AI Analytics? | Risco |
| --- | --- | --- |
| Master | Sim | Baixo (poucos usuários) |
| Admin | Sim | ALTO (acesso a todos os dados da instituição) |
| Professor | Sim (analytics próprio) | Médio (escopo limitado às próprias ocorrências) |
| Viewer | A verificar | Depende da implementação |

---

## Recomendações de Mitigação

### Prioridade 1 — Bloquear nomes de alunos nas respostas da IA

**Ação:** Adicionar instrução ao prompt para NUNCA retornar nomes completos de alunos. Forçar apenas contagens e estatísticas agregadas.

**Implementação:** No `SCHEMA_CONTEXT` (shared.ts), adicionar regra obrigatória. Também adicionar `full_name` (contexto students) ao `BLOCKED_COLUMNS`.

### Prioridade 1 — Bloquear campo description de ocorrências

**Ação:** Remover `occurrences.description` do schema visível à IA ou adicioná-lo ao `BLOCKED_COLUMNS`.

**Justificativa:** Texto livre pode conter dados de saúde/família (LGPD Art. 11).

### Prioridade 2 — Implementar audit log

**Ação:** Registrar cada consulta à IA na tabela `system_logs`:
- user_id, question, sql_generated, rows_returned, provider, timestamp
- Flag se foi bloqueada por proteção LGPD

### Prioridade 2 — Forçar respostas apenas agregadas

**Ação:** Instruir a IA a retornar apenas COUNT, AVG, SUM — nunca dados individuais identificáveis.

**Trade-off:** Reduz utilidade, mas maximiza proteção de menores.

### Prioridade 3 — Aviso LGPD no chat

**Ação:** Adicionar disclaimer na UI: "Dados protegidos pela LGPD. Não compartilhe informações de alunos."

---

## Conclusão

**A IA PODE prejudicar alunos?** Sim, no estado atual. Os riscos principais são:

1. **Nomes de alunos vinculados a ocorrências** — permite estigmatização
2. **Rankings de comportamento negativo** — viola dignidade da criança
3. **Descrições livres** — podem conter dados de saúde/família

**A IA É inerentemente prejudicial?** Não. Com as mitigações de Prioridade 1 (bloquear nomes e descrições, forçar agregação), o risco cai significativamente. A IA passa a ser uma ferramenta de análise estatística que não identifica indivíduos.

**Referências legais:**
- LGPD Art. 14 — Proteção reforçada para dados de crianças e adolescentes
- LGPD Art. 11 — Dados sensíveis (saúde, origem racial)
- LGPD Art. 6, III — Princípio da necessidade (coletar o mínimo necessário)
- ECA Art. 17 — Direito ao respeito e dignidade da criança
- ECA Art. 100 — Proteção integral da criança
