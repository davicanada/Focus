'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit,
  RefreshCcw,
  Upload,
  Download,
  Search,
  FileDown,
  HelpCircle,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import type { User, Institution, Class, Student } from '@/types';

export default function AlunosPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [students, setStudents] = useState<(Student & { class: Class })[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Import instructions state
  const [showImportHelp, setShowImportHelp] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    enrollment_number: '',
    class_id: '',
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

  // Reload students when showInactive changes
  useEffect(() => {
    if (currentInstitution) {
      loadStudents(currentInstitution.id, showInactive);
    }
  }, [currentInstitution, showInactive]);

  const loadClasses = async (institutionId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadStudents = async (institutionId: string, includeInactive = false) => {
    setLoadingStudents(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('students')
        .select(`
          *,
          class:classes(*)
        `)
        .eq('institution_id', institutionId)
        .order('full_name');

      // If not showing inactive, filter to only active students
      if (!includeInactive) {
        query = query.eq('is_active', true).is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        full_name: student.full_name,
        enrollment_number: student.enrollment_number || '',
        class_id: student.class_id,
      });
    } else {
      setEditingStudent(null);
      setFormData({
        full_name: '',
        enrollment_number: '',
        class_id: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim() || !formData.class_id) {
      toast.error('Nome e turma são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const studentData = {
        full_name: formData.full_name.trim(),
        enrollment_number: formData.enrollment_number || null,
        class_id: formData.class_id,
        institution_id: currentInstitution?.id,
        is_active: true,
      };

      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);

        if (error) throw error;
        toast.success('Aluno atualizado');
      } else {
        const { error } = await supabase
          .from('students')
          .insert(studentData);

        if (error) throw error;
        toast.success('Aluno cadastrado');
      }

      setShowModal(false);
      loadStudents(currentInstitution!.id, showInactive);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Erro ao salvar aluno');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (student: Student) => {
    const reason = prompt(`Deseja desligar "${student.full_name}"?\n\nMotivo (opcional):`, 'Transferência/Desligamento');
    if (reason === null) return; // User cancelled

    try {
      const response = await fetch(`/api/students/${student.id}/deactivate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Desligado pelo administrador' }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Aluno desligado. O histórico de ocorrências foi preservado.');
      loadStudents(currentInstitution!.id, showInactive);
    } catch (error) {
      console.error('Error deactivating student:', error);
      toast.error('Erro ao desligar aluno');
    }
  };

  const handleReactivate = async (student: Student) => {
    if (!confirm(`Deseja reativar "${student.full_name}"?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('students')
        .update({
          is_active: true,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      if (error) throw error;
      toast.success('Aluno reativado com sucesso');
      loadStudents(currentInstitution!.id, showInactive);
    } catch (error) {
      console.error('Error reactivating student:', error);
      toast.error('Erro ao reativar aluno');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if a class is selected first
    if (!filterClass) {
      toast.error('Selecione uma turma antes de importar');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    toast.loading('Importando alunos...');

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const worksheet = workbook.worksheets[0];
      const studentsData: {
        full_name: string;
        enrollment_number?: string;
      }[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const fullName = row.getCell(1).value?.toString().trim();
        const enrollmentNumber = row.getCell(2).value?.toString().trim();

        if (fullName) {
          studentsData.push({
            full_name: fullName,
            enrollment_number: enrollmentNumber || undefined,
          });
        }
      });

      if (studentsData.length === 0) {
        toast.dismiss();
        toast.error('Nenhum aluno encontrado no arquivo');
        return;
      }

      const supabase = createClient();
      const studentsToInsert = studentsData.map((s) => ({
        full_name: s.full_name,
        enrollment_number: s.enrollment_number || null,
        class_id: filterClass,
        institution_id: currentInstitution?.id,
        is_active: true,
      }));

      const { error } = await supabase.from('students').insert(studentsToInsert);

      if (error) throw error;

      toast.dismiss();
      toast.success(`${studentsData.length} alunos importados`);
      loadStudents(currentInstitution!.id, showInactive);
    } catch (error) {
      console.error('Error importing students:', error);
      toast.dismiss();
      toast.error('Erro ao importar alunos');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Alunos');

      // Headers
      worksheet.columns = [
        { header: 'Nome', key: 'full_name', width: 30 },
        { header: 'Matrícula', key: 'enrollment_number', width: 15 },
        { header: 'Turma', key: 'class_name', width: 25 },
      ];

      // Data
      filteredStudents.forEach((student) => {
        worksheet.addRow({
          full_name: student.full_name,
          enrollment_number: student.enrollment_number || '',
          class_name: student.class?.name || '',
        });
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alunos_${currentInstitution?.slug || 'export'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Exportação concluída');
    } catch (error) {
      console.error('Error exporting students:', error);
      toast.error('Erro ao exportar alunos');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();

      // Main data sheet
      const dataSheet = workbook.addWorksheet('Alunos');

      // Define columns with headers
      dataSheet.columns = [
        { header: 'Nome Completo', key: 'full_name', width: 35 },
        { header: 'Matrícula', key: 'enrollment_number', width: 15 },
      ];

      // Style the header row
      const headerRow = dataSheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add example row
      dataSheet.addRow({
        full_name: 'Maria Silva Santos',
        enrollment_number: '2024001',
      });

      // Instructions sheet
      const instructionsSheet = workbook.addWorksheet('Instruções');

      instructionsSheet.columns = [
        { header: 'Item', key: 'item', width: 25 },
        { header: 'Descrição', key: 'description', width: 70 },
      ];

      const instructionsHeaderRow = instructionsSheet.getRow(1);
      instructionsHeaderRow.font = { bold: true };
      instructionsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      const instructions = [
        { item: 'Nome Completo', description: 'Obrigatório. Nome completo do aluno.' },
        { item: 'Matrícula', description: 'Opcional. Número de matrícula do aluno.' },
        { item: '', description: '' },
        { item: 'IMPORTANTE', description: 'A primeira linha deve conter os cabeçalhos (não remova).' },
        { item: 'IMPORTANTE', description: 'Selecione uma turma antes de importar o arquivo.' },
        { item: 'IMPORTANTE', description: 'Os alunos serão adicionados à turma selecionada no filtro.' },
      ];

      instructions.forEach((instruction) => {
        const row = instructionsSheet.addRow(instruction);
        if (instruction.item === 'IMPORTANTE') {
          row.font = { bold: true, color: { argb: 'FFCC0000' } };
        }
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_importacao_alunos.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Template baixado com sucesso');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Erro ao baixar template');
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

  // Filtered students
  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass || student.class_id === filterClass;
    return matchesSearch && matchesClass;
  });

  // Count active students
  const activeStudentsCount = students.filter(s => s.is_active).length;
  const inactiveStudentsCount = students.filter(s => !s.is_active).length;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie os alunos da instituição
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
            <div className="relative">
              <div className="flex gap-1 items-center">
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setShowImportHelp(true)}
                  onMouseLeave={() => setShowImportHelp(false)}
                  onClick={() => setShowImportHelp(!showImportHelp)}
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
              {showImportHelp && (
                <div className="absolute right-0 top-full mt-2 z-50 w-80 p-4 bg-popover border rounded-lg shadow-lg text-sm">
                  <h4 className="font-semibold mb-2">Instruções de Importação</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">Colunas obrigatórias:</span>{' '}
                      Nome Completo
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Colunas opcionais:</span>{' '}
                      Matrícula
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Cabeçalho:</span>{' '}
                      A primeira linha deve conter os títulos das colunas
                    </li>
                    <li className="text-amber-600 dark:text-amber-500 font-medium">
                      Selecione uma turma no filtro antes de importar!
                    </li>
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Baixe o template para ver o formato correto do arquivo.
                  </p>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aluno
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou matrícula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-48"
              >
                <option value="">Todas as turmas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Button
                variant={showInactive ? 'default' : 'outline'}
                onClick={() => setShowInactive(!showInactive)}
                className="gap-2"
              >
                {showInactive ? (
                  <>
                    <Eye className="h-4 w-4" />
                    Mostrando inativos ({inactiveStudentsCount})
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Mostrar inativos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Alunos</CardTitle>
              <CardDescription>
                {filteredStudents.length} de {students.length} aluno(s)
                {showInactive && ` (${activeStudentsCount} ativos, ${inactiveStudentsCount} inativos)`}
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => loadStudents(currentInstitution!.id, showInactive)}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum aluno encontrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id} className={!student.is_active ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {student.full_name}
                          {!student.is_active && (
                            <span className="ml-2 text-xs text-muted-foreground">(desligado)</span>
                          )}
                        </TableCell>
                        <TableCell>{student.enrollment_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{student.class?.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.is_active ? 'success' : 'secondary'}>
                            {student.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(student)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {student.is_active ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(student)}
                                title="Desligar aluno"
                              >
                                <UserX className="h-4 w-4 text-amber-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReactivate(student)}
                                title="Reativar aluno"
                              >
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
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
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome do aluno"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enrollment_number">Matrícula</Label>
            <Input
              id="enrollment_number"
              value={formData.enrollment_number}
              onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
              placeholder="Número de matrícula"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_id">Turma *</Label>
            <Select
              id="class_id"
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
