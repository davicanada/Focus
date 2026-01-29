---
status: ready
generated: 2026-01-25
agents:
  - type: "feature-developer"
    role: "Implement checkbox-based student selection"
  - type: "frontend-specialist"
    role: "Ensure mobile-responsive design and good UX"
  - type: "mobile-specialist"
    role: "Test and optimize for mobile devices"
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

# Melhorar Selecao de Alunos nas Ocorrencias Plan

> Alterar UX de selecao de alunos para mostrar todos da turma com checkboxes, em vez de busca por nome

## Task Snapshot
- **Primary goal:** Melhorar a experiencia de selecao de alunos ao registrar ocorrencias. Ao selecionar uma turma, todos os alunos devem aparecer imediatamente em uma lista com checkboxes para selecao direta.
- **Success signal:** Professor consegue ver todos os alunos da turma e marca-los com checkboxes de forma intuitiva, tanto em desktop quanto mobile.
- **Key references:**
  - `app/professor/registrar/page.tsx` - Formulario atual de registro
  - `.context/plans/mobile-responsive-design.md` - Padroes de responsividade

## Codebase Context

### Estado Atual (registrar/page.tsx)
- **Fluxo atual:**
  1. Professor seleciona turma no Select (linha 235-244)
  2. `handleClassChange()` carrega alunos da turma (linha 95-104)
  3. Campo de busca aparece para filtrar alunos (linha 249-275)
  4. Professor digita nome para buscar
  5. Dropdown mostra resultados filtrados
  6. Professor clica para adicionar aluno ao array `selectedStudents`
  7. Badges mostram alunos selecionados (linha 287-310)

- **States relacionados:**
  - `students: Student[]` - Todos os alunos da turma
  - `selectedStudents: Student[]` - Alunos marcados para a ocorrencia
  - `searchTerm: string` - Termo de busca atual

- **Funcoes existentes:**
  - `loadStudents(classId)` - Carrega alunos da turma
  - `handleSelectStudent(student)` - Adiciona aluno
  - `handleRemoveStudent(studentId)` - Remove aluno
  - `handleSelectAll()` - Seleciona todos
  - `handleClearAll()` - Limpa selecao

### Problema de UX
- Usuario precisa DIGITAR nome para ver alunos
- Nao ha visao geral de quem esta na turma
- Mobile: dificil digitar nomes corretamente
- Nao e intuitivo para selecao rapida de multiplos alunos

## Agent Lineup
| Agent | Role in this plan | First responsibility focus |
| --- | --- | --- |
| Feature Developer | Implementar nova UI de selecao | Substituir busca por lista de checkboxes |
| Frontend Specialist | Garantir boa UX | Layout responsivo e acessibilidade |
| Mobile Specialist | Otimizar mobile | Testar em viewports pequenos |

## Risk Assessment

### Identified Risks
| Risk | Probability | Impact | Mitigation Strategy |
| --- | --- | --- | --- |
| Turmas grandes (50+ alunos) | Medium | Medium | Scroll virtual ou paginacao se necessario |
| Performance no mobile | Low | Medium | Usar CSS grid eficiente, evitar re-renders |

### Dependencies
- **Internal:** Nenhuma
- **External:** Nenhuma
- **Technical:** Nenhuma

### Assumptions
- Turmas tem em media 20-40 alunos (cabe na tela)
- Checkboxes sao mais intuitivos que busca por texto
- Botoes "Selecionar Todos" e "Limpar" ja existem e serao mantidos

## Working Phases

### Phase 1 - Discovery & Alignment (CONCLUIDO)
**Analise Concluida:**
1. Revisado codigo atual de selecao de alunos
2. Identificados states e funcoes existentes
3. Definida nova abordagem: lista com checkboxes

**Decisoes de Design:**
- Remover campo de busca textual
- Mostrar TODOS alunos da turma ao selecionar
- Cada aluno = checkbox + nome
- Layout: grid responsivo (2 colunas mobile, 3-4 desktop)
- Manter botoes "Selecionar Todos" e "Limpar"
- Contador mostra "X de Y selecionados"

### Phase 2 - Implementation & Iteration

**Step 2.1: Remover UI de Busca**
Arquivo: `app/professor/registrar/page.tsx`

Remover:
- Input de busca com icone Search (linhas 249-259)
- Dropdown de resultados filtrados (linhas 261-275)
- State `searchTerm` e seu uso

**Step 2.2: Criar Lista de Checkboxes**
Nova UI apos selecionar turma:

```tsx
{selectedClass && students.length > 0 && (
  <div className="space-y-3">
    {/* Header com contador e botoes */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <Label>
        Alunos ({selectedStudents.length} de {students.length} selecionados)
      </Label>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          Selecionar Todos
        </Button>
        <Button variant="outline" size="sm" onClick={handleClearAll}>
          Limpar
        </Button>
      </div>
    </div>

    {/* Grid de checkboxes responsivo */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 border rounded-md bg-muted/30">
      {students.map((student) => {
        const isSelected = selectedStudents.some(s => s.id === student.id);
        return (
          <label
            key={student.id}
            className={`
              flex items-center gap-2 p-2 rounded-md cursor-pointer
              transition-colors hover:bg-muted
              ${isSelected ? 'bg-primary/10 border border-primary/30' : ''}
            `}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => isSelected
                ? handleRemoveStudent(student.id)
                : handleSelectStudent(student)
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm truncate">{student.full_name}</span>
          </label>
        );
      })}
    </div>
  </div>
)}

{selectedClass && students.length === 0 && (
  <p className="text-sm text-muted-foreground py-4 text-center">
    Nenhum aluno cadastrado nesta turma
  </p>
)}
```

**Step 2.3: Simplificar State**
- Remover `searchTerm` state (nao mais necessario)
- Remover `filteredStudents` computed value
- Manter `students` e `selectedStudents`

**Step 2.4: Ajustar Funcoes**
- `handleSelectStudent`: Remover `setSearchTerm('')`
- `handleClassChange`: Remover `setSearchTerm('')`

**Step 2.5: Responsividade Mobile**
Conforme `.context/plans/mobile-responsive-design.md`:
- Breakpoint sm (640px) para grid de 2 colunas
- Grid: 1 coluna em mobile, 2 em desktop
- Touch targets minimo 44x44px (p-2 garante isso)
- Scroll interno com max-h-64 para nao empurrar formulario

**Arquivos a Modificar:**
| Arquivo | Acao | Descricao |
| --- | --- | --- |
| `app/professor/registrar/page.tsx` | Modificar | Substituir busca por checkboxes |

### Phase 3 - Validation & Handoff

**Step 3.1: Testes Manuais**
- [ ] Selecionar turma mostra todos alunos
- [ ] Clicar em checkbox seleciona/deseleciona aluno
- [ ] "Selecionar Todos" marca todos
- [ ] "Limpar" desmarca todos
- [ ] Contador atualiza corretamente
- [ ] Registrar ocorrencia funciona normalmente

**Step 3.2: Testes Mobile**
- [ ] Layout 1 coluna em viewport 375px
- [ ] Touch targets funcionais
- [ ] Scroll interno funciona
- [ ] Nao ha overflow horizontal

**Step 3.3: Build**
- [ ] `npm run build` passa sem erros

## Rollback Plan

### Rollback Triggers
- Bug que impede selecao de alunos
- Performance ruim com muitos alunos

### Rollback Procedures
#### Phase 2 Rollback
- Action: Reverter codigo para versao anterior (git revert)
- Data Impact: Nenhum - apenas mudanca de UI
- Observacao: Funcionalidade permanece a mesma

## Evidence & Follow-up

**Artefatos a Coletar:**
- [ ] Screenshot mobile da lista de checkboxes
- [ ] Screenshot desktop da lista de checkboxes
- [ ] Build passando

**Melhorias Futuras (Opcional):**
- Busca/filtro ADICIONAL aos checkboxes para turmas muito grandes
- Ordenar alunos por nome automaticamente (ja esta)
- Agrupar por algum criterio se necessario
