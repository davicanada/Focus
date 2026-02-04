'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  FileText,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ProgressLink } from '@/components/ProgressLink';
import { OccurrenceStatusBadge } from '@/components/occurrences';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDate, formatDateTime } from '@/lib/utils';
import type { User, Institution, OccurrenceStatus } from '@/types';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Mapeamento de action_type codes para labels legíveis em português
const ACTION_TYPE_LABELS: Record<string, string> = {
  verbal_warning: 'Advertência Verbal',
  guardian_contact: 'Contato com Responsável',
  coordination_referral: 'Encaminhamento à Coordenação',
  psychologist_referral: 'Encaminhamento ao Psicólogo',
  suspension: 'Suspensão',
  observation: 'Observação',
  resolved: 'Resolvido',
  other: 'Outro',
};

// Função helper para obter o label do action_type
const getActionTypeLabel = (actionType: string): string => {
  return ACTION_TYPE_LABELS[actionType] || actionType;
};

interface FeedbackDetail {
  action_type: string;
  description: string | null;
  performed_at: string;
  performed_by_name: string | null;
}

interface OccurrenceReportData {
  id: string;
  occurrence_date: string;
  student_name: string;
  class_name: string;
  occurrence_type: string;
  severity: string;
  status: OccurrenceStatus;
  registered_by_name: string;
  feedback_count: number;
  last_feedback_at: string | null;
  feedbacks: FeedbackDetail[];
}

interface ReportSummary {
  total_occurrences: number;
  with_feedback: number;
  without_feedback: number;
  response_rate: number;
  by_status: {
    pending: number;
    in_progress: number;
    resolved: number;
  };
}

interface ReportData {
  summary: ReportSummary;
  occurrences: OccurrenceReportData[];
  year: number;
}

// Flat structure for "Por Atualização" view
interface FeedbackRow {
  occurrence_id: string;
  occurrence_date: string;
  student_name: string;
  class_name: string;
  occurrence_type: string;
  severity: string;
  status: OccurrenceStatus;
  registered_by_name: string;  // Professor que registrou a ocorrência
  feedback_date: string;
  action_type: string;
  description: string | null;
  performed_by_name: string | null;  // Usuário que registrou a devolutiva
}

export default function RelatorioDevolutivaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportType, setReportType] = useState<'by_update' | 'by_occurrence'>('by_update');
  const [format, setFormat] = useState<'excel' | 'pdf'>('pdf');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Generate year options (current year + 2 previous)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

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
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentInstitution) {
      loadReportData();
    }
  }, [selectedYear, currentInstitution]);

  // Reset pagination when year or report type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, reportType]);

  const loadReportData = async () => {
    setLoadingReport(true);
    try {
      const response = await fetch(`/api/reports/devolutiva?year=${selectedYear}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do relatório');
      }
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoadingReport(false);
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

  // Transform data for "Por Atualização" view - flattened feedbacks sorted by date
  const getFeedbackRows = (): FeedbackRow[] => {
    if (!reportData) return [];

    const rows: FeedbackRow[] = [];
    reportData.occurrences.forEach((occ) => {
      if (occ.feedbacks && occ.feedbacks.length > 0) {
        occ.feedbacks.forEach((fb) => {
          rows.push({
            occurrence_id: occ.id,
            occurrence_date: occ.occurrence_date,
            student_name: occ.student_name,
            class_name: occ.class_name,
            occurrence_type: occ.occurrence_type,
            severity: occ.severity,
            status: occ.status,
            registered_by_name: occ.registered_by_name,
            feedback_date: fb.performed_at,
            action_type: fb.action_type,
            description: fb.description,
            performed_by_name: fb.performed_by_name,
          });
        });
      }
    });

    // Sort by feedback date, most recent first
    rows.sort((a, b) => new Date(b.feedback_date).getTime() - new Date(a.feedback_date).getTime());

    return rows;
  };

  // Get occurrences with feedbacks for "Por Ocorrência" view
  const getOccurrencesWithFeedbacks = () => {
    if (!reportData) return [];
    return reportData.occurrences.filter(occ => occ.feedbacks && occ.feedbacks.length > 0);
  };

  // Paginated data
  const feedbackRows = getFeedbackRows();
  const occurrencesWithFeedbacks = getOccurrencesWithFeedbacks();

  const totalItems = reportType === 'by_update' ? feedbackRows.length : occurrencesWithFeedbacks.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedFeedbackRows = feedbackRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedOccurrences = occurrencesWithFeedbacks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const generateExcelByUpdate = async () => {
    if (!reportData) throw new Error('Dados não disponíveis');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Devolutivas por Atualização');

    // Title
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Relatório de Devolutivas por Atualização - ${selectedYear}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Institution
    sheet.mergeCells('A2:H2');
    const instCell = sheet.getCell('A2');
    instCell.value = currentInstitution?.name || '';
    instCell.font = { size: 12 };
    instCell.alignment = { horizontal: 'center' };

    // Headers
    const headerRow = 4;
    const headers = ['Data Devolutiva', 'Aluno', 'Turma', 'Professor', 'Tipo Ocorrência', 'Tipo de Ação', 'Comentários', 'Usuário Devolutiva'];
    headers.forEach((header, i) => {
      const cell = sheet.getCell(headerRow, i + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    });

    // Data rows
    feedbackRows.forEach((row, index) => {
      const rowNum = headerRow + 1 + index;
      sheet.getCell(rowNum, 1).value = row.feedback_date ? formatDateTime(row.feedback_date) : '-';
      sheet.getCell(rowNum, 2).value = row.student_name || '-';
      sheet.getCell(rowNum, 3).value = row.class_name || '-';
      sheet.getCell(rowNum, 4).value = row.registered_by_name || '-';
      sheet.getCell(rowNum, 5).value = row.occurrence_type || '-';
      sheet.getCell(rowNum, 6).value = row.action_type ? getActionTypeLabel(row.action_type) : '-';
      sheet.getCell(rowNum, 7).value = row.description || '-';
      sheet.getCell(rowNum, 8).value = row.performed_by_name || '-';
    });

    sheet.columns = [
      { width: 18 },
      { width: 25 },
      { width: 12 },
      { width: 22 },
      { width: 18 },
      { width: 25 },
      { width: 40 },
      { width: 20 },
    ];

    return workbook;
  };

  const generateExcelByOccurrence = async () => {
    if (!reportData) throw new Error('Dados não disponíveis');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Devolutivas por Ocorrência');

    // Title
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Relatório de Devolutivas por Ocorrência - ${selectedYear}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Institution
    sheet.mergeCells('A2:G2');
    const instCell = sheet.getCell('A2');
    instCell.value = currentInstitution?.name || '';
    instCell.font = { size: 12 };
    instCell.alignment = { horizontal: 'center' };

    let currentRow = 4;

    occurrencesWithFeedbacks.forEach((occ) => {
      // Occurrence header
      sheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const occHeader = sheet.getCell(`A${currentRow}`);
      occHeader.value = `${formatDate(occ.occurrence_date)} - ${occ.student_name} (${occ.class_name}) - ${occ.occurrence_type} - Prof: ${occ.registered_by_name}`;
      occHeader.font = { bold: true };
      occHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      currentRow++;

      // Feedback headers
      const fbHeaders = ['Data Devolutiva', 'Tipo de Ação', 'Comentários', 'Usuário'];
      fbHeaders.forEach((header, i) => {
        const cell = sheet.getCell(currentRow, i + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      });
      currentRow++;

      // Feedback rows
      occ.feedbacks.forEach((fb) => {
        sheet.getCell(currentRow, 1).value = fb.performed_at ? formatDateTime(fb.performed_at) : '-';
        sheet.getCell(currentRow, 2).value = fb.action_type ? getActionTypeLabel(fb.action_type) : '-';
        sheet.getCell(currentRow, 3).value = fb.description || '-';
        sheet.getCell(currentRow, 4).value = fb.performed_by_name || '-';
        currentRow++;
      });

      // Empty row between occurrences
      currentRow++;
    });

    sheet.columns = [
      { width: 18 },
      { width: 25 },
      { width: 45 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    return workbook;
  };

  const generatePDFByUpdate = () => {
    if (!reportData) throw new Error('Dados não disponíveis');

    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.text(`Relatório de Devolutivas por Atualização - ${selectedYear}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });

    // Institution
    doc.setFontSize(12);
    doc.text(currentInstitution?.name || '', doc.internal.pageSize.width / 2, 22, { align: 'center' });

    // Table
    const tableData = feedbackRows.map((row) => [
      row.feedback_date ? formatDateTime(row.feedback_date) : '-',
      row.student_name || '-',
      row.class_name || '-',
      row.registered_by_name || '-',
      row.occurrence_type || '-',
      row.action_type ? getActionTypeLabel(row.action_type) : '-',
      (row.description || '-').substring(0, 35) + ((row.description?.length || 0) > 35 ? '...' : ''),
      row.performed_by_name || '-',
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Data Devol.', 'Aluno', 'Turma', 'Professor', 'Tipo Ocorr.', 'Tipo Ação', 'Comentários', 'Usuário Dev.']],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        6: { cellWidth: 40 },
      },
    });

    return doc;
  };

  const generatePDFByOccurrence = () => {
    if (!reportData) throw new Error('Dados não disponíveis');

    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.text(`Relatório de Devolutivas por Ocorrência - ${selectedYear}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });

    // Institution
    doc.setFontSize(12);
    doc.text(currentInstitution?.name || '', doc.internal.pageSize.width / 2, 22, { align: 'center' });

    let startY = 35;

    occurrencesWithFeedbacks.forEach((occ) => {
      // Check if we need a new page
      if (startY > doc.internal.pageSize.height - 50) {
        doc.addPage('landscape');
        startY = 20;
      }

      // Occurrence header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatDate(occ.occurrence_date)} - ${occ.student_name} (${occ.class_name}) - ${occ.occurrence_type} - Prof: ${occ.registered_by_name}`, 14, startY);
      doc.setFont('helvetica', 'normal');

      // Feedbacks table
      const feedbackData = occ.feedbacks.map((fb) => [
        fb.performed_at ? formatDateTime(fb.performed_at) : '-',
        fb.action_type ? getActionTypeLabel(fb.action_type) : '-',
        (fb.description || '-').substring(0, 50) + ((fb.description?.length || 0) > 50 ? '...' : ''),
        fb.performed_by_name || '-',
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Data Devolutiva', 'Tipo de Ação', 'Comentários', 'Usuário']],
        body: feedbackData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
        columnStyles: {
          2: { cellWidth: 80 },
        },
        didDrawPage: (data) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          startY = (data as any).cursor?.y || startY + 30;
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY = (doc as any).lastAutoTable?.finalY + 10 || startY + 40;
    });

    return doc;
  };

  const handleGenerate = async () => {
    const itemCount = reportType === 'by_update' ? feedbackRows.length : occurrencesWithFeedbacks.length;

    if (!reportData || itemCount === 0) {
      toast.error('Não há devolutivas para gerar o relatório');
      return;
    }

    setGenerating(true);
    toast.loading('Gerando relatório...');

    try {
      if (format === 'excel') {
        const workbook = reportType === 'by_update'
          ? await generateExcelByUpdate()
          : await generateExcelByOccurrence();

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devolutivas-${reportType === 'by_update' ? 'por-atualizacao' : 'por-ocorrencia'}-${selectedYear}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const doc = reportType === 'by_update'
          ? generatePDFByUpdate()
          : generatePDFByOccurrence();

        doc.save(`devolutivas-${reportType === 'by_update' ? 'por-atualizacao' : 'por-ocorrencia'}-${selectedYear}.pdf`);
      }
      toast.dismiss();
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.dismiss();
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <ProgressLink href="/admin/relatorios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </ProgressLink>
          <div>
            <h1 className="text-3xl font-bold">Relatório de Devolutivas</h1>
            <p className="text-muted-foreground">
              Histórico de devolutivas registradas nas ocorrências
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-32"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Relatório</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={reportType === 'by_update' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReportType('by_update')}
                  >
                    Por Atualização
                  </Button>
                  <Button
                    type="button"
                    variant={reportType === 'by_occurrence' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReportType('by_occurrence')}
                  >
                    Por Ocorrência
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Formato</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={format === 'pdf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat('pdf')}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant={format === 'excel' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat('excel')}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || loadingReport || totalItems === 0}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Spinner size="sm" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {loadingReport ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : reportData ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {reportType === 'by_update' ? 'Devolutivas por Atualização' : 'Devolutivas por Ocorrência'}
              </CardTitle>
              <CardDescription>
                {totalItems} {reportType === 'by_update' ? 'devolutiva(s)' : 'ocorrência(s) com devolutiva'} em {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalItems === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma devolutiva encontrada no período selecionado
                </p>
              ) : reportType === 'by_update' ? (
                // Table for "Por Atualização"
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data Devolutiva</TableHead>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Professor</TableHead>
                        <TableHead>Tipo Ocorrência</TableHead>
                        <TableHead>Tipo de Ação</TableHead>
                        <TableHead>Comentários</TableHead>
                        <TableHead>Usuário Devolutiva</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedFeedbackRows.map((row, index) => (
                        <TableRow key={`${row.occurrence_id}-${index}`}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(row.feedback_date)}
                          </TableCell>
                          <TableCell className="font-medium">{row.student_name}</TableCell>
                          <TableCell>{row.class_name || '-'}</TableCell>
                          <TableCell className="text-sm">{row.registered_by_name}</TableCell>
                          <TableCell>{row.occurrence_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getActionTypeLabel(row.action_type)}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={row.description || ''}>
                            {row.description || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.performed_by_name || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // Grouped view for "Por Ocorrência"
                <div className="space-y-6">
                  {paginatedOccurrences.map((occ) => (
                    <div key={occ.id} className="border rounded-lg overflow-hidden">
                      {/* Occurrence Header */}
                      <div className="bg-gray-100 px-4 py-3 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{occ.student_name}</span>
                        <Badge variant="outline">{occ.class_name}</Badge>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm">{occ.occurrence_type}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm text-muted-foreground">{formatDate(occ.occurrence_date)}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm">Prof: {occ.registered_by_name}</span>
                        <span className="text-muted-foreground">|</span>
                        <OccurrenceStatusBadge status={occ.status} />
                      </div>

                      {/* Feedbacks Table */}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-50">
                            <TableHead>Data Devolutiva</TableHead>
                            <TableHead>Tipo de Ação</TableHead>
                            <TableHead>Comentários</TableHead>
                            <TableHead>Usuário</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {occ.feedbacks.map((fb, fbIndex) => (
                            <TableRow key={fbIndex}>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(fb.performed_at)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{getActionTypeLabel(fb.action_type)}</Badge>
                              </TableCell>
                              <TableCell className="max-w-md" title={fb.description || ''}>
                                {fb.description || '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {fb.performed_by_name || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} de {totalItems}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
