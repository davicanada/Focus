'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCcw,
  ArchiveRestore,
  Archive,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, getAcademicYearOptions } from '@/lib/utils';
import {
  EDUCATION_LEVELS,
  SHIFTS,
  CLASS_SECTIONS,
  canHaveSection,
  buildClassLabel,
  type EducationStage,
} from '@/lib/constants/education';
import { type User, type Institution, type Class } from '@/types';

export default function TurmasPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [classes, setClasses] = useState<Class[]>([]);
  const [deletedClasses, setDeletedClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    education_level: 'fundamental' as EducationStage,
    grade: '',
    section: '',
    shift: 'matutino',
    year: new Date().getFullYear(),
  });

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
      await loadClasses(institution.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadClasses = async (institutionId: string) => {
    setLoadingClasses(true);
    try {
      const supabase = createClient();

      // Active classes
      const { data: activeData, error: activeError } = await supabase
        .from('classes')
        .select('*')
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .order('year', { ascending: false })
        .order('name');

      if (activeError) throw activeError;
      setClasses(activeData || []);

      // Deleted classes (trash)
      const { data: deletedData, error: deletedError } = await supabase
        .from('classes')
        .select('*')
        .eq('institution_id', institutionId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (deletedError) throw deletedError;
      setDeletedClasses(deletedData || []);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleOpenModal = (classItem?: Class) => {
    if (classItem) {
      setEditingClass(classItem);
      setFormData({
        education_level: classItem.education_level as EducationStage,
        grade: classItem.grade || '',
        section: classItem.section || '',
        shift: classItem.shift || 'matutino',
        year: classItem.year,
      });
    } else {
      setEditingClass(null);
      const defaultLevel = 'fundamental' as EducationStage;
      const defaultGrade = EDUCATION_LEVELS[defaultLevel].years[0]?.code || '';
      setFormData({
        education_level: defaultLevel,
        grade: defaultGrade,
        section: '',
        shift: 'matutino',
        year: new Date().getFullYear(),
      });
    }
    setShowModal(true);
  };

  const handleEducationLevelChange = (level: EducationStage) => {
    const years = EDUCATION_LEVELS[level].years;
    const defaultGrade = years.length > 0 ? years[0].code : '';
    setFormData({
      ...formData,
      education_level: level,
      grade: defaultGrade,
      section: canHaveSection(level) ? formData.section : '',
    });
  };

  const handleSave = async () => {
    if (!formData.grade) {
      toast.error('Série/Ano é obrigatório');
      return;
    }

    if (!formData.shift) {
      toast.error('Turno é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Auto-generate the class name (usando código em vez de label)
      const generatedName = buildClassLabel(
        formData.education_level,
        formData.grade, // Passa o código ("1", "2", "creche") para gerar nome simplificado
        canHaveSection(formData.education_level) ? formData.section : undefined,
        formData.shift
      );

      const classData = {
        name: generatedName,
        education_level: formData.education_level,
        grade: formData.grade || null,
        section: canHaveSection(formData.education_level) ? (formData.section || null) : null,
        shift: formData.shift || null,
        year: formData.year,
        institution_id: currentInstitution?.id,
        is_active: true,
      };

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);

        if (error) throw error;
        toast.success('Turma atualizada');
      } else {
        const { error } = await supabase
          .from('classes')
          .insert(classData);

        if (error) throw error;
        toast.success('Turma criada');
      }

      setShowModal(false);
      loadClasses(currentInstitution!.id);
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error('Erro ao salvar turma');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classItem: Class) => {
    if (!confirm(`Deseja mover "${classItem.name}" para a lixeira?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', classItem.id);

      if (error) throw error;
      toast.success('Turma movida para lixeira');
      loadClasses(currentInstitution!.id);
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Erro ao excluir turma');
    }
  };

  const handleRestore = async (classItem: Class) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('classes')
        .update({ deleted_at: null, is_active: true })
        .eq('id', classItem.id);

      if (error) throw error;
      toast.success('Turma restaurada');
      loadClasses(currentInstitution!.id);
    } catch (error) {
      console.error('Error restoring class:', error);
      toast.error('Erro ao restaurar turma');
    }
  };

  const handlePermanentDelete = async (classItem: Class) => {
    try {
      const supabase = createClient();

      // GOVERNANÇA: Verificar dependências antes de permitir exclusão permanente
      const [studentsRes, occurrencesRes] = await Promise.all([
        // Contar alunos na turma (incluindo inativos)
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', classItem.id),
        // Contar ocorrências históricas desta turma
        supabase
          .from('occurrences')
          .select('id', { count: 'exact', head: true })
          .eq('class_id_at_occurrence', classItem.id)
          .is('deleted_at', null),
      ]);

      const studentsCount = studentsRes.count || 0;
      const occurrencesCount = occurrencesRes.count || 0;

      // Bloquear exclusão se houver dados vinculados
      if (studentsCount > 0 || occurrencesCount > 0) {
        toast.error(
          `Não é possível excluir permanentemente:\n` +
          `• ${studentsCount} aluno(s) vinculado(s)\n` +
          `• ${occurrencesCount} ocorrência(s) no histórico\n\n` +
          `Mova os alunos para outra turma primeiro.`,
          { duration: 6000 }
        );
        return;
      }

      // Se não há dependências, pedir confirmação
      if (!confirm(`Excluir "${classItem.name}" permanentemente? Esta ação não pode ser desfeita.`)) return;

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classItem.id);

      if (error) throw error;
      toast.success('Turma excluída permanentemente');
      loadClasses(currentInstitution!.id);
    } catch (error) {
      console.error('Error permanently deleting class:', error);
      toast.error('Erro ao excluir turma');
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

  // Get shift label for display
  const getShiftLabel = (shiftValue?: string) => {
    if (!shiftValue) return '-';
    const shift = SHIFTS.find((s) => s.value === shiftValue);
    return shift?.label || shiftValue;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Turmas</h1>
            <p className="text-muted-foreground">
              Gerencie as turmas da instituição
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Turma
          </Button>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              Ativas ({classes.length})
            </TabsTrigger>
            <TabsTrigger value="trash">
              <Archive className="h-4 w-4 mr-1" />
              Lixeira ({deletedClasses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Turmas Ativas</CardTitle>
                  <CardDescription>
                    {classes.length} turma(s) cadastrada(s)
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={() => loadClasses(currentInstitution!.id)}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingClasses ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : classes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma turma cadastrada
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Série/Turma</TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead>Ano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map((classItem) => (
                          <TableRow key={classItem.id}>
                            <TableCell className="font-medium">{classItem.name}</TableCell>
                            <TableCell>{EDUCATION_LEVELS[classItem.education_level as EducationStage]?.label || classItem.education_level}</TableCell>
                            <TableCell>
                              {classItem.grade || '-'} {classItem.section && `/ ${classItem.section}`}
                            </TableCell>
                            <TableCell>{getShiftLabel(classItem.shift)}</TableCell>
                            <TableCell>{classItem.year}</TableCell>
                            <TableCell>
                              <Badge variant={classItem.is_active ? 'success' : 'secondary'}>
                                {classItem.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenModal(classItem)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(classItem)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trash">
            <Card>
              <CardHeader>
                <CardTitle>Lixeira</CardTitle>
                <CardDescription>
                  Turmas excluídas podem ser restauradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deletedClasses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Lixeira vazia
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Ano</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedClasses.map((classItem) => (
                          <TableRow key={classItem.id}>
                            <TableCell className="font-medium">{classItem.name}</TableCell>
                            <TableCell>{EDUCATION_LEVELS[classItem.education_level as EducationStage]?.label || classItem.education_level}</TableCell>
                            <TableCell>{classItem.year}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestore(classItem)}
                                >
                                  <ArchiveRestore className="h-4 w-4 mr-1" />
                                  Restaurar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePermanentDelete(classItem)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                                  Excluir
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingClass ? 'Editar Turma' : 'Nova Turma'}
      >
        <div className="space-y-4">
          {/* Nivel de Ensino */}
          <div className="space-y-2">
            <Label htmlFor="education_level">Nível de Ensino *</Label>
            <Select
              id="education_level"
              value={formData.education_level}
              onChange={(e) => handleEducationLevelChange(e.target.value as EducationStage)}
            >
              {Object.entries(EDUCATION_LEVELS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </Select>
          </div>

          {/* Serie/Ano */}
          <div className="space-y-2">
            <Label htmlFor="grade">Série/Ano *</Label>
            <Select
              id="grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            >
              <option value="">Selecione...</option>
              {EDUCATION_LEVELS[formData.education_level].years.map((year) => (
                <option key={year.code} value={year.code}>{year.label}</option>
              ))}
            </Select>
          </div>

          {/* Turma (Section) - only show if canHaveSection */}
          {canHaveSection(formData.education_level) && (
            <div className="space-y-2">
              <Label htmlFor="section">Turma</Label>
              <Select
                id="section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              >
                <option value="">Sem divisão</option>
                {CLASS_SECTIONS.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Turno (Shift) */}
          <div className="space-y-2">
            <Label htmlFor="shift">Turno *</Label>
            <Select
              id="shift"
              value={formData.shift}
              onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
            >
              {SHIFTS.map((shift) => (
                <option key={shift.value} value={shift.value}>{shift.label}</option>
              ))}
            </Select>
          </div>

          {/* Ano Letivo */}
          <div className="space-y-2">
            <Label htmlFor="year">Ano Letivo *</Label>
            <Select
              id="year"
              value={formData.year.toString()}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            >
              {getAcademicYearOptions().map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
