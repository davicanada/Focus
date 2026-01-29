---
status: ready
generated: 2026-01-23
agents:
  - type: "database-specialist"
    role: "Executar SQL para inserção de dados de teste"
phases:
  - id: "phase-1"
    name: "Análise e Limpeza"
    prevc: "P"
  - id: "phase-2"
    name: "Geração de Dados"
    prevc: "E"
  - id: "phase-3"
    name: "Validação"
    prevc: "V"
---

# Geração de Dados de Teste para Ano Letivo 2025

> Criar dados simulados realistas de ocorrências escolares para todo o ano letivo de 2025

## Contexto Atual

### Dados Existentes
| Tabela | Quantidade | Observações |
| --- | --- | --- |
| institutions | 1 | Escola Municipal Professor Carlos Drummond |
| users | 5 | 1 master, 1 admin, 3 professores |
| classes | 6 | Fundamental e Médio (ano 2025) |
| students | 21 | Distribuídos nas turmas |
| occurrence_types | 7 | Disciplinar, pedagógica, administrativa, positiva |
| occurrences | 32 | **PROBLEMA:** Apenas 13-17/fev/2025 |

### Problemas Identificados
1. **Período limitado:** Apenas 5 dias de dados (13-17 fev 2025)
2. **Único registrador:** Todas ocorrências pela Prof. Maria Silva
3. **Pouca variação:** Falta diversidade nos tipos de ocorrência
4. **Sem tendências:** Impossível ver padrões sazonais/mensais

### IDs Importantes (UUID)

**Professores (registered_by):**
| Professor | ID |
| --- | --- |
| Maria Silva | `b614afcd-b529-4bb5-98c7-162801a2bdbc` |
| João Santos | `8c887864-d4b1-4718-975b-87c872cc1d06` |
| Ana Costa | `26c731f0-13c0-43ca-b4d4-e17d217fb45f` |

**Tipos de Ocorrência:**
| Tipo | ID | Categoria | Severidade |
| --- | --- | --- | --- |
| Atraso | `0722aee3-8f1c-4324-a0a5-e973f30d6997` | disciplinar | leve |
| Falta de Material | `8075ba2c-19f8-49cf-a190-c7cd83f5068f` | pedagogica | leve |
| Indisciplina | `b45f015f-85a4-4bcc-87c9-e42d5f505a75` | disciplinar | media |
| Briga | `f37b998f-a4fc-4a31-bc6d-280604cff966` | disciplinar | grave |
| Falta | `205b2b3f-c30d-4c20-a0f1-5911397bff4b` | administrativa | leve |
| Participacao | `7b0a3cf8-90a2-4c91-a2e9-313fb704f83a` | positiva | leve |
| Destaque | `6298f1dd-83ab-4220-bf2a-85c71992f904` | positiva | leve |

## Objetivo

Gerar **~500 ocorrências** distribuídas ao longo do ano letivo de 2025:
- **Período:** Fevereiro a Dezembro 2025
- **Calendário escolar:** Respeitar férias de julho
- **Distribuição realista:** Mais ocorrências em março/agosto (volta às aulas)
- **Variação por professor:** Cada professor registra ocorrências

## Distribuição Planejada

### Por Mês
| Mês | Ocorrências | Justificativa |
| --- | --- | --- |
| Fevereiro | 40 | Início do ano letivo |
| Março | 60 | Adaptação, mais conflitos |
| Abril | 50 | Estabilização |
| Maio | 45 | Normal |
| Junho | 35 | Fim do semestre |
| Julho | 0 | Férias escolares |
| Agosto | 65 | Volta às aulas |
| Setembro | 55 | Normal |
| Outubro | 50 | Normal |
| Novembro | 45 | Preparação para provas |
| Dezembro | 35 | Fim do ano |
| **Total** | **~480** | |

### Por Tipo (%)
- 30% Atraso (leve)
- 20% Falta de Material (leve)
- 15% Indisciplina (média)
- 5% Briga (grave)
- 10% Falta (administrativa)
- 12% Participação (positiva)
- 8% Destaque (positiva)

### Por Professor
- Maria Silva: 40%
- João Santos: 35%
- Ana Costa: 25%

### Padrões Especiais
1. **Alunos reincidentes:** 3-4 alunos com 15+ ocorrências cada
2. **Turma problemática:** 6º Ano A com 30% mais ocorrências negativas
3. **Pico de brigas:** Agosto (volta às aulas)
4. **Mais participação:** 1º Ano EM (alunos mais velhos)

## Fases de Execução

### Fase 1: Limpeza
- Remover ocorrências existentes de teste

### Fase 2: Geração
- Executar SQL com INSERT de ~480 ocorrências

### Fase 3: Validação
- Verificar contagem total
- Testar dashboard Analytics
- Confirmar cross-filtering funcionando
