---
status: ready
generated: 2026-01-25
---

# Relatorios por Periodo Academico

> Modificar a aba Relatorios do administrador para mostrar botoes clicaveis baseados na configuracao de periodos da instituicao (4 bimestres, 3 trimestres ou 2 semestres)

## Contexto

### Situacao Atual
- A pagina de relatorios (`/admin/relatorios`) mostra 2 opcoes: "Relatorio por Periodo" e "Relatorio por Aluno"
- O "Relatorio por Periodo" (`/admin/relatorios/periodo`) usa um seletor de datas manual (data inicial e final)
- A instituicao ja configura seus periodos academicos na aba "Periodos Academicos" (`/admin/trimestres`)
- Os periodos sao salvos na tabela `quarters` com: `period_type`, `period_number`, `start_date`, `end_date`

### Problema
- O admin precisa digitar manualmente as datas do periodo para gerar relatorios
- Isso e trabalhoso e propenso a erros
- Os periodos ja estao configurados no sistema, entao deveriam ser reutilizados

### Solucao Proposta
Substituir o seletor de datas por botoes clicaveis para cada periodo configurado:
- **Bimestre**: 4 botoes (1o Bimestre, 2o Bimestre, 3o Bimestre, 4o Bimestre)
- **Trimestre**: 3 botoes (1o Trimestre, 2o Trimestre, 3o Trimestre)
- **Semestre**: 2 botoes (1o Semestre, 2o Semestre)

## Arquivos Envolvidos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `app/admin/relatorios/periodo/page.tsx` | Modificar | Carregar periodos da instituicao e mostrar como botoes clicaveis |
| `lib/constants/periods.ts` | Consultar | Usar `getPeriodName()` e `getPeriodCount()` existentes |
| `types/index.ts` | Consultar | Tipo `Quarter` ja existe |

## Plano de Implementacao

### Fase 1: Carregar Periodos da Instituicao

**Modificacoes em `app/admin/relatorios/periodo/page.tsx`:**

1. Adicionar import do tipo Quarter:
```typescript
import type { User as UserType, Institution, Quarter } from '@/types';
```

2. Adicionar states para periodos:
```typescript
const [quarters, setQuarters] = useState<Quarter[]>([]);
const [loadingQuarters, setLoadingQuarters] = useState(true);
const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null);
```

3. Carregar periodos no `useEffect`:
```typescript
const loadQuarters = async (institutionId: string) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quarters')
    .select('*')
    .eq('institution_id', institutionId)
    .order('period_number', { ascending: true });

  if (!error && data) {
    setQuarters(data);
  }
  setLoadingQuarters(false);
};
```

### Fase 2: Interface de Selecao de Periodo

**Substituir o seletor de datas por:**

1. Card com titulo "Selecione o Periodo"
2. Grid de botoes (2 colunas)
3. Cada botao mostra:
   - Nome do periodo (ex: "1o Bimestre")
   - Datas formatadas (ex: "01/02 - 30/04")
   - Badge "Atual" se for o periodo corrente
4. Botao selecionado fica destacado (borda primaria, fundo claro)

**Logica para periodo atual:**
```typescript
const isCurrentPeriod = (quarter: Quarter) => {
  const today = new Date().toISOString().split('T')[0];
  return today >= quarter.start_date && today <= quarter.end_date;
};
```

**Caso sem periodos configurados:**
- Mostrar mensagem: "Nenhum periodo academico configurado"
- Botao/link para `/admin/trimestres` para configurar

### Fase 3: Gerar Relatorio com Periodo Selecionado

1. Ao clicar em um periodo:
   - Setar `selectedQuarter`
   - Preencher automaticamente `startDate` e `endDate` com as datas do periodo

2. Manter logica existente de geracao de PDF/Excel
   - Apenas mudar de onde vem as datas (do quarter selecionado)

3. Titulo do relatorio deve incluir nome do periodo:
   - Ex: "Relatorio de Ocorrencias - 1o Bimestre 2026"

## Fluxo do Usuario

```
1. Admin acessa /admin/relatorios
2. Clica em "Relatorio por Periodo"
3. Ve os periodos configurados como botoes:

   +------------------+------------------+
   |  1o Bimestre     |  2o Bimestre     |
   |  01/02 - 30/04   |  01/05 - 31/07   |
   +------------------+------------------+
   |  3o Bimestre     |  4o Bimestre     |
   |  01/08 - 30/09   |  01/10 - 15/12   |
   |     [Atual]      |                  |
   +------------------+------------------+

4. Clica no periodo desejado (fica selecionado)
5. Escolhe formato (PDF ou Excel)
6. Clica em "Gerar Relatorio"
7. Download inicia automaticamente
```

## Estados Visuais dos Botoes

| Estado | Estilo |
|--------|--------|
| Normal | `border-gray-200 bg-white` |
| Hover | `border-primary/50 shadow-sm` |
| Selecionado | `border-primary bg-primary/5 ring-2 ring-primary` |
| Atual | Badge verde "Atual" no canto superior direito |

## Validacoes

1. **Periodos nao configurados**:
   - Mostrar alerta com icone e link para configurar
   - Desabilitar botoes de download

2. **Nenhum periodo selecionado**:
   - Botoes de download desabilitados
   - Tooltip: "Selecione um periodo primeiro"

3. **Periodo sem ocorrencias**:
   - Permitir download
   - Relatorio mostra "Nenhuma ocorrencia encontrada neste periodo"

## Remocoes

- Remover campos de input de data manual (`startDate`, `endDate`)
- Remover labels "Data Inicial" e "Data Final"
- Manter apenas a selecao por periodo

## Checklist de Implementacao

- [ ] Importar tipo Quarter
- [ ] Adicionar states: quarters, loadingQuarters, selectedQuarter
- [ ] Criar funcao loadQuarters()
- [ ] Chamar loadQuarters no useEffect
- [ ] Criar componente/secao de grid de periodos
- [ ] Implementar isCurrentPeriod()
- [ ] Estilizar botao selecionado
- [ ] Adicionar badge "Atual"
- [ ] Tratar caso sem periodos (mostrar alerta + link)
- [ ] Conectar selectedQuarter com geracao de relatorio
- [ ] Atualizar titulo do relatorio com nome do periodo
- [ ] Remover inputs de data manual
- [ ] Testar com bimestre, trimestre e semestre
- [ ] Build passando
