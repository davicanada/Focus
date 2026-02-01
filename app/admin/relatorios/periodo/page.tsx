'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Calendar, FileSpreadsheet, FileText, Download, ArrowLeft, AlertCircle, Settings } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ProgressLink } from '@/components/ProgressLink';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDate, formatClassFullName, getEducationLevelOrder } from '@/lib/utils';
import type { User, Institution, Quarter } from '@/types';

interface OccurrenceData {
  id: string;
  occurrence_date: string;
  description: string | null;
  student: {
    id: string;
    full_name: string;
    class: {
      id: string;
      name: string;
      education_level?: string;
      shift?: string;
    } | null;
  } | null;
  occurrence_type: {
    category: string;
    severity: string;
  } | null;
  registered_by_user: {
    full_name: string;
  } | null;
}

interface GroupedData {
  className: string;
  students: {
    studentName: string;
    occurrences: {
      date: string;
      type: string;
      severity: string;
      description: string;
      registeredBy: string;
    }[];
  }[];
}

export default function RelatorioPeriodoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Quarters state
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [loadingQuarters, setLoadingQuarters] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null);

  const [format, setFormat] = useState<'excel' | 'pdf'>('pdf');

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

      if (!error && data) {
        setQuarters(data);
      }
    } catch (error) {
      console.error('Error loading quarters:', error);
    } finally {
      setLoadingQuarters(false);
    }
  };

  const isCurrentPeriod = (quarter: Quarter) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr >= quarter.start_date && todayStr <= quarter.end_date;
  };

  const formatPeriodDates = (quarter: Quarter) => {
    const start = new Date(quarter.start_date + 'T12:00:00');
    const end = new Date(quarter.end_date + 'T12:00:00');
    const formatShort = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${formatShort(start)} - ${formatShort(end)}`;
  };

  const groupOccurrencesByClassAndStudent = (occurrences: OccurrenceData[]): GroupedData[] => {
    const grouped: Record<string, { educationLevel: string; students: Record<string, OccurrenceData[]> }> = {};

    occurrences.forEach((occ) => {
      const cls = occ.student?.class;
      const className = formatClassFullName(cls?.name || 'Sem Turma', cls?.education_level, cls?.shift);
      const studentName = occ.student?.full_name || 'Aluno Desconhecido';
      const educationLevel = cls?.education_level || 'medio';

      if (!grouped[className]) {
        grouped[className] = { educationLevel, students: {} };
      }
      if (!grouped[className].students[studentName]) {
        grouped[className].students[studentName] = [];
      }
      grouped[className].students[studentName].push(occ);
    });

    // Convert to array and sort by education level
    const result: GroupedData[] = Object.keys(grouped)
      .sort((a, b) => {
        const levelDiff = getEducationLevelOrder(grouped[a].educationLevel) - getEducationLevelOrder(grouped[b].educationLevel);
        if (levelDiff !== 0) return levelDiff;
        return a.localeCompare(b, 'pt-BR');
      })
      .map((className) => ({
        className,
        students: Object.keys(grouped[className].students)
          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
          .map((studentName) => ({
            studentName,
            occurrences: grouped[className].students[studentName]
              .sort((a, b) => new Date(a.occurrence_date).getTime() - new Date(b.occurrence_date).getTime())
              .map((occ) => ({
                date: formatDate(occ.occurrence_date),
                type: occ.occurrence_type?.category || '',
                severity: occ.occurrence_type?.severity || '',
                description: occ.description || '',
                registeredBy: occ.registered_by_user?.full_name || '',
              })),
          })),
      }));

    return result;
  };

  const handleGenerate = async () => {
    if (!selectedQuarter) {
      toast.error('Selecione um período');
      return;
    }

    setGenerating(true);
    toast.loading('Gerando relatório...');

    try {
      const supabase = createClient();

      const { data: occurrences, error } = await supabase
        .from('occurrences')
        .select(`
          id,
          occurrence_date,
          description,
          student:students(id, full_name, class:classes(id, name, education_level, shift)),
          occurrence_type:occurrence_types(category, severity),
          registered_by_user:users!occurrences_registered_by_fkey(full_name)
        `)
        .eq('institution_id', currentInstitution?.id)
        .gte('occurrence_date', selectedQuarter.start_date)
        .lte('occurrence_date', selectedQuarter.end_date + 'T23:59:59')
        .order('occurrence_date', { ascending: true });

      if (error) throw error;

      const groupedData = groupOccurrencesByClassAndStudent(occurrences as OccurrenceData[]);

      if (groupedData.length === 0) {
        toast.dismiss();
        toast.error('Nenhuma ocorrência encontrada no período');
        setGenerating(false);
        return;
      }

      if (format === 'excel') {
        await generateExcel(groupedData);
      } else {
        await generatePDF(groupedData);
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

  const generateExcel = async (data: GroupedData[]) => {
    if (!selectedQuarter) return;

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório por Período');

    // Title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Relatório de Ocorrências - ${currentInstitution?.name}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Period
    worksheet.mergeCells('A2:F2');
    const periodCell = worksheet.getCell('A2');
    periodCell.value = `${selectedQuarter.name} (${formatDate(selectedQuarter.start_date)} a ${formatDate(selectedQuarter.end_date)})`;
    periodCell.alignment = { horizontal: 'center' };

    let currentRow = 4;

    data.forEach((classData) => {
      // Class header
      worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
      const classCell = worksheet.getCell(`A${currentRow}`);
      classCell.value = `Turma: ${classData.className}`;
      classCell.font = { bold: true, size: 14 };
      classCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E3A5F' },
      };
      classCell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 14 };
      currentRow++;

      classData.students.forEach((student) => {
        // Student header
        worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const studentCell = worksheet.getCell(`A${currentRow}`);
        studentCell.value = `  ${student.studentName} (${student.occurrences.length} ocorrência${student.occurrences.length > 1 ? 's' : ''})`;
        studentCell.font = { bold: true };
        studentCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E5E7EB' },
        };
        currentRow++;

        // Occurrences header
        const headerRow = worksheet.getRow(currentRow);
        headerRow.values = ['', 'Data', 'Tipo', 'Severidade', 'Descrição', 'Registrado por'];
        headerRow.font = { bold: true };
        currentRow++;

        // Occurrences data
        student.occurrences.forEach((occ) => {
          const dataRow = worksheet.getRow(currentRow);
          dataRow.values = ['', occ.date, occ.type, occ.severity, occ.description, occ.registeredBy];
          currentRow++;
        });

        currentRow++; // Space between students
      });

      currentRow++; // Space between classes
    });

    // Adjust column widths
    worksheet.columns = [
      { width: 5 },
      { width: 12 },
      { width: 20 },
      { width: 12 },
      { width: 50 },
      { width: 25 },
    ];

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${selectedQuarter.name.toLowerCase().replace(/\s+/g, '_').replace(/º/g, '')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = async (data: GroupedData[]) => {
    if (!selectedQuarter) return;

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text('Relatório de Ocorrências', 14, yPosition);
    yPosition += 8;

    // Institution and period
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(currentInstitution?.name || '', 14, yPosition);
    yPosition += 6;
    doc.text(`${selectedQuarter.name} (${formatDate(selectedQuarter.start_date)} a ${formatDate(selectedQuarter.end_date)})`, 14, yPosition);
    yPosition += 10;

    data.forEach((classData) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Class header
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text(`Turma: ${classData.className}`, 14, yPosition);
      yPosition += 8;

      classData.students.forEach((student) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Student header
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`${student.studentName} (${student.occurrences.length} ocorrência${student.occurrences.length > 1 ? 's' : ''})`, 20, yPosition);
        yPosition += 2;

        // Occurrences table
        autoTable(doc, {
          startY: yPosition,
          head: [['Data', 'Tipo', 'Severidade', 'Descrição']],
          body: student.occurrences.map((occ) => [
            occ.date,
            occ.type,
            occ.severity,
            occ.description || '-',
          ]),
          headStyles: {
            fillColor: [100, 116, 139],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 30 },
            2: { cellWidth: 22 },
            3: { cellWidth: 'auto' },
          },
          margin: { left: 20 },
          tableWidth: 170,
        });

        yPosition = (doc as any).lastAutoTable.finalY + 8;
      });

      yPosition += 5;
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} - Focus Sistema de Gestão Escolar - Gerado em ${formatDate(new Date())}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio_${selectedQuarter.name.toLowerCase().replace(/\s+/g, '_').replace(/º/g, '')}.pdf`);
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
            <h1 className="text-3xl font-bold">Relatório por Período</h1>
            <p className="text-muted-foreground">
              Ideal para reuniões de professores
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Selecione o Período
            </CardTitle>
            <CardDescription>
              Escolha o período acadêmico para gerar o relatório
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Period Selection */}
            {loadingQuarters ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : quarters.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Nenhum período acadêmico configurado
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Configure os períodos da instituição para poder gerar relatórios.
                    </p>
                    <ProgressLink href="/admin/trimestres">
                      <Button variant="outline" size="sm" className="mt-3">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar Períodos
                      </Button>
                    </ProgressLink>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2">
                {quarters.map((quarter) => {
                  const isCurrent = isCurrentPeriod(quarter);
                  const isSelected = selectedQuarter?.id === quarter.id;

                  return (
                    <button
                      key={quarter.id}
                      onClick={() => setSelectedQuarter(quarter)}
                      className={`
                        relative p-4 rounded-lg border-2 text-left transition-all
                        ${isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                          : 'border-gray-200 hover:border-primary/50 hover:shadow-sm'
                        }
                      `}
                    >
                      {isCurrent && (
                        <Badge variant="success" className="absolute top-2 right-2 text-xs">
                          Atual
                        </Badge>
                      )}
                      <div className="font-semibold text-lg">{quarter.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatPeriodDates(quarter)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Format Selection */}
            {quarters.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Formato</Label>
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

                {/* Info box */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">O que será incluído no relatório:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Todas as turmas em ordem alfabética</li>
                    <li>• Alunos de cada turma em ordem alfabética</li>
                    <li>• Ocorrências de cada aluno com data, tipo, severidade e descrição</li>
                    <li>• Nome do professor que registrou cada ocorrência</li>
                  </ul>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !selectedQuarter}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
