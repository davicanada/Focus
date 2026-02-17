---
status: filled
generated: 2026-02-16
agents:
  - type: "database-specialist"
    role: "Execute SQL cleanup and data loading"
phases:
  - id: "phase-1"
    name: "Limpeza de dados ficticios"
    prevc: "E"
  - id: "phase-2"
    name: "Carga de dados reais"
    prevc: "E"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
---

# Substituir dados ficticios da EEEFM MARINGA por dados reais

> Remover alunos, turmas e ocorrencias ficticias e carregar 18 turmas e 449 alunos reais do relatorio SEDU-ES.

## Task Snapshot
- **Primary goal:** Substituir 100% dos dados ficticios da instituicao EEEFM MARINGA por dados reais extraidos do PDF "Alunos por turma CPF.pdf" da SEDU-ES.
- **Success signal:** 18 turmas e 449 alunos criados no banco, zero dados ficticios restantes, tipos de ocorrencia e regras de alerta preservados.
- **Institution ID:** `7849830e-2ff9-4f36-bba8-12b8e7a71ef8`

## Dados do PDF (78 paginas, 18 turmas, 449 alunos)

| Turma | Grade | Section | Shift | Education Level | Alunos |
|-------|-------|---------|-------|-----------------|--------|
| 1 V01 | 1 | V01 | vespertino | fundamental_i | 19 |
| 2 V01 | 2 | V01 | vespertino | fundamental_i | 25 |
| 2 V02 | 2 | V02 | vespertino | fundamental_i | 23 |
| 3 V01 | 3 | V01 | vespertino | fundamental_i | 21 |
| 3 V02 | 3 | V02 | vespertino | fundamental_i | 24 |
| 4 V01 | 4 | V01 | vespertino | fundamental_i | 30 |
| 4 V02 | 4 | V02 | vespertino | fundamental_i | 30 |
| 5 V01 | 5 | V01 | vespertino | fundamental_i | 7 |
| 5 V02 | 5 | V02 | vespertino | fundamental_i | 29 |
| 6 M01 | 6 | M01 | matutino | fundamental_ii | 32 |
| 6 M02 | 6 | M02 | matutino | fundamental_ii | 3 |
| 7 M01 | 7 | M01 | matutino | fundamental_ii | 25 |
| 7 M02 | 7 | M02 | matutino | fundamental_ii | 25 |
| 7 M03 | 7 | M03 | matutino | fundamental_ii | 24 |
| 8 M01 | 8 | M01 | matutino | fundamental_ii | 34 |
| 8 M02 | 8 | M02 | matutino | fundamental_ii | 33 |
| 9 M01 | 9 | M01 | matutino | fundamental_ii | 33 |
| 9 M02 | 9 | M02 | matutino | fundamental_ii | 32 |

## Decisoes Acordadas
- Nomes em MAIUSCULAS sem acentos (como vem da SEDU-ES)
- Secoes com zero padding: M01, M02, V01, V02
- ID INEP armazenado no campo `registration` (matricula)
- CPF NAO armazenado (LGPD)
- Manter tipos de ocorrencia (12), subcategorias e regras de alerta (1)
- Criar ano letivo 2026 (fev-dez)

## Working Phases

### Phase 1 — Limpeza de dados ficticios
**Steps**
1. Verificar e limpar `alert_notifications` vinculadas a dados ficticios
2. Verificar e limpar `student_enrollments` vinculadas a dados ficticios
3. Hard DELETE de 51 ocorrencias ficticias
4. Hard DELETE de 40 alunos ficticios
5. Hard DELETE de 12 turmas ficticias
6. Confirmar que tipos de ocorrencia (12) e regras de alerta (1) permanecem intactos

### Phase 2 — Carga de dados reais
**Steps**
1. Criar ano letivo 2026 (2026-02-03 a 2026-12-18, is_current=true)
2. Extrair todos os nomes + ID INEP do PDF com script Python robusto
3. Criar 18 turmas com nomenclatura padrao e vinculadas ao ano 2026
4. Criar 449 alunos com nome + ID INEP como matricula, vinculados as turmas corretas

### Phase 3 — Validacao
**Steps**
1. Contar turmas criadas = 18
2. Contar alunos criados = 449
3. Verificar distribuicao por turma coincide com PDF
4. Verificar tipos de ocorrencia preservados = 12
5. Verificar regras de alerta preservadas = 1

## Rollback
- Dados ficticios nao tem valor, nao ha rollback necessario
- Tipos de ocorrencia e regras de alerta nao sao alterados em nenhum momento
