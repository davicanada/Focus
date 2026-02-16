'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FileUp,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  Upload,
} from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { ParseResult, ParsedClass, ImportResult } from '@/lib/pdf/types';

type ImportStep = 'upload' | 'parsing' | 'preview' | 'confirming' | 'result';
type ParseFormat = 'sedu-es' | 'ai';

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  year: number;
  schoolYearId?: string;
  existingClassNames: string[];
  onImportComplete: () => void;
}

export function PdfImportModal({
  isOpen,
  onClose,
  institutionId,
  year,
  schoolYearId,
  existingClassNames,
  onImportComplete,
}: PdfImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [format, setFormat] = useState<ParseFormat>('sedu-es');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setSelectedClasses(new Set());
    setExpandedClasses(new Set());
    setImportResult(null);
    setError(null);
    setProgress({ current: 0, total: 0 });
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Selecione um arquivo PDF válido.');
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setStep('parsing');
    setError(null);

    try {
      // Dynamic import to keep pdfjs-dist out of initial bundle
      const { extractTextFromPdf } = await import('@/lib/pdf/extract-text');

      const pages = await extractTextFromPdf(file, (current, total) => {
        setProgress({ current, total });
      });

      let result: ParseResult;

      if (format === 'sedu-es') {
        const { parseSeduEsPdf } = await import('@/lib/pdf/sedu-parser');
        result = parseSeduEsPdf(pages);
      } else {
        // AI parser runs server-side
        const response = await fetch('/api/parse-pdf-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages }),
        });

        if (!response.ok) {
          throw new Error('Erro ao analisar PDF com IA');
        }

        result = await response.json();
      }

      if (result.classes.length === 0) {
        setError('Nenhuma turma encontrada no PDF. Verifique o formato do arquivo.');
        setStep('upload');
        return;
      }

      setParseResult(result);
      // Select all classes by default
      setSelectedClasses(new Set(result.classes.map((_, i) => i)));
      setStep('preview');
    } catch (err) {
      console.error('Parse error:', err);
      setError(`Erro ao processar PDF: ${err instanceof Error ? err.message : String(err)}`);
      setStep('upload');
    }
  };

  const handleToggleClass = (index: number) => {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleExpand = (index: number) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (parseResult) {
      setSelectedClasses(new Set(parseResult.classes.map((_, i) => i)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedClasses(new Set());
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setStep('confirming');
    setError(null);

    try {
      const classesToImport = parseResult.classes.filter((_, i) => selectedClasses.has(i));

      const response = await fetch('/api/import-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classes: classesToImport,
          institutionId,
          schoolYearId,
          year,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao importar dados');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('result');
    } catch (err) {
      console.error('Import error:', err);
      setError(`Erro ao importar: ${err instanceof Error ? err.message : String(err)}`);
      setStep('preview');
    }
  };

  const isClassExisting = (cls: ParsedClass) => {
    return existingClassNames.some(
      (name) => name.toLowerCase() === cls.name.toLowerCase()
    );
  };

  const selectedStudentCount = parseResult
    ? parseResult.classes
        .filter((_, i) => selectedClasses.has(i))
        .reduce((sum, c) => sum + c.students.length, 0)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar PDF"
      description="Importe turmas e alunos a partir de um PDF"
      className="max-w-2xl"
    >
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato do PDF</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="sedu-es"
                  checked={format === 'sedu-es'}
                  onChange={() => setFormat('sedu-es')}
                  className="accent-primary"
                />
                <span className="text-sm">SEDU-ES (padrão)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="ai"
                  checked={format === 'ai'}
                  onChange={() => setFormat('ai')}
                  className="accent-primary"
                />
                <span className="text-sm">Outro formato (IA)</span>
              </label>
            </div>
            {format === 'ai' && (
              <p className="text-xs text-muted-foreground">
                A IA tentará identificar turmas e alunos automaticamente. Pode ser mais lento.
              </p>
            )}
          </div>

          {/* File input */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <FileUp className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar um arquivo PDF
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleParse} disabled={!file}>
              <FileUp className="h-4 w-4 mr-2" />
              Processar PDF
            </Button>
          </ModalFooter>
        </div>
      )}

      {/* Step 2: Parsing */}
      {step === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">
            {format === 'sedu-es' ? 'Analisando PDF...' : 'Analisando PDF com IA...'}
          </p>
          {progress.total > 0 && (
            <div className="w-full max-w-xs">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Página {progress.current} de {progress.total}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && parseResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between text-sm">
            <span>
              <strong>{parseResult.classes.length}</strong> turmas,{' '}
              <strong>{parseResult.totalStudents}</strong> alunos detectados
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Selecionar todos
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                Limpar
              </Button>
            </div>
          </div>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              {parseResult.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Class list */}
          <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg">
            {parseResult.classes.map((cls, index) => {
              const existing = isClassExisting(cls);
              const selected = selectedClasses.has(index);
              const expanded = expandedClasses.has(index);

              return (
                <div key={index} className={`border-b last:border-b-0 ${!selected ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleToggleClass(index)}
                      className="accent-primary shrink-0"
                    />
                    <button
                      onClick={() => handleToggleExpand(index)}
                      className="shrink-0"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <span className="font-medium text-sm flex-1">
                      {cls.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cls.students.length} aluno(s)
                    </span>
                    {existing && (
                      <Badge variant="warning" className="text-xs">
                        Já existe
                      </Badge>
                    )}
                  </div>
                  {expanded && (
                    <div className="px-10 pb-2 space-y-0.5">
                      {cls.students.map((student, si) => (
                        <div key={si} className="text-xs text-muted-foreground flex justify-between">
                          <span>{student.name}</span>
                          {student.registration && (
                            <span className="text-muted-foreground/60">{student.registration}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => { reset(); }}>
              Voltar
            </Button>
            <Button onClick={handleImport} disabled={selectedClasses.size === 0}>
              Importar {selectedClasses.size} turma(s) e {selectedStudentCount} aluno(s)
            </Button>
          </ModalFooter>
        </div>
      )}

      {/* Step 4: Confirming */}
      {step === 'confirming' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Importando dados...</p>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 'result' && importResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Importação concluída!</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Turmas criadas:</span>
              <strong>{importResult.classesCreated}</strong>
            </div>
            {importResult.classesExisting > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Turmas já existentes (puladas):</span>
                <strong>{importResult.classesExisting}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span>Alunos criados:</span>
              <strong>{importResult.studentsCreated}</strong>
            </div>
            {importResult.studentsDuplicate > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Alunos duplicados (pulados):</span>
                <strong>{importResult.studentsDuplicate}</strong>
              </div>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400">
                  {err}
                </p>
              ))}
            </div>
          )}

          <ModalFooter>
            <Button
              onClick={() => {
                handleClose();
                onImportComplete();
              }}
            >
              Fechar
            </Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}
