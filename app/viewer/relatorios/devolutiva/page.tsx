'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  FileText,
  Download,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Percent,
  ClipboardList,
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

export default function ViewerRelatorioDevolutivaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [format, setFormat] = useState<'excel' | 'pdf'>('pdf');

  // Generate year options (current year + 2 previous)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (role !== 'admin_viewer' || !user || !institution) {
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'grave':
        return <Badge variant="destructive">Grave</Badge>;
      case 'media':
        return <Badge variant="warning">Média</Badge>;
      default:
        return <Badge variant="mild">Leve</Badge>;
    }
  };

  const generateExcel = async () => {
    if (!reportData) {
      throw new Error('Dados do relatório não disponíveis');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Devolutiva');

    // Title
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Relatório de Devolutiva - ${selectedYear}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Institution
    worksheet.mergeCells('A2:J2');
    const instCell = worksheet.getCell('A2');
    instCell.value = currentInstitution?.name || '';
    instCell.font = { size: 12 };
    instCell.alignment = { horizontal: 'center' };

    // Summary
    worksheet.mergeCells('A4:B4');
    worksheet.getCell('A4').value = 'Resumo';
    worksheet.getCell('A4').font = { bold: true };

    const summaryData = [
      ['Total de Ocorrências', reportData.summary.total_occurrences],
      ['Com Devolutiva', reportData.summary.with_feedback],
      ['Sem Devolutiva', reportData.summary.without_feedback],
      ['Taxa de Resposta', `${reportData.summary.response_rate}%`],
      ['Pendentes', reportData.summary.by_status.pending],
      ['Em Andamento', reportData.summary.by_status.in_progress],
      ['Resolvidas', reportData.summary.by_status.resolved],
    ];

    summaryData.forEach((row, index) => {
      worksheet.getCell(`A${5 + index}`).value = row[0];
      worksheet.getCell(`B${5 + index}`).value = row[1];
    });

    // Table header
    const headerRow = 14;
    worksheet.getCell(`A${headerRow}`).value = 'Data';
    worksheet.getCell(`B${headerRow}`).value = 'Aluno';
    worksheet.getCell(`C${headerRow}`).value = 'Turma';
    worksheet.getCell(`D${headerRow}`).value = 'Tipo';
    worksheet.getCell(`E${headerRow}`).value = 'Severidade';
    worksheet.getCell(`F${headerRow}`).value = 'Status';
    worksheet.getCell(`G${headerRow}`).value = 'Professor';
    worksheet.getCell(`H${headerRow}`).value = 'Devolutivas';
    worksheet.getCell(`I${headerRow}`).value = 'Última Devolutiva';

    const headerCells = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    headerCells.forEach((col) => {
      const cell = worksheet.getCell(`${col}${headerRow}`);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
    });

    // Data rows
    reportData.occurrences.forEach((occ, index) => {
      const rowNum = headerRow + 1 + index;
      worksheet.getCell(`A${rowNum}`).value = occ.occurrence_date ? formatDate(occ.occurrence_date) : '-';
      worksheet.getCell(`B${rowNum}`).value = occ.student_name || '-';
      worksheet.getCell(`C${rowNum}`).value = occ.class_name || '-';
      worksheet.getCell(`D${rowNum}`).value = occ.occurrence_type || '-';
      worksheet.getCell(`E${rowNum}`).value = occ.severity === 'grave' ? 'Grave' : occ.severity === 'media' ? 'Média' : 'Leve';
      worksheet.getCell(`F${rowNum}`).value = occ.status === 'pending' ? 'Pendente' : occ.status === 'in_progress' ? 'Em Andamento' : 'Resolvida';
      worksheet.getCell(`G${rowNum}`).value = occ.registered_by_name || '-';
      worksheet.getCell(`H${rowNum}`).value = occ.feedback_count ?? 0;
      worksheet.getCell(`I${rowNum}`).value = occ.last_feedback_at ? formatDateTime(occ.last_feedback_at) : '-';
    });

    // Column widths
    worksheet.columns = [
      { width: 15 },
      { width: 25 },
      { width: 15 },
      { width: 20 },
      { width: 12 },
      { width: 15 },
      { width: 25 },
      { width: 12 },
      { width: 20 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-devolutiva-${selectedYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = () => {
    if (!reportData) {
      throw new Error('Dados do relatório não disponíveis');
    }

    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.text(`Relatório de Devolutiva - ${selectedYear}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });

    // Institution
    doc.setFontSize(12);
    doc.text(currentInstitution?.name || '', doc.internal.pageSize.width / 2, 22, { align: 'center' });

    // Summary
    doc.setFontSize(14);
    doc.text('Resumo', 14, 35);

    doc.setFontSize(10);
    const summaryY = 42;
    doc.text(`Total de Ocorrências: ${reportData.summary.total_occurrences}`, 14, summaryY);
    doc.text(`Com Devolutiva: ${reportData.summary.with_feedback}`, 14, summaryY + 6);
    doc.text(`Sem Devolutiva: ${reportData.summary.without_feedback}`, 14, summaryY + 12);
    doc.text(`Taxa de Resposta: ${reportData.summary.response_rate}%`, 14, summaryY + 18);

    doc.text(`Pendentes: ${reportData.summary.by_status.pending}`, 100, summaryY);
    doc.text(`Em Andamento: ${reportData.summary.by_status.in_progress}`, 100, summaryY + 6);
    doc.text(`Resolvidas: ${reportData.summary.by_status.resolved}`, 100, summaryY + 12);

    // Table
    const tableData = reportData.occurrences.map((occ) => [
      occ.occurrence_date ? formatDate(occ.occurrence_date) : '-',
      occ.student_name || '-',
      occ.class_name || '-',
      occ.occurrence_type || '-',
      occ.severity === 'grave' ? 'Grave' : occ.severity === 'media' ? 'Média' : 'Leve',
      occ.status === 'pending' ? 'Pendente' : occ.status === 'in_progress' ? 'Em Andamento' : 'Resolvida',
      occ.registered_by_name || '-',
      (occ.feedback_count ?? 0).toString(),
      occ.last_feedback_at ? formatDateTime(occ.last_feedback_at) : '-',
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Data', 'Aluno', 'Turma', 'Tipo', 'Severidade', 'Status', 'Professor', 'Devol.', 'Última Devolutiva']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio-devolutiva-${selectedYear}.pdf`);
  };

  const handleGenerate = async () => {
    if (!reportData || reportData.occurrences.length === 0) {
      toast.error('Não há dados para gerar o relatório');
      return;
    }

    setGenerating(true);
    toast.loading('Gerando relatório...');

    try {
      if (format === 'excel') {
        await generateExcel();
      } else {
        generatePDF();
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
      currentRole="admin_viewer"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <ProgressLink href="/viewer/relatorios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </ProgressLink>
          <div>
            <h1 className="text-3xl font-bold">Relatório de Devolutiva</h1>
            <p className="text-muted-foreground">
              Análise das devolutivas registradas nas ocorrências
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
                disabled={generating || loadingReport || !reportData || reportData.occurrences.length === 0}
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

        {/* Summary Cards */}
        {loadingReport ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : reportData ? (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <ClipboardList className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{reportData.summary.total_occurrences}</p>
                      <p className="text-sm text-muted-foreground">Total de Ocorrências</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{reportData.summary.with_feedback}</p>
                      <p className="text-sm text-muted-foreground">Com Devolutiva</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{reportData.summary.without_feedback}</p>
                      <p className="text-sm text-muted-foreground">Sem Devolutiva</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Percent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{reportData.summary.response_rate}%</p>
                      <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-600">{reportData.summary.by_status.pending}</p>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-600">{reportData.summary.by_status.in_progress}</p>
                      <p className="text-sm text-muted-foreground">Em Andamento</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-600">{reportData.summary.by_status.resolved}</p>
                      <p className="text-sm text-muted-foreground">Resolvidas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Occurrences Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento das Ocorrências</CardTitle>
                <CardDescription>
                  {reportData.occurrences.length} ocorrência(s) em {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.occurrences.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma ocorrência encontrada no período selecionado
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Severidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Professor</TableHead>
                          <TableHead className="text-center">Devol.</TableHead>
                          <TableHead>Última Devolutiva</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.occurrences.map((occ) => (
                          <TableRow key={occ.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(occ.occurrence_date)}
                            </TableCell>
                            <TableCell className="font-medium">{occ.student_name}</TableCell>
                            <TableCell>{occ.class_name || '-'}</TableCell>
                            <TableCell>{occ.occurrence_type}</TableCell>
                            <TableCell>{getSeverityBadge(occ.severity)}</TableCell>
                            <TableCell>
                              <OccurrenceStatusBadge status={occ.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {occ.registered_by_name}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={occ.feedback_count > 0 ? 'default' : 'outline'}>
                                {occ.feedback_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {occ.last_feedback_at ? formatDateTime(occ.last_feedback_at) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
