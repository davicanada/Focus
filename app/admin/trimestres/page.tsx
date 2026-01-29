'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Calendar, Save, Trash2, AlertTriangle, Pencil, X, Sparkles } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDate, cn } from '@/lib/utils';
import { PERIOD_TYPES, getPeriodName, getPeriodCount } from '@/lib/constants/periods';
import type { User, Institution, Quarter, PeriodType } from '@/types';

interface PeriodFormData {
  start_date: string;
  end_date: string;
}

interface OverlapError {
  periodIndex: number;
  message: string;
  conflictsWith: number;
}

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
        message: 'Data inicial deve ser anterior à data final',
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
            message: `Início deve ser após ${formatDate(previous.end_date)}`,
            conflictsWith: i - 1,
          });
        }
      }
    }
  }

  return errors;
}

export default function PeriodosPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [loadingQuarters, setLoadingQuarters] = useState(false);

  // Mode state (VIEW or EDIT)
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState<PeriodType | ''>('');
  const [periodDates, setPeriodDates] = useState<PeriodFormData[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Original state for cancel functionality
  const [originalType, setOriginalType] = useState<PeriodType | ''>('');
  const [originalDates, setOriginalDates] = useState<PeriodFormData[]>([]);

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<PeriodType | null>(null);

  // Auto-fill and validation state
  const [autoFilledPeriods, setAutoFilledPeriods] = useState<Set<number>>(new Set());
  const [overlapErrors, setOverlapErrors] = useState<OverlapError[]>([]);

  const initializeFormFromQuarters = useCallback((loadedQuarters: Quarter[]) => {
    if (loadedQuarters.length > 0 && loadedQuarters[0].period_type) {
      const type = loadedQuarters[0].period_type as PeriodType;
      setSelectedType(type);
      setOriginalType(type);

      // Preencher as datas dos períodos existentes
      const dates: PeriodFormData[] = [];
      const count = getPeriodCount(type);
      for (let i = 1; i <= count; i++) {
        const existing = loadedQuarters.find((q: Quarter) => q.period_number === i);
        dates.push({
          start_date: existing?.start_date || '',
          end_date: existing?.end_date || '',
        });
      }
      setPeriodDates(dates);
      setOriginalDates(dates);
      setIsEditing(false); // VIEW mode when periods exist
    } else {
      setIsEditing(true); // EDIT mode when no periods
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (role !== 'admin' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      await loadQuarters(institution.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadQuarters = async (institutionId: string) => {
    setLoadingQuarters(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('quarters')
        .select('*')
        .eq('institution_id', institutionId)
        .order('period_number', { ascending: true });

      if (error) throw error;

      const loadedQuarters = data || [];
      setQuarters(loadedQuarters);
      initializeFormFromQuarters(loadedQuarters);
    } catch (error) {
      console.error('Error loading quarters:', error);
      toast.error('Erro ao carregar períodos');
    } finally {
      setLoadingQuarters(false);
    }
  };

  const handleEdit = () => {
    // Save original state before editing
    setOriginalType(selectedType);
    setOriginalDates([...periodDates]);
    setIsEditing(true);
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Restore original state
    setSelectedType(originalType);
    setPeriodDates([...originalDates]);
    setIsEditing(false);
    setHasChanges(false);
    setAutoFilledPeriods(new Set());
    setOverlapErrors([]);
  };

  const handleTypeChange = (newType: PeriodType) => {
    // Se já existem períodos e o tipo é diferente, mostrar confirmação
    if (quarters.length > 0 && selectedType && selectedType !== newType) {
      setPendingTypeChange(newType);
      setShowConfirmModal(true);
      return;
    }

    applyTypeChange(newType);
  };

  const applyTypeChange = (type: PeriodType) => {
    setSelectedType(type);
    const count = getPeriodCount(type);

    // Inicializar array de datas vazias
    const emptyDates: PeriodFormData[] = Array(count).fill(null).map(() => ({
      start_date: '',
      end_date: '',
    }));

    setPeriodDates(emptyDates);
    setHasChanges(true);
    setAutoFilledPeriods(new Set());
    setOverlapErrors([]);
  };

  const handleConfirmTypeChange = async () => {
    if (!pendingTypeChange || !currentInstitution) return;

    // Excluir períodos existentes
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('quarters')
        .delete()
        .eq('institution_id', currentInstitution.id);

      if (error) throw error;

      setQuarters([]);
      setOriginalType('');
      setOriginalDates([]);
      applyTypeChange(pendingTypeChange);
      toast.success('Períodos anteriores excluídos');
    } catch (error) {
      console.error('Error deleting quarters:', error);
      toast.error('Erro ao excluir períodos anteriores');
    } finally {
      setShowConfirmModal(false);
      setPendingTypeChange(null);
    }
  };

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
        // Verificar se data inicial e anterior a data final
        const startDate = new Date(firstPeriod.start_date + 'T00:00:00');
        const endDate = new Date(firstPeriod.end_date + 'T00:00:00');

        if (startDate < endDate) {
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
            setOverlapErrors([]); // Limpar erros pois auto-fill gera datas validas

            toast.success('Períodos preenchidos automaticamente');
            return;
          }
        }
      }
    }

    setPeriodDates(newDates);
    setHasChanges(true);

    // Validar sobreposicoes em tempo real
    const errors = validateOverlaps(newDates);
    setOverlapErrors(errors);
  };

  const validateDates = (): string | null => {
    if (!selectedType) return 'Selecione o tipo de período';

    for (let i = 0; i < periodDates.length; i++) {
      const period = periodDates[i];
      const name = getPeriodName(selectedType, i + 1);

      if (!period.start_date || !period.end_date) {
        return `Preencha as datas do ${name}`;
      }

      if (new Date(period.start_date) >= new Date(period.end_date)) {
        return `${name}: Data inicial deve ser anterior à data final`;
      }

      // Validar sequência (período N+1 deve começar após período N terminar)
      if (i > 0) {
        const prevPeriod = periodDates[i - 1];
        if (new Date(period.start_date) <= new Date(prevPeriod.end_date)) {
          const prevName = getPeriodName(selectedType, i);
          return `${name} deve começar após o fim do ${prevName}`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateDates();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!currentInstitution || !selectedType) return;

    setSaving(true);
    try {
      const supabase = createClient();

      // Excluir períodos existentes
      await supabase
        .from('quarters')
        .delete()
        .eq('institution_id', currentInstitution.id);

      // Criar novos períodos
      const newQuarters = periodDates.map((period, index) => ({
        institution_id: currentInstitution.id,
        name: getPeriodName(selectedType, index + 1),
        start_date: period.start_date,
        end_date: period.end_date,
        period_type: selectedType,
        period_number: index + 1,
        is_active: true,
      }));

      const { error } = await supabase
        .from('quarters')
        .insert(newQuarters);

      if (error) throw error;

      toast.success('Períodos salvos com sucesso!');
      setHasChanges(false);
      setIsEditing(false);

      // Update original state after successful save
      setOriginalType(selectedType);
      setOriginalDates([...periodDates]);

      loadQuarters(currentInstitution.id);
    } catch (error) {
      console.error('Error saving quarters:', error);
      toast.error('Erro ao salvar períodos');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Deseja excluir todos os períodos? Esta ação não pode ser desfeita.')) return;
    if (!currentInstitution) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('quarters')
        .delete()
        .eq('institution_id', currentInstitution.id);

      if (error) throw error;

      setQuarters([]);
      setSelectedType('');
      setPeriodDates([]);
      setOriginalType('');
      setOriginalDates([]);
      setHasChanges(false);
      setIsEditing(true); // Go to EDIT mode after deleting all
      toast.success('Períodos excluídos');
    } catch (error) {
      console.error('Error deleting quarters:', error);
      toast.error('Erro ao excluir períodos');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    removeFromStorage('currentRole');
    removeFromStorage('currentUser');
    removeFromStorage('currentInstitution');
    removeFromStorage('userInstitutions');
    router.push('/');
  };

  // Helper para obter data de hoje como string "YYYY-MM-DD" no timezone local
  const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Compara datas como calendário (ignora timezone)
  const isCurrentPeriod = (startDate: string, endDate: string) => {
    const todayStr = getTodayStr();
    return todayStr >= startDate && todayStr <= endDate;
  };

  // Verifica se uma data já passou (comparação de calendário)
  const isPastDate = (dateStr: string) => {
    return dateStr < getTodayStr();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardLayout
      userName={currentUser?.full_name || ''}
      userEmail={currentUser?.email || ''}
      currentRole="admin"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Períodos Acadêmicos</h1>
          <p className="text-muted-foreground">
            Configure os períodos letivos da instituição
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>
                  {isEditing ? 'Configuração de Períodos' : 'Períodos Configurados'}
                </CardTitle>
              </div>

              {/* Header actions based on mode */}
              {!isEditing && quarters.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {isEditing && quarters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
            <CardDescription>
              {isEditing
                ? 'Escolha o tipo de divisão do ano letivo e defina as datas de cada período'
                : selectedType
                  ? `${PERIOD_TYPES[selectedType].label} (${PERIOD_TYPES[selectedType].count} períodos)`
                  : 'Nenhum período configurado'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingQuarters ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : isEditing ? (
              /* EDIT MODE */
              <div className="space-y-6">
                {/* Seleção do tipo de período */}
                <div className="space-y-2">
                  <Label htmlFor="period_type">Tipo de Período *</Label>
                  <Select
                    id="period_type"
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value as PeriodType)}
                  >
                    <option value="">Selecione o tipo de período...</option>
                    {Object.entries(PERIOD_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label} ({value.count} períodos)
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Campos de data para cada período */}
                {selectedType && periodDates.length > 0 && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-medium mb-4">
                        Datas dos {PERIOD_TYPES[selectedType].label}s
                      </h3>

                      <div className="space-y-4">
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
                                        Sobreposição
                                      </Badge>
                                    )}
                                    {!hasError && isCurrent && (
                                      <Badge variant="success">Período Atual</Badge>
                                    )}
                                    {!hasError && !isCurrent && isAutoFilled && (
                                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
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
                                      className={hasError ? 'border-red-500 focus:ring-red-500' : ''}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`end_${index}`}>Data Final *</Label>
                                    <Input
                                      id={`end_${index}`}
                                      type="date"
                                      value={period.end_date}
                                      onChange={(e) => handleDateChange(index, 'end_date', e.target.value)}
                                      className={hasError ? 'border-red-500 focus:ring-red-500' : ''}
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
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="space-y-3 pt-4 border-t">
                      {/* Mensagem de erro de sobreposição */}
                      {overlapErrors.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          <span>Corrija as sobreposições antes de salvar</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        {quarters.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={handleDeleteAll}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Todos
                          </Button>
                        )}
                        <div className={`flex gap-2 ${quarters.length === 0 ? 'ml-auto' : ''}`}>
                          {quarters.length > 0 && (
                            <Button variant="outline" onClick={handleCancel}>
                              Cancelar
                            </Button>
                          )}
                          <Button
                            onClick={handleSave}
                            disabled={saving || !hasChanges || overlapErrors.length > 0}
                          >
                            {saving ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Salvar Períodos
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensagem quando nenhum tipo selecionado */}
                {!selectedType && (
                  <p className="text-center text-muted-foreground py-8">
                    Selecione o tipo de período para começar a configuração
                  </p>
                )}
              </div>
            ) : (
              /* VIEW MODE */
              <div className="space-y-4">
                {quarters.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium">Período</th>
                            <th className="text-left py-2 px-3 font-medium">Início</th>
                            <th className="text-left py-2 px-3 font-medium">Fim</th>
                            <th className="text-left py-2 px-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quarters.map((quarter) => (
                            <tr key={quarter.id} className="border-b">
                              <td className="py-2 px-3 font-medium">{quarter.name}</td>
                              <td className="py-2 px-3">{formatDate(quarter.start_date)}</td>
                              <td className="py-2 px-3">{formatDate(quarter.end_date)}</td>
                              <td className="py-2 px-3">
                                {isCurrentPeriod(quarter.start_date, quarter.end_date) ? (
                                  <Badge variant="success">Atual</Badge>
                                ) : isPastDate(quarter.end_date) ? (
                                  <Badge variant="secondary">Encerrado</Badge>
                                ) : (
                                  <Badge variant="default">Futuro</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer with delete button (discrete) */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteAll}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Todos
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum período configurado. Clique em Editar para começar.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmação para trocar tipo */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingTypeChange(null);
        }}
        title="Alterar Tipo de Período"
        description="Esta ação irá excluir os períodos existentes"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Atenção</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Ao trocar o tipo de período, todos os {quarters.length} período(s) existente(s) serão excluídos permanentemente.
                </p>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false);
                setPendingTypeChange(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmTypeChange}
            >
              Confirmar e Excluir
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
