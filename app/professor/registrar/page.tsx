'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, isNotFutureDate, formatDateForInput, createBrazilDateTimeISO } from '@/lib/utils';
import type { User, Institution, Class, Student, OccurrenceType } from '@/types';

export default function RegistrarOcorrenciaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Options
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);

  // Form state
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState(formatDateForInput(new Date()));
  const [occurrenceTime, setOccurrenceTime] = useState(new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (role !== 'professor' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      await loadOptions(institution.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadOptions = async (institutionId: string) => {
    try {
      const supabase = createClient();
      const selectedShift = sessionStorage.getItem('selectedShift');

      let classesQuery = supabase.from('classes').select('*').eq('institution_id', institutionId).eq('is_active', true).is('deleted_at', null);

      // Filtrar por turno se selecionado (exceto 'all' que mostra todas)
      if (selectedShift && selectedShift !== 'all') {
        classesQuery = classesQuery.eq('shift', selectedShift);
      }

      const [classesRes, typesRes] = await Promise.all([
        classesQuery.order('name'),
        supabase.from('occurrence_types').select('*').eq('institution_id', institutionId).eq('is_active', true).order('category'),
      ]);

      setClasses(classesRes.data || []);
      setOccurrenceTypes(typesRes.data || []);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadStudents = async (classId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedStudents([]);
    // Clear type if incompatible with new class
    if (selectedType) {
      const newClass = classes.find(c => c.id === classId);
      const currentType = occurrenceTypes.find(t => t.id === selectedType);
      if (newClass && currentType?.education_levels && currentType.education_levels.length > 0) {
        if (!currentType.education_levels.includes(newClass.education_level)) {
          setSelectedType('');
        }
      }
    }
    if (classId) {
      loadStudents(classId);
    } else {
      setStudents([]);
    }
  };

  const handleSelectStudent = (student: Student) => {
    if (!selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const handleSelectAll = () => {
    setSelectedStudents(students);
  };

  const handleClearAll = () => {
    setSelectedStudents([]);
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedStudents.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }
    if (!selectedType) {
      toast.error('Selecione o tipo de ocorrência');
      return;
    }
    if (!occurrenceDate) {
      toast.error('Informe a data da ocorrência');
      return;
    }
    if (!isNotFutureDate(occurrenceDate)) {
      toast.error('A data não pode ser no futuro');
      return;
    }

    setSaving(true);
    toast.loading('Registrando ocorrência(s)...');

    try {
      // Create one occurrence for each selected student
      // Usar createLocalDateTimeISO para evitar problema de timezone
      const occurrences = selectedStudents.map(student => ({
        institution_id: currentInstitution?.id,
        student_id: student.id,
        occurrence_type_id: selectedType,
        registered_by: currentUser?.id,
        occurrence_date: createBrazilDateTimeISO(occurrenceDate, occurrenceTime),
        description: description || null,
      }));

      // Usar API para registrar ocorrencias (integra avaliacao de alertas)
      const response = await fetch('/api/occurrences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(occurrences),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao registrar ocorrencia');
      }

      toast.dismiss();
      toast.success(`${selectedStudents.length} ocorrência(s) registrada(s)!`);

      // Reset form
      setSelectedStudents([]);
      setSelectedType('');
      setDescription('');
      setOccurrenceDate(formatDateForInput(new Date()));
      setOccurrenceTime(new Date().toTimeString().slice(0, 5));
    } catch (error) {
      console.error('Error registering occurrence:', error);
      toast.dismiss();
      toast.error('Erro ao registrar ocorrência');
    } finally {
      setSaving(false);
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
      currentRole="professor"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
      selectedShift={typeof window !== 'undefined' ? sessionStorage.getItem('selectedShift') : null}
      onChangeShift={() => {
        sessionStorage.removeItem('selectedShift');
        window.location.href = '/professor';
      }}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Registrar Ocorrência</h1>
          <p className="text-muted-foreground">
            Registre uma nova ocorrência para um ou mais alunos
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Selecione os Alunos</CardTitle>
              <CardDescription>
                Escolha a turma e os alunos envolvidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class">Turma</Label>
                <Select
                  id="class"
                  value={selectedClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <option value="">Selecione uma turma...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              {selectedClass && students.length > 0 && (
                <div className="space-y-3">
                  {/* Header com contador e botões */}
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
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => isSelected
                              ? handleRemoveStudent(student.id)
                              : handleSelectStudent(student)
                            }
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
            </CardContent>
          </Card>

          {/* Occurrence Details */}
          <Card>
            <CardHeader>
              <CardTitle>2. Detalhes da Ocorrência</CardTitle>
              <CardDescription>
                Informe o tipo, data e descrição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Ocorrência *</Label>
                <Select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {occurrenceTypes
                    .filter(type => {
                      if (!type.education_levels || type.education_levels.length === 0) return true;
                      if (!selectedClass) return true;
                      const cls = classes.find(c => c.id === selectedClass);
                      return cls ? type.education_levels.includes(cls.education_level) : true;
                    })
                    .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.category} ({type.severity})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={occurrenceDate}
                    onChange={(e) => setOccurrenceDate(e.target.value)}
                    max={formatDateForInput(new Date())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={occurrenceTime}
                    onChange={(e) => setOccurrenceTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os detalhes da ocorrência..."
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={saving || selectedStudents.length === 0 || !selectedType}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Registrar Ocorrência ({selectedStudents.length} aluno{selectedStudents.length !== 1 ? 's' : ''})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
