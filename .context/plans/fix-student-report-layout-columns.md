---
status: filled
generated: 2026-02-16
phases:
  - id: "phase-1"
    name: "Implementacao"
    prevc: "E"
  - id: "phase-2"
    name: "Validacao"
    prevc: "V"
---

# Corrigir layout PDF do aluno + adicionar colunas subcategoria e devolutiva

## Problema Atual

### 1. Sobreposicao no header do PDF
No `relatorios/aluno/page.tsx`, o header da ficha individual usa posicoes fixas:
- "Turma:" label em X=20, Y=53, valor em X=45
- "Total de Ocorrencias:" label em X=100, Y=53, valor em X=160

Quando o nome da turma e longo (ex: "Ensino Fundamental - 5o Ano B - Vespertino"), o texto passa de X=100 e se sobrepocom ao "Total de Ocorrencias".

### 2. Colunas atuais da tabela
```
Data (25mm) | Tipo (45mm) | Severidade (28mm) | Descricao (auto)
```
Faltam: Subcategoria e Devolutiva.

### 3. Dados disponiveis
- **Subcategoria**: Query ja inclui `subcategory:occurrence_subcategories(name)` mas nao e usado no PDF
- **Devolutiva**: NAO esta na query atual, precisa adicionar JOIN com `occurrence_feedbacks`

---

## Arquivos Impactados

| Arquivo | Mudanca |
|---------|---------|
| `app/admin/relatorios/aluno/page.tsx` | Header + query + tabela PDF |
| `app/admin/relatorios/periodo/page.tsx` | Query + tabela PDF |

---

## Plano de Implementacao

### Correcao 1 — Header com truncamento

**Problema**: Texto da turma invade area do "Total de Ocorrencias"

**Solucao**: Truncar nome da turma com `maxWidth` usando `doc.text()` com opcao de truncar, ou usar `splitTextToSize()` para limitar. Alternativa mais simples: mover layout para 3 linhas ao inves de encaixar tudo em 2 colunas.

**Layout proposto (3 linhas, campo por linha inteira)**:
```
Nome: [nome completo do aluno]                Matricula: [matricula]
Turma: [nome completo da turma, sem truncar]
Total de Ocorrencias: [N]     Leves: X | Medias: Y | Graves: Z     Data: dd/mm/aaaa
```

Isso elimina a sobreposicao porque turma ocupa a linha inteira (Y=53), e Total/Severidade/Data ficam na linha de baixo (Y=61). Box de info cresce de height=35 para height=40.

### Correcao 2 — Adicionar coluna Subcategoria

**Na query**: Ja inclui `subcategory:occurrence_subcategories(name)` — nada a fazer.

**Na tabela PDF**:
- Nova coluna "Subcategoria" entre "Severidade" e "Descricao"
- Valor: `occ.occurrence_type?.subcategory?.name || '-'`

### Correcao 3 — Adicionar coluna Devolutiva

**Na query**: Adicionar JOIN com feedbacks:
```
feedbacks:occurrence_feedbacks(action_type, description)
```

**Na tabela PDF**:
- Nova coluna "Devolutiva" apos "Descricao" (ou substituir Descricao por Devolutiva se espaco for limitado)
- Valor: Ultimo feedback da ocorrencia, formatado como label do action_type
- Se nao houver feedback: "Pendente"
- Se houver multiplos: mostrar o mais recente

**Observacao sobre espaco**: Com 6 colunas em A4 portrait (210mm - margens = ~182mm), ficaria apertado:
```
Data (22mm) | Tipo (35mm) | Severidade (22mm) | Subcategoria (28mm) | Descricao (auto) | Devolutiva (30mm)
```

**Alternativa**: Orientacao landscape (A4 297mm) para caber tudo confortavelmente. Ou reduzir fonte da tabela de 10 para 9.

### Correcao 4 — Mesmo para relatorio por periodo

Aplicar as mesmas mudancas de colunas na tabela do `relatorios/periodo/page.tsx`.

---

## Pontos para Discussao

1. **Layout do header**: Prefere 3 linhas (turma em linha propria) ou truncar o nome da turma?
2. **Orientacao do PDF**: Manter portrait (A4 vertical) com fonte menor, ou trocar para landscape (A4 horizontal) para mais espaco?
3. **Coluna Descricao**: Manter junto com as novas colunas, ou remover/condensar para caber?
4. **Devolutiva**: Mostrar apenas o tipo de acao (ex: "Advertencia verbal") ou incluir a descricao do feedback tambem?
5. **Relatorio por periodo**: Aplicar as mesmas mudancas la tambem, ou focar so na ficha individual por agora?
