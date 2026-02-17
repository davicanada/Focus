# Escola Demo com Dados Completos de 2026

## Objetivo
Adicionar ocorrências de **fevereiro a dezembro de 2026** na instituição Drummond, para que o Analytics Dashboard mostre gráficos com dados do ano inteiro.

## Dados da Instituição Alvo
- **ID:** `a5469bc2-dee5-461c-8e3a-f98cf8c386af`
- **Turmas:** 6 (8ºA, 8ºB, 9ºA, 9ºB, 1ªA, 1ªB)
- **Alunos:** 120
- **Professores:** 4
- **Ocorrências atuais:** 103 (apenas janeiro/2026)

## Distribuição Mensal (~970 novas, total ~1073)

| Mês | Qtd | Nota |
|-----|-----|------|
| Jan | 103 (já existe) | Adaptação |
| Fev | 90 | Rotina |
| Mar | 110 | Pico pré-carnaval |
| Abr | 85 | Semana Santa |
| Mai | 95 | Normal |
| Jun | 70 | Festas juninas |
| Jul | 15 | Férias |
| Ago | 100 | Retorno |
| Set | 105 | Mês cheio |
| Out | 90 | Provas |
| Nov | 80 | Fim de ano |
| Dez | 30 | Até dia 18 |

## Distribuição por Tipo
- Atraso 25%, Conversa 22%, Celular 18%, Falta Material 12%
- Desrespeito 10%, Briga Verbal 7%, Briga Física 4%, Vandalismo 2%

## Padrões Realistas
- Dias úteis apenas (seg-sex)
- Horários por turno (matutino 7-12h, vespertino 13-18h)
- 15% dos alunos com 60% das ocorrências
- `class_id_at_occurrence` preenchido
- `registered_by` distribuído entre os 4 professores
- Descrições variadas

## Fases
1. Buscar IDs (alunos, turmas, tipos, professores) via SQL
2. Gerar e executar INSERTs (~970 ocorrências, fev-dez)
3. Validar gráficos no Analytics
