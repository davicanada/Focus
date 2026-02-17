---
status: ready
generated: 2026-02-01
---

# Corrigir Layout do PDF - Ficha Individual do Aluno

## Problema
Após a remoção da coluna "Registrado por" (5 → 4 colunas), as larguras fixas não foram redistribuídas, deixando espaço vazio à direita.

## Configuração Atual (autoTable columnStyles)
```
Data:        22mm (fixa)
Tipo:        30mm (fixa)
Severidade:  22mm (fixa)
Descrição:   auto
fontSize:    8 (body), 9 (header)
cellPadding: 3
```

## Nova Configuração Proposta
```
Data:        25mm (fixa) — +3mm para datas com hora
Tipo:        45mm (fixa) — +15mm para tipos longos como "Uso de Celular em Sala"
Severidade:  28mm (fixa) — +6mm para melhor respiro visual
Descrição:   auto         — ocupa ~84mm restantes
fontSize:    9 (body), 10 (header) — +1pt melhor legibilidade
cellPadding: 4            — +1mm mais respiro
```

Página A4 portrait: 210mm, margens 14mm cada = 182mm úteis.
Fixas: 25 + 45 + 28 = 98mm. Descrição auto: ~84mm.

## Arquivos a Modificar
1. `app/admin/relatorios/aluno/page.tsx` — seção `autoTable()` do `generatePDF`
2. `app/viewer/relatorios/aluno/page.tsx` — mesma seção (cópia idêntica)

## Alterações Exatas
Em ambos os arquivos, no bloco `autoTable(doc, { ... })`:

1. `headStyles.fontSize`: 9 → 10
2. `styles.fontSize`: 8 → 9
3. `styles.cellPadding`: 3 → 4
4. `columnStyles[0].cellWidth`: 22 → 25
5. `columnStyles[1].cellWidth`: 30 → 45
6. `columnStyles[2].cellWidth`: 22 → 28
7. `columnStyles[3]`: mantém `'auto'`
