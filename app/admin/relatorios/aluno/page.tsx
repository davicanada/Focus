'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { User, FileSpreadsheet, FileText, Download, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ProgressLink } from '@/components/ProgressLink';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDate, formatClassFullName, sortClassesByLevel } from '@/lib/utils';
import { FEEDBACK_ACTION_TYPES, LEGACY_ACTION_TYPES } from '@/lib/constants/feedback';
import type { User as UserType, Institution, Class, Student, FeedbackActionType } from '@/types';

interface OccurrenceFeedbackData {
  action_type: string;
  description: string | null;
  performed_at: string;
}

interface OccurrenceData {
  id: string;
  occurrence_date: string;
  description: string | null;
  occurrence_type: {
    category: string;
    severity: string;
    subcategory?: { name: string } | null;
  } | null;
  registered_by_user: {
    full_name: string;
  } | null;
  feedbacks?: OccurrenceFeedbackData[] | null;
}

interface StudentInfo {
  full_name: string;
  enrollment_number: string | null;
  class: {
    name: string;
    education_level?: string;
    shift?: string;
  } | null;
}

export default function RelatorioAlunoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [format, setFormat] = useState<'excel' | 'pdf'>('pdf');

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<UserType | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (role !== 'admin' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      await loadData(institution.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadData = async (institutionId: string) => {
    try {
      const supabase = createClient();

      const [classesRes, studentsRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('institution_id', institutionId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('students')
          .select('*')
          .eq('institution_id', institutionId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('full_name'),
      ]);

      setClasses(sortClassesByLevel(classesRes.data || []));
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedStudentId('');

    if (classId) {
      const filtered = students.filter((s) => s.class_id === classId);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStudentId) {
      toast.error('Selecione um aluno');
      return;
    }

    setGenerating(true);
    toast.loading('Gerando relatório...');

    try {
      const supabase = createClient();

      // Get student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('full_name, enrollment_number, class:classes(name, education_level, shift)')
        .eq('id', selectedStudentId)
        .single();

      if (studentError) throw studentError;

      // Get occurrences with feedbacks
      const { data: occurrences, error: occError } = await supabase
        .from('occurrences')
        .select(`
          id,
          occurrence_date,
          description,
          occurrence_type:occurrence_types(category, severity, subcategory:occurrence_subcategories(name)),
          registered_by_user:users!occurrences_registered_by_fkey(full_name),
          feedbacks:occurrence_feedbacks(action_type, description, performed_at)
        `)
        .eq('student_id', selectedStudentId)
        .is('deleted_at', null)
        .order('occurrence_date', { ascending: false });

      if (occError) throw occError;

      if (format === 'excel') {
        await generateExcel(studentData as StudentInfo, occurrences as OccurrenceData[]);
      } else {
        await generatePDF(studentData as StudentInfo, occurrences as OccurrenceData[]);
      }

      toast.dismiss();
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss();
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  const generateExcel = async (student: StudentInfo, occurrences: OccurrenceData[]) => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ficha do Aluno');

    // Title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Ficha Individual do Aluno';
    titleCell.font = { bold: true, size: 18 };
    titleCell.alignment = { horizontal: 'center' };

    // Institution
    worksheet.mergeCells('A2:G2');
    const instCell = worksheet.getCell('A2');
    instCell.value = currentInstitution?.name || '';
    instCell.alignment = { horizontal: 'center' };

    // Student info
    worksheet.getCell('A4').value = 'Nome:';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('B4').value = student.full_name;

    worksheet.getCell('A5').value = 'Turma:';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('B5').value = formatClassFullName(student.class?.name || '', student.class?.education_level, student.class?.shift);

    worksheet.getCell('A6').value = 'Matrícula:';
    worksheet.getCell('A6').font = { bold: true };
    worksheet.getCell('B6').value = student.enrollment_number || '';

    worksheet.getCell('A7').value = 'Total de Ocorrências:';
    worksheet.getCell('A7').font = { bold: true };
    worksheet.getCell('B7').value = occurrences.length;

    // Occurrences header
    const headerRow = worksheet.getRow(9);
    headerRow.values = ['Data', 'Tipo', 'Severidade', 'Subcategoria', 'Descrição', 'Devolutiva', 'Registrado por'];
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A5F' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };

    // Occurrences data
    occurrences.forEach((occ, index) => {
      const row = worksheet.getRow(10 + index);
      row.values = [
        formatDate(occ.occurrence_date),
        occ.occurrence_type?.category || '',
        occ.occurrence_type?.severity || '',
        occ.occurrence_type?.subcategory?.name || '-',
        occ.description || '',
        formatFeedbackText(occ.feedbacks),
        occ.registered_by_user?.full_name || '',
      ];
      row.getCell(6).alignment = { wrapText: true };
    });

    // No occurrences message
    if (occurrences.length === 0) {
      worksheet.getCell('A10').value = 'Nenhuma ocorrência registrada';
      worksheet.mergeCells('A10:G10');
    }

    // Column widths
    worksheet.columns = [
      { width: 12 },
      { width: 20 },
      { width: 12 },
      { width: 18 },
      { width: 40 },
      { width: 40 },
      { width: 25 },
    ];

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha_${student.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFeedbackText = (feedbacks?: OccurrenceFeedbackData[] | null): string => {
    if (!feedbacks || feedbacks.length === 0) return 'Pendente';
    const sorted = [...feedbacks].sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
    return sorted.map(fb => {
      const label = FEEDBACK_ACTION_TYPES[fb.action_type as FeedbackActionType]?.label || LEGACY_ACTION_TYPES[fb.action_type]?.label || fb.action_type;
      return fb.description ? `${label}: ${fb.description}` : label;
    }).join('\n');
  };

  const generatePDF = async (student: StudentInfo, occurrences: OccurrenceData[]) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    const pageCenter = pageWidth / 2;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 95);
    doc.text('Ficha Individual do Aluno', pageCenter, 18, { align: 'center' });

    // Institution
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(currentInstitution?.name || '', pageCenter, 26, { align: 'center' });

    // Dynamic header layout
    doc.setFontSize(11);
    doc.setTextColor(0);
    const className = formatClassFullName(student.class?.name || '-', student.class?.education_level, student.class?.shift);
    const classTextWidth = doc.getTextWidth(className);
    const classLabelEnd = 45; // X after "Turma: "
    const rightColumnStart = 160;
    const classFitsInline = (classLabelEnd + classTextWidth) < (rightColumnStart - 5);

    let boxHeight: number;
    let y1: number, y2: number, y3: number;

    if (classFitsInline) {
      // 2-line layout: Name+Matricula | Turma+Total
      boxHeight = 30;
      y1 = 42; y2 = 50; y3 = 0; // y3 not used
    } else {
      // 3-line layout: Name+Matricula | Turma (full width) | Total+Severity+Date
      boxHeight = 38;
      y1 = 42; y2 = 50; y3 = 58;
    }

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 33, pageWidth - 28, boxHeight, 3, 3, 'F');

    // Line 1: Nome + Matrícula
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', 20, y1);
    doc.setFont('helvetica', 'normal');
    doc.text(student.full_name, 45, y1);

    doc.setFont('helvetica', 'bold');
    doc.text('Matrícula:', rightColumnStart, y1);
    doc.setFont('helvetica', 'normal');
    doc.text(student.enrollment_number || '-', rightColumnStart + 30, y1);

    // Line 2: Turma (+ Total if inline)
    doc.setFont('helvetica', 'bold');
    doc.text('Turma:', 20, y2);
    doc.setFont('helvetica', 'normal');
    doc.text(className, 45, y2);

    if (classFitsInline) {
      // Total on same line as Turma
      doc.setFont('helvetica', 'bold');
      doc.text('Total de Ocorrências:', rightColumnStart, y2);
      doc.setFont('helvetica', 'normal');
      doc.text(String(occurrences.length), rightColumnStart + 55, y2);
    } else {
      // Line 3: Total + Severity counts + Date
      doc.setFont('helvetica', 'bold');
      doc.text('Total de Ocorrências:', 20, y3);
      doc.setFont('helvetica', 'normal');
      doc.text(String(occurrences.length), 75, y3);

      doc.setFont('helvetica', 'bold');
      doc.text('Data do Relatório:', rightColumnStart, y3);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(new Date()), rightColumnStart + 48, y3);
    }

    // Occurrences section
    const sectionY = 33 + boxHeight + 10;
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text('Histórico de Ocorrências', 14, sectionY);

    if (occurrences.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text('Nenhuma ocorrência registrada para este aluno.', 14, sectionY + 10);
    } else {
      // Severity summary
      const severityCounts = {
        leve: occurrences.filter((o) => o.occurrence_type?.severity === 'leve').length,
        media: occurrences.filter((o) => o.occurrence_type?.severity === 'media').length,
        grave: occurrences.filter((o) => o.occurrence_type?.severity === 'grave').length,
      };

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Leves: ${severityCounts.leve} | Médias: ${severityCounts.media} | Graves: ${severityCounts.grave}`, 14, sectionY + 7);

      // Occurrences table (6 columns)
      autoTable(doc, {
        startY: sectionY + 12,
        head: [['Data', 'Tipo', 'Severidade', 'Subcategoria', 'Descrição', 'Devolutiva']],
        body: occurrences.map((occ) => [
          formatDate(occ.occurrence_date),
          occ.occurrence_type?.category || '',
          occ.occurrence_type?.severity || '',
          occ.occurrence_type?.subcategory?.name || '-',
          occ.description || '-',
          formatFeedbackText(occ.feedbacks),
        ]),
        headStyles: {
          fillColor: [30, 58, 95],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const severity = data.cell.raw as string;
            if (severity === 'grave') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (severity === 'media') {
              data.cell.styles.textColor = [217, 119, 6];
            }
          }
        },
      });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - Focus Sistema de Gestão Escolar - Gerado em ${formatDate(new Date())}`,
        pageCenter,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`ficha_${student.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
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

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <DashboardLayout
      userName={currentUser?.full_name || ''}
      userEmail={currentUser?.email || ''}
      currentRole="admin"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ProgressLink href="/admin/relatorios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </ProgressLink>
          <div>
            <h1 className="text-3xl font-bold">Relatório por Aluno</h1>
            <p className="text-muted-foreground">
              Histórico completo de ocorrências de um aluno
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Selecionar Aluno
            </CardTitle>
            <CardDescription>
              Primeiro selecione a turma, depois o aluno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class">1. Selecione a Turma</Label>
              <Select
                id="class"
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">Selecione uma turma...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{formatClassFullName(c.name, c.education_level, c.shift)}</option>
                ))}
              </Select>
            </div>

            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student">2. Selecione o Aluno</Label>
              <Select
                id="student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={!selectedClassId}
              >
                <option value="">
                  {selectedClassId
                    ? filteredStudents.length > 0
                      ? 'Selecione um aluno...'
                      : 'Nenhum aluno nesta turma'
                    : 'Selecione uma turma primeiro'}
                </option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </Select>
            </div>

            {/* Selected student preview */}
            {selectedStudent && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Aluno selecionado:</h4>
                <p className="text-lg font-semibold">{selectedStudent.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Matrícula: {selectedStudent.enrollment_number || 'Não informada'}
                </p>
              </div>
            )}

            {/* Format */}
            <div className="space-y-2">
              <Label>3. Selecione o Formato</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={() => setFormat('pdf')}
                    className="h-4 w-4"
                  />
                  <FileText className="h-5 w-5 text-red-600" />
                  <span>PDF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={format === 'excel'}
                    onChange={() => setFormat('excel')}
                    className="h-4 w-4"
                  />
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span>Excel</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedStudentId}
                size="lg"
              >
                {generating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
