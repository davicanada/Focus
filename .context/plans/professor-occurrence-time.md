---
status: ready
generated: 2026-01-25
agents:
  - type: "feature-developer"
    role: "Implement time input fields in registration and edit forms"
  - type: "frontend-specialist"
    role: "Ensure good UX for date/time selection"
phases:
  - id: "phase-1"
    name: "Discovery & Alignment"
    prevc: "P"
  - id: "phase-2"
    name: "Implementation & Iteration"
    prevc: "E"
  - id: "phase-3"
    name: "Validation & Handoff"
    prevc: "V"
---

# Adicionar Hora nas Ocorrencias Plan

> Permitir professor selecionar hora da ocorrencia ao registrar e editar

## Task Snapshot
- **Primary goal:** Adicionar campo de hora ao formulario de registro e edicao de ocorrencias, permitindo ao professor especificar o horario exato do evento.
- **Success signal:** Professor consegue selecionar data E hora ao registrar nova ocorrencia e ao editar ocorrencia existente. A hora e persistida no banco e exibida corretamente na listagem.
- **Key references:**
  - `app/professor/registrar/page.tsx` - Formulario de registro
  - `app/professor/ocorrencias/page.tsx` - Lista e modal de edicao
  - `lib/utils.ts` - Funcoes de formatacao (formatDateTime)

## Codebase Context

### Estado Atual
- **Banco de dados:** Coluna `occurrence_date` e `timestamp with time zone` - JA SUPORTA hora!
- **Registro (`registrar/page.tsx`):**
  - Linha 36: `occurrenceDate` state (apenas data, sem hora)
  - Linha 341-347: Input `type="date"` (nao tem hora)
  - Linha 155: Salva como `new Date(occurrenceDate).toISOString()` (hora = 00:00:00)
- **Edicao (`ocorrencias/page.tsx`):**
  - Linha 166: `occurrence_date.split('T')[0]` (descarta a hora)
  - Modal de edicao tem apenas Input `type="date"`

### Mudanca Necessaria
- Adicionar Input `type="time"` ao lado do Input `type="date"`
- Combinar data + hora ao salvar: `${date}T${time}:00`
- Extrair hora do timestamp existente ao editar

## Agent Lineup
| Agent | Role in this plan | First responsibility focus |
| --- | --- | --- |
| Feature Developer | Implementar inputs de hora | Adicionar campo de hora nos dois formularios |
| Frontend Specialist | UX de selecao data/hora | Layout responsivo, valores padrao sensatos |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Fuso horario incorreto | Low | Medium | Usar formato ISO que normaliza corretamente |
| Ocorrencias antigas sem hora | None | None | Continuarao funcionando (hora = 00:00) |

### Dependencies
- **Internal:** Nenhuma
- **External:** Nenhuma
- **Technical:** Nenhuma migration necessaria (banco ja suporta timestamp)

### Assumptions
- Hora padrao para novas ocorrencias: hora atual
- Formato de hora: HH:mm (24 horas, padrao brasileiro)
- Ocorrencias antigas continuam validas (hora = 00:00:00)

## Working Phases

### Phase 1 - Discovery & Alignment (CONCLUIDO)
**Analise Concluida:**
1. Verificado schema do banco: `occurrence_date` e `timestamp with time zone`
2. Analisado formulario de registro: usa `type="date"` sem hora
3. Analisado modal de edicao: tambem usa apenas `type="date"`
4. Funcao `formatDateTime` em utils.ts ja formata data E hora

**Decisoes de Design:**
- Adicionar Input `type="time"` ao lado do Input `type="date"`
- Layout: dois inputs lado a lado em grid `grid-cols-2`
- Hora padrao: hora atual do sistema
- Label: "Data *" e "Hora *" (ambos obrigatorios)

### Phase 2 - Implementation & Iteration

**Step 2.1: Atualizar Formulario de Registro**
Arquivo: `app/professor/registrar/page.tsx`

Mudancas:
1. Adicionar state para hora (linha ~37):
```tsx
const [occurrenceTime, setOccurrenceTime] = useState(
  new Date().toTimeString().slice(0, 5) // "HH:mm"
);
```

2. Atualizar UI - substituir input de data por grid com data e hora:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="date">Data *</Label>
    <Input type="date" value={occurrenceDate} onChange={...} max={...} />
  </div>
  <div className="space-y-2">
    <Label htmlFor="time">Hora *</Label>
    <Input type="time" value={occurrenceTime} onChange={...} />
  </div>
</div>
```

3. Combinar no submit (linha ~155):
```tsx
occurrence_date: `${occurrenceDate}T${occurrenceTime}:00`,
```

4. Reset do formulario incluir hora (linha ~170):
```tsx
setOccurrenceTime(new Date().toTimeString().slice(0, 5));
```

**Step 2.2: Atualizar Modal de Edicao**
Arquivo: `app/professor/ocorrencias/page.tsx`

Mudancas:
1. Adicionar campo de hora no editForm state:
```tsx
const [editForm, setEditForm] = useState({
  occurrence_type_id: '',
  occurrence_date: '',
  occurrence_time: '', // NOVO
  description: '',
});
```

2. Extrair hora ao abrir modal (handleOpenEdit):
```tsx
const dateTime = new Date(occurrence.occurrence_date);
setEditForm({
  ...
  occurrence_date: occurrence.occurrence_date.split('T')[0],
  occurrence_time: dateTime.toTimeString().slice(0, 5), // "HH:mm"
});
```

3. Combinar ao salvar (handleSaveEdit):
```tsx
occurrence_date: `${editForm.occurrence_date}T${editForm.occurrence_time}:00`,
```

4. Adicionar Input de hora no modal - substituir input de data por grid:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="edit_date">Data *</Label>
    <Input type="date" ... />
  </div>
  <div className="space-y-2">
    <Label htmlFor="edit_time">Hora *</Label>
    <Input type="time" ... />
  </div>
</div>
```

**Arquivos a Modificar:**
| Arquivo | Acao | Descricao |
| --- | --- | --- |
| `app/professor/registrar/page.tsx` | Modificar | Adicionar state e input de hora |
| `app/professor/ocorrencias/page.tsx` | Modificar | Adicionar hora no editForm e modal |

### Phase 3 - Validation & Handoff

**Step 3.1: Testes Manuais**
- [ ] Registrar nova ocorrencia com hora especifica
- [ ] Verificar que hora aparece na listagem (formatDateTime)
- [ ] Editar ocorrencia e alterar hora
- [ ] Verificar persistencia no banco (timestamp completo)
- [ ] Testar ocorrencias antigas (devem mostrar 00:00)

**Step 3.2: Build**
- [ ] `npm run build` passa sem erros

**Step 3.3: Atualizar CLAUDE.md**
- Documentar nova funcionalidade

## Rollback Plan

### Rollback Triggers
- Bug que impede registro de ocorrencias
- Hora sendo salva incorretamente

### Rollback Procedures
#### Phase 2 Rollback
- Action: Reverter codigo para versao anterior (git revert)
- Data Impact: Nenhum - dados existentes continuam validos
- Observacao: Ocorrencias criadas com hora continuarao funcionando

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot do formulario de registro com campo de hora
- [ ] Screenshot do modal de edicao com campo de hora
- [ ] Exemplo de timestamp salvo no banco

**Melhorias Futuras (Opcional):**
- Validacao: hora nao pode ser futura se data for hoje
- Preset de horarios comuns (inicio das aulas, intervalo, etc.)
