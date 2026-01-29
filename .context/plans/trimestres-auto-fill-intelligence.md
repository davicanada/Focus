---
status: completed
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Implementar logica de auto-fill, validacao visual e UX"
phases:
  - id: "phase-1"
    name: "Analise e Design"
    prevc: "P"
    status: "completed"
  - id: "phase-2"
    name: "Implementacao"
    prevc: "E"
    status: "completed"
  - id: "phase-3"
    name: "Validacao"
    prevc: "V"
    status: "completed"
---

# Trimestres - Auto-Fill Inteligente e Validacao de Sobreposicao Plan

> Implementar preenchimento automatico inteligente dos periodos academicos com validacao visual de sobreposicoes

## Task Snapshot
- **Primary goal:** Quando o usuario preencher as datas do 1o periodo, o sistema auto-preenche os demais com mesma duracao, iniciando no dia seguinte ao fim do periodo anterior.
- **Success signal:**
  - Auto-fill funciona ao preencher datas do 1o periodo
  - Usuario pode editar qualquer periodo apos auto-fill
  - Sistema impede salvar periodos sobrepostos
  - Periodos sobrepostos sao destacados visualmente com mensagem clara
- **Key references:**
  - `app/admin/trimestres/page.tsx` - Pagina atual (614 linhas)
  - `lib/constants/periods.ts` - Tipos de periodo (bimestre: 4, trimestre: 3, semestre: 2)
  - `.claude/agents/frontend-specialist.md` - Boas praticas UI/UX

## Codebase Context

### Estrutura Atual (trimestres/page.tsx)

**State atual:**
```typescript
const [selectedType, setSelectedType] = useState<PeriodType | ''>('');
const [periodDates, setPeriodDates] = useState<PeriodFormData[]>([]);

interface PeriodFormData {
  start_date: string;  // "YYYY-MM-DD"
  end_date: string;    // "YYYY-MM-DD"
}
```

**Funcao de validacao atual (linhas 195-221):**
```typescript
const validateDates = (): string | null => {
  // Valida se todas as datas estao preenchidas
  // Valida se start_date < end_date
  // Valida sequencia (periodo N+1 comeca apos periodo N terminar)
  // Retorna mensagem de erro ou null
};
```

**Handler de mudanca de data (linhas 188-193):**
```typescript
const handleDateChange = (index: number, field: 'start_date' | 'end_date', value: string) => {
  const newDates = [...periodDates];
  newDates[index] = { ...newDates[index], [field]: value };
  setPeriodDates(newDates);
  setHasChanges(true);
};
```

### Tipos de Periodo
| Tipo | Quantidade | Exemplo |
|------|------------|---------|
| bimestre | 4 | 1o Bimestre, 2o Bimestre, 3o Bimestre, 4o Bimestre |
| trimestre | 3 | 1o Trimestre, 2o Trimestre, 3o Trimestre |
| semestre | 2 | 1o Semestre, 2o Semestre |

## Requisitos Detalhados

### 1. Auto-Fill Inteligente

**Trigger:** Quando o usuario preenche AMBAS as datas (start_date E end_date) do **1o periodo**.

**Logica de calculo:**
```
Duracao do 1o periodo = end_date - start_date (em dias)

Para cada periodo N (onde N > 1):
  start_date[N] = end_date[N-1] + 1 dia
  end_date[N] = start_date[N] + duracao
```

**Exemplo:**
- Tipo: Trimestre (3 periodos)
- 1o Trimestre: 05/02/2026 a 30/04/2026 (84 dias)
- Auto-fill:
  - 2o Trimestre: 01/05/2026 a 24/07/2026 (84 dias)
  - 3o Trimestre: 25/07/2026 a 17/10/2026 (84 dias)

### 2. Validacao de Sobreposicao

**Tipos de sobreposicao a detectar:**
1. **Periodo se sobrepoe ao anterior:** start_date[N] <= end_date[N-1]
2. **Periodo se sobrepoe ao proximo:** end_date[N] >= start_date[N+1]
3. **Data inicial apos data final:** start_date > end_date (mesmo periodo)

**Regra de negocio:** Nao pode salvar enquanto houver sobreposicao.

### 3. Feedback Visual (UI/UX Best Practices)

**Estados visuais do card de periodo:**

| Estado | Borda | Background | Icone | Badge |
|--------|-------|------------|-------|-------|
| Normal | `border-gray-200` | `bg-white` | - | - |
| Atual | `border-green-500` | `bg-green-50` | - | "Periodo Atual" (verde) |
| Erro (sobreposicao) | `border-red-500` | `bg-red-50` | AlertTriangle | "Sobreposicao" (vermelho) |
| Auto-preenchido | `border-blue-500` | `bg-blue-50` | Sparkles | "Auto-preenchido" (azul) |

**Mensagem de erro inline:**
- Posicionada abaixo do card com erro
- Icone de alerta + texto explicativo
- Exemplo: "Este periodo se sobrepoe ao 2o Trimestre (termina em 25/07)"

### 4. UX Flow

```
1. Usuario seleciona tipo de periodo (Trimestre)
   -> Sistema mostra 3 cards vazios

2. Usuario preenche data inicial do 1o periodo
   -> Nada acontece ainda

3. Usuario preenche data final do 1o periodo
   -> TRIGGER: Sistema auto-preenche periodos 2, 3
   -> Cards 2 e 3 mostram badge "Auto-preenchido"
   -> Toast: "Periodos preenchidos automaticamente com base no 1o periodo"

4. Usuario pode editar qualquer data
   -> Remove badge "Auto-preenchido" do card editado
   -> Sistema valida em tempo real

5. Se houver sobreposicao:
   -> Card(s) afetado(s) ficam vermelhos
   -> Mensagem de erro aparece
   -> Botao "Salvar" fica desabilitado

6. Usuario corrige sobreposicao
   -> Cards voltam ao normal
   -> Botao "Salvar" fica habilitado
```

## Agent Lineup
| Agent | Role | First Focus |
|-------|------|-------------|
| Frontend Specialist | Implementar toda a logica de UI | Auto-fill + validacao visual |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Auto-fill sobrescreve dados que usuario ja editou | Medium | High | So auto-fill se campos estao vazios |
| Ano letivo ultrapassa ano calendario | Medium | Low | Aceitar - e comportamento valido |
| Performance com muitas validacoes | Low | Low | Validacao e O(n) com n <= 4 |

### Assumptions
- Usuario sempre comeca pelo 1o periodo
- Duracao igual para todos os periodos e aceitavel (usuario pode ajustar)
- Periodos nao podem ter gaps (cada periodo comeca no dia seguinte ao anterior)

## Working Phases

### Phase 1 - Analise e Design (CONCLUIDO)

Analise realizada:
- Estrutura atual mapeada
- Tipos e interfaces identificados
- Funcoes existentes catalogadas

### Phase 2 - Implementacao

#### Step 2.1: Criar funcao de calculo de auto-fill

```typescript
// Adicionar em trimestres/page.tsx

/**
 * Calcula as datas dos periodos subsequentes com base no primeiro periodo
 * @param firstPeriod - Datas do primeiro periodo
 * @param totalPeriods - Quantidade total de periodos
 * @returns Array com todas as datas calculadas
 */
function calculateAutoFillDates(
  firstPeriod: PeriodFormData,
  totalPeriods: number
): PeriodFormData[] {
  const result: PeriodFormData[] = [firstPeriod];

  // Calcular duracao do primeiro periodo em dias
  const startDate = new Date(firstPeriod.start_date);
  const endDate = new Date(firstPeriod.end_date);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

  // Gerar periodos subsequentes
  let previousEndDate = endDate;

  for (let i = 1; i < totalPeriods; i++) {
    // Inicio = dia seguinte ao fim do periodo anterior
    const newStartDate = new Date(previousEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1);

    // Fim = inicio + duracao
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + durationDays);

    result.push({
      start_date: formatDateToString(newStartDate),
      end_date: formatDateToString(newEndDate),
    });

    previousEndDate = newEndDate;
  }

  return result;
}

// Helper para formatar Date como "YYYY-MM-DD"
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

#### Step 2.2: Criar funcao de validacao de sobreposicao

```typescript
interface OverlapError {
  periodIndex: number;
  message: string;
  conflictsWith: number; // indice do periodo conflitante
}

/**
 * Valida se ha sobreposicao entre periodos
 * @returns Array de erros (vazio se nao houver sobreposicao)
 */
function validateOverlaps(periods: PeriodFormData[]): OverlapError[] {
  const errors: OverlapError[] = [];

  for (let i = 0; i < periods.length; i++) {
    const current = periods[i];

    // Pular periodos incompletos
    if (!current.start_date || !current.end_date) continue;

    const currentStart = new Date(current.start_date);
    const currentEnd = new Date(current.end_date);

    // Validar data inicial < data final
    if (currentStart >= currentEnd) {
      errors.push({
        periodIndex: i,
        message: 'Data inicial deve ser anterior a data final',
        conflictsWith: i,
      });
      continue;
    }

    // Validar sobreposicao com periodo anterior
    if (i > 0) {
      const previous = periods[i - 1];
      if (previous.end_date) {
        const previousEnd = new Date(previous.end_date);
        if (currentStart <= previousEnd) {
          errors.push({
            periodIndex: i,
            message: `Inicio (${formatDate(current.start_date)}) deve ser apos o fim do periodo anterior (${formatDate(previous.end_date)})`,
            conflictsWith: i - 1,
          });
        }
      }
    }
  }

  return errors;
}
```

#### Step 2.3: Adicionar estado para rastrear auto-fill

```typescript
// Novo state para rastrear quais periodos foram auto-preenchidos
const [autoFilledPeriods, setAutoFilledPeriods] = useState<Set<number>>(new Set());

// Novo state para erros de sobreposicao
const [overlapErrors, setOverlapErrors] = useState<OverlapError[]>([]);
```

#### Step 2.4: Modificar handleDateChange para trigger auto-fill

```typescript
const handleDateChange = (index: number, field: 'start_date' | 'end_date', value: string) => {
  const newDates = [...periodDates];
  newDates[index] = { ...newDates[index], [field]: value };

  // Se editou um periodo auto-preenchido, remover a flag
  if (autoFilledPeriods.has(index)) {
    const newAutoFilled = new Set(autoFilledPeriods);
    newAutoFilled.delete(index);
    setAutoFilledPeriods(newAutoFilled);
  }

  // TRIGGER AUTO-FILL: Se preencheu ambas datas do 1o periodo
  if (index === 0 && selectedType) {
    const firstPeriod = { ...newDates[0], [field]: value };

    if (firstPeriod.start_date && firstPeriod.end_date) {
      // Verificar se demais periodos estao vazios
      const otherPeriodsEmpty = newDates.slice(1).every(
        p => !p.start_date && !p.end_date
      );

      if (otherPeriodsEmpty) {
        const totalPeriods = getPeriodCount(selectedType);
        const calculatedDates = calculateAutoFillDates(firstPeriod, totalPeriods);

        // Marcar periodos 2+ como auto-preenchidos
        const newAutoFilled = new Set<number>();
        for (let i = 1; i < totalPeriods; i++) {
          newAutoFilled.add(i);
        }
        setAutoFilledPeriods(newAutoFilled);

        setPeriodDates(calculatedDates);
        setHasChanges(true);

        toast.success('Periodos preenchidos automaticamente');
        return;
      }
    }
  }

  setPeriodDates(newDates);
  setHasChanges(true);

  // Validar sobreposicoes em tempo real
  const errors = validateOverlaps(newDates);
  setOverlapErrors(errors);
};
```

#### Step 2.5: Atualizar JSX do card de periodo

```tsx
{periodDates.map((period, index) => {
  const periodName = getPeriodName(selectedType, index + 1);
  const isCurrent = period.start_date && period.end_date &&
    isCurrentPeriod(period.start_date, period.end_date);
  const isAutoFilled = autoFilledPeriods.has(index);
  const hasError = overlapErrors.some(e => e.periodIndex === index);
  const errorForPeriod = overlapErrors.find(e => e.periodIndex === index);

  return (
    <div key={index}>
      <div
        className={cn(
          'border rounded-lg p-4 transition-colors',
          hasError && 'border-red-500 bg-red-50 dark:bg-red-950',
          !hasError && isCurrent && 'border-green-500 bg-green-50 dark:bg-green-950',
          !hasError && !isCurrent && isAutoFilled && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium">{periodName}</span>
          <div className="flex gap-2">
            {hasError && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Sobreposicao
              </Badge>
            )}
            {!hasError && isCurrent && (
              <Badge variant="success">Periodo Atual</Badge>
            )}
            {!hasError && !isCurrent && isAutoFilled && (
              <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-preenchido
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`start_${index}`}>Data Inicial *</Label>
            <Input
              id={`start_${index}`}
              type="date"
              value={period.start_date}
              onChange={(e) => handleDateChange(index, 'start_date', e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`end_${index}`}>Data Final *</Label>
            <Input
              id={`end_${index}`}
              type="date"
              value={period.end_date}
              onChange={(e) => handleDateChange(index, 'end_date', e.target.value)}
              className={hasError ? 'border-red-500' : ''}
            />
          </div>
        </div>
      </div>

      {/* Mensagem de erro inline */}
      {errorForPeriod && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorForPeriod.message}</span>
        </div>
      )}
    </div>
  );
})}
```

#### Step 2.6: Desabilitar botao Salvar quando houver erros

```tsx
<Button
  onClick={handleSave}
  disabled={saving || !hasChanges || overlapErrors.length > 0}
>
  {/* ... */}
</Button>

{overlapErrors.length > 0 && (
  <p className="text-sm text-red-600 dark:text-red-400">
    Corrija as sobreposicoes antes de salvar
  </p>
)}
```

#### Step 2.7: Importar icone Sparkles

```typescript
import { Calendar, Save, Trash2, AlertTriangle, Pencil, X, Sparkles } from 'lucide-react';
```

### Phase 3 - Validacao

#### Step 3.1: Testes Manuais

- [ ] Selecionar Trimestre, preencher datas do 1o -> auto-fill 2o e 3o
- [ ] Selecionar Bimestre, preencher datas do 1o -> auto-fill 2o, 3o e 4o
- [ ] Selecionar Semestre, preencher datas do 1o -> auto-fill 2o
- [ ] Editar periodo auto-preenchido -> badge "Auto-preenchido" some
- [ ] Criar sobreposicao manual -> card fica vermelho, mensagem aparece
- [ ] Corrigir sobreposicao -> card volta ao normal
- [ ] Tentar salvar com sobreposicao -> botao desabilitado
- [ ] Salvar sem sobreposicao -> sucesso

#### Step 3.2: Build

- [ ] `npm run build` passa sem erros

## Codigo Final - Funcoes Utilitarias

```typescript
// Adicionar no inicio do arquivo, apos os imports

/**
 * Formata Date como string "YYYY-MM-DD"
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula as datas dos periodos subsequentes com base no primeiro periodo
 */
function calculateAutoFillDates(
  firstPeriod: PeriodFormData,
  totalPeriods: number
): PeriodFormData[] {
  const result: PeriodFormData[] = [firstPeriod];

  const startDate = new Date(firstPeriod.start_date + 'T00:00:00');
  const endDate = new Date(firstPeriod.end_date + 'T00:00:00');
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

  let previousEndDate = endDate;

  for (let i = 1; i < totalPeriods; i++) {
    const newStartDate = new Date(previousEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1);

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + durationDays);

    result.push({
      start_date: formatDateToString(newStartDate),
      end_date: formatDateToString(newEndDate),
    });

    previousEndDate = newEndDate;
  }

  return result;
}

interface OverlapError {
  periodIndex: number;
  message: string;
  conflictsWith: number;
}

/**
 * Valida se ha sobreposicao entre periodos
 */
function validateOverlaps(periods: PeriodFormData[]): OverlapError[] {
  const errors: OverlapError[] = [];

  for (let i = 0; i < periods.length; i++) {
    const current = periods[i];
    if (!current.start_date || !current.end_date) continue;

    const currentStart = new Date(current.start_date + 'T00:00:00');
    const currentEnd = new Date(current.end_date + 'T00:00:00');

    // Data inicial >= data final
    if (currentStart >= currentEnd) {
      errors.push({
        periodIndex: i,
        message: 'Data inicial deve ser anterior a data final',
        conflictsWith: i,
      });
      continue;
    }

    // Sobreposicao com periodo anterior
    if (i > 0) {
      const previous = periods[i - 1];
      if (previous.end_date) {
        const previousEnd = new Date(previous.end_date + 'T00:00:00');
        if (currentStart <= previousEnd) {
          errors.push({
            periodIndex: i,
            message: `Inicio deve ser apos ${formatDate(previous.end_date)}`,
            conflictsWith: i - 1,
          });
        }
      }
    }
  }

  return errors;
}
```

## Rollback Plan

### Trigger
- Auto-fill gera datas incorretas
- Validacao falha em casos edge

### Procedimento
1. Reverter alteracoes em `app/admin/trimestres/page.tsx`
2. Impacto: Nenhum em dados - apenas mudanca de UI
3. Tempo: < 5 minutos

## Evidence & Follow-up

**Artefatos a coletar:**
- [ ] Screenshot do auto-fill funcionando
- [ ] Screenshot da validacao de sobreposicao
- [ ] Screenshot do badge "Auto-preenchido"
- [ ] Build passando
