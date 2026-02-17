---
status: filled
generated: 2026-02-16
agents:
  - type: "feature-developer"
    role: "Implement PDF parser, API routes, and frontend components"
  - type: "frontend-specialist"
    role: "Build import modal UI with preview and confirmation flow"
phases:
  - id: "phase-1"
    name: "PDF parsing library + SEDU-ES parser"
    prevc: "E"
  - id: "phase-2"
    name: "API routes + AI parser fallback"
    prevc: "E"
  - id: "phase-3"
    name: "Frontend UI integration"
    prevc: "E"
  - id: "phase-4"
    name: "Validacao e testes"
    prevc: "V"
---

# Importacao de turmas e alunos via PDF

> Botao "Importar PDF" na pagina de turmas com parser SEDU-ES como padrao e opcao AI (Gemini/Groq) para outros formatos. Preview antes de confirmar.

## Task Snapshot
- **Primary goal:** Permitir que admins importem turmas e alunos diretamente de PDFs do sistema SEDU-ES (e outros formatos via AI), sem necessidade de intervencao tecnica.
- **Success signal:** Admin consegue fazer upload de PDF, visualizar preview com turmas e alunos detectados, confirmar, e ver dados criados no sistema.
- **Localizacao:** Integrado na pagina existente `/admin/turmas` (nao criar pagina nova).

## Arquitetura

### Fluxo do Usuario
```
1. Admin clica "Importar PDF" na pagina de turmas
2. Modal abre com:
   - Seletor de formato: "SEDU-ES (padrao)" | "Outro formato (IA)"
   - Input de arquivo PDF
3. PDF e lido no BROWSER (client-side, pdfjs-dist)
4. Texto extraido e parseado:
   - SEDU-ES: regex parser TypeScript (deterministico)
   - Outro: texto enviado para API -> Gemini/Groq interpreta
5. Preview mostra tabela com turmas detectadas e contagem de alunos
6. Admin pode remover turmas individuais do preview
7. Admin confirma -> API cria turmas e alunos no banco
8. Resumo final mostra X turmas e Y alunos criados
```

### Decisoes Tecnicas
- **pdfjs-dist** (Mozilla PDF.js) para extracao de texto client-side
  - Motivo: PDF nunca sai do browser do usuario (LGPD)
  - Nao precisa upload para servidor
  - Pacote ja suporta Worker para nao travar UI
- **Parser SEDU-ES** em TypeScript puro (sem AI)
  - Traduzido do script Python que ja funcionou com 449 alunos
  - Regex patterns para: header de turma, ID INEP, nome multi-linha, data nascimento
  - Deterministico, rapido, sem custo de API
- **Parser AI** como fallback para outros formatos
  - Envia texto extraido para API route existente (`/api/ai-analytics` como base)
  - Prompt especifico para extrair turmas e alunos de texto livre
  - Usa Gemini (primario) / Groq (fallback) ja configurados
- **API Route** `POST /api/import-students` para bulk insert
  - Recebe array de { turma, alunos[] }
  - Cria turmas que nao existem, insere alunos
  - Retorna resumo de criacao

### Pacotes Necessarios
- `pdfjs-dist` - Mozilla PDF.js para extracao de texto client-side

### Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/pdf/sedu-parser.ts` | NOVO | Parser SEDU-ES (regex TypeScript) |
| `lib/pdf/ai-parser.ts` | NOVO | Parser AI (Gemini/Groq) |
| `lib/pdf/extract-text.ts` | NOVO | Wrapper pdfjs-dist para extracao |
| `lib/pdf/types.ts` | NOVO | Tipos: ParsedClass, ParsedStudent, ImportResult |
| `app/api/import-students/route.ts` | NOVO | API bulk insert turmas + alunos |
| `components/import/PdfImportModal.tsx` | NOVO | Modal com upload, preview, confirmacao |
| `app/admin/turmas/page.tsx` | MODIFICAR | Adicionar botao "Importar PDF" e estado do modal |

## Working Phases

### Phase 1 — PDF parsing library + SEDU-ES parser

**Steps**
1. Instalar `pdfjs-dist` via npm
2. Criar `lib/pdf/types.ts` com interfaces:
   - `ParsedStudent { name: string; registration: string }`
   - `ParsedClass { turmaRaw: string; grade: string; section: string; shift: string; educationLevel: string; students: ParsedStudent[] }`
   - `ParseResult { classes: ParsedClass[]; totalStudents: number; format: 'sedu-es' | 'ai'; warnings: string[] }`
3. Criar `lib/pdf/extract-text.ts`:
   - Funcao `extractTextFromPdf(file: File): Promise<string[]>` (retorna array de strings por pagina)
   - Usa pdfjs-dist Worker
4. Criar `lib/pdf/sedu-parser.ts`:
   - Funcao `parseSeduEsPdf(pages: string[]): ParseResult`
   - Traduzir logica do Python: deteccao de turma header, extracao de ID INEP + nome multi-linha
   - Mapear formato turma (ex: "1V01-EF") para campos do sistema (grade, section, shift, education_level)
   - Tratar edge cases: nomes multi-linha, INEP codes intercalados, paginas quebradas

### Phase 2 — API routes + AI parser fallback

**Steps**
1. Criar `lib/pdf/ai-parser.ts`:
   - Funcao `parseWithAI(pages: string[]): Promise<ParseResult>`
   - Prompt para Gemini/Groq: "Extraia turmas e alunos do texto. Para cada turma identifique: nome da turma, serie, secao, turno, nivel de ensino. Para cada aluno: nome completo, numero de matricula."
   - Retorna mesmo tipo ParseResult para compatibilidade
2. Criar `app/api/import-students/route.ts`:
   - POST: recebe `{ classes: ParsedClass[], institutionId: string, schoolYearId: string }`
   - Para cada classe: verifica se turma ja existe (por name), cria se nao existir
   - Para cada aluno: verifica duplicata por enrollment_number, insere se novo
   - Usa `createServiceClient()` para bypassa RLS
   - Retorna: `{ classesCreated: number, classesExisting: number, studentsCreated: number, studentsDuplicate: number, errors: string[] }`

### Phase 3 — Frontend UI integration

**Steps**
1. Criar `components/import/PdfImportModal.tsx`:
   - **Step 1 - Upload**: Seletor de formato (radio) + input file (.pdf)
   - **Step 2 - Parsing**: Spinner enquanto parseia, barra de progresso
   - **Step 3 - Preview**: Tabela com turmas, contagem de alunos, checkbox para selecionar/deselecionar
     - Expandir turma para ver lista de alunos
     - Highlight turmas que ja existem no sistema (amarelo)
     - Highlight alunos duplicados (enrollment_number ja existe)
   - **Step 4 - Confirmacao**: Resumo "Criar X turmas e Y alunos?" com botao confirmar
   - **Step 5 - Resultado**: Resumo final com sucesso/erros
2. Modificar `app/admin/turmas/page.tsx`:
   - Adicionar state `showImportModal`
   - Adicionar botao "Importar PDF" (icone FileUp) ao lado de "Adicionar Turma"
   - Renderizar `<PdfImportModal>` condicionalmente
   - Recarregar lista de turmas apos import bem-sucedido

### Phase 4 — Validacao e testes

**Steps**
1. Testar com PDF real da SEDU-ES (Alunos por turma CPF.pdf)
2. Verificar que parser detecta 18 turmas e 449 alunos
3. Testar com PDF de formato diferente via parser AI
4. Testar edge cases: PDF vazio, PDF sem turmas, turma ja existente, aluno duplicado
5. Verificar responsividade mobile do modal
6. Build passando sem erros TypeScript

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| pdfjs-dist e grande (~2MB) | Carregar via dynamic import / lazy loading |
| PDF com encoding estranho | Fallback para AI parser |
| AI parser retorna formato invalido | Validacao rigorosa + try/catch com mensagem amigavel |
| Turmas duplicadas | Verificar por name antes de criar, mostrar warning no preview |
| Alunos duplicados | Verificar por enrollment_number, skip com aviso |

## Fora do Escopo (futuro)
- Edicao de nomes no preview antes de importar
- Importacao de dados adicionais (telefone, data nascimento, responsavel)
- Suporte a Excel/CSV (ja existe importacao de alunos por Excel)
- Historico de importacoes
