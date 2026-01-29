'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus,
  Calendar,
  RefreshCcw,
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Users,
  GraduationCap,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { getFromStorage, removeFromStorage, formatDate } from '@/lib/utils';
import type { User, Institution, SchoolYear } from '@/types';

interface SchoolYearWithStats extends SchoolYear {
  stats?: {
    classes: number;
    students: number;
    occurrences: number;
  };
}

export default function AnosLetivosPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [schoolYears, setSchoolYears] = useState<SchoolYearWithStats[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);

  // Rollover Modal
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [rollingOver, setRollingOver] = useState(false);
  const [rolloverOptions, setRolloverOptions] = useState({
    archive_current: true,
    create_classes: true,
    promote_students: false,
    copy_periods: false,
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
      await loadSchoolYears();
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadSchoolYears = async () => {
    setLoadingYears(true);
    try {
      const response = await fetch('/api/school-years');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSchoolYears(data || []);
    } catch (error) {
      console.error('Error loading school years:', error);
      toast.error('Erro ao carregar anos letivos');
    } finally {
      setLoadingYears(false);
    }
  };

  const handleCreateYear = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/school-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: newYear,
          name: `Ano Letivo ${newYear}`,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success(`Ano letivo ${newYear} criado com sucesso`);
      setShowCreateModal(false);
      loadSchoolYears();
    } catch (error: unknown) {
      console.error('Error creating school year:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar ano letivo');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleArchive = async (year: SchoolYearWithStats) => {
    const action = year.is_archived ? 'desarquivar' : 'arquivar';
    if (!confirm(`Deseja ${action} o ano letivo ${year.year}?`)) return;

    try {
      const response = await fetch(`/api/school-years/${year.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_archived: !year.is_archived,
          is_current: year.is_archived ? false : year.is_current,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success(`Ano letivo ${year.is_archived ? 'desarquivado' : 'arquivado'} com sucesso`);
      loadSchoolYears();
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Erro ao alterar status do ano letivo');
    }
  };

  const handleSetCurrent = async (year: SchoolYearWithStats) => {
    if (year.is_current) return;
    if (!confirm(`Deseja definir ${year.year} como ano letivo atual?`)) return;

    try {
      const response = await fetch(`/api/school-years/${year.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_current: true,
          is_archived: false,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success(`${year.year} definido como ano letivo atual`);
      loadSchoolYears();
    } catch (error) {
      console.error('Error setting current year:', error);
      toast.error('Erro ao definir ano letivo atual');
    }
  };

  const handleRollover = async () => {
    const currentYear = schoolYears.find(y => y.is_current);
    if (!currentYear) {
      toast.error('Nenhum ano letivo atual encontrado');
      return;
    }

    setRollingOver(true);
    try {
      const response = await fetch('/api/school-years/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_year: currentYear.year,
          to_year: currentYear.year + 1,
          ...rolloverOptions,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      let message = `Virada de ano concluída: ${currentYear.year} → ${currentYear.year + 1}`;
      if (result.results) {
        message += `\n- ${result.results.classes_created} turmas criadas`;
        if (rolloverOptions.promote_students) {
          message += `\n- ${result.results.students_promoted} alunos promovidos`;
        }
      }

      toast.success(message);
      setShowRolloverModal(false);
      loadSchoolYears();
    } catch (error: unknown) {
      console.error('Error rolling over:', error);
      toast.error(error instanceof Error ? error.message : 'Erro na virada de ano');
    } finally {
      setRollingOver(false);
    }
  };

  const handleSignOut = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    removeFromStorage('currentRole');
    removeFromStorage('currentUser');
    removeFromStorage('currentInstitution');
    removeFromStorage('userInstitutions');
    router.push('/');
  };

  const currentYear = schoolYears.find(y => y.is_current);
  const archivedYears = schoolYears.filter(y => y.is_archived);
  const activeYears = schoolYears.filter(y => !y.is_archived);

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
            <h1 className="text-3xl font-bold">Anos Letivos</h1>
            <p className="text-muted-foreground">
              Gerencie os anos letivos da instituição
            </p>
          </div>
          <div className="flex gap-2">
            {currentYear && (
              <Button variant="outline" onClick={() => setShowRolloverModal(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Virada de Ano
              </Button>
            )}
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ano Letivo
            </Button>
          </div>
        </div>

        {/* Current Year Card */}
        {currentYear && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary p-2">
                    <Calendar className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Ano Letivo Atual: {currentYear.year}
                      <Badge variant="success">Ativo</Badge>
                    </CardTitle>
                    <CardDescription>
                      {currentYear.name || `Ano Letivo ${currentYear.year}`}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{currentYear.stats?.classes || 0}</p>
                    <p className="text-sm text-muted-foreground">Turmas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{currentYear.stats?.students || 0}</p>
                    <p className="text-sm text-muted-foreground">Matrículas Ativas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{currentYear.stats?.occurrences || 0}</p>
                    <p className="text-sm text-muted-foreground">Ocorrências</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Years Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Todos os Anos Letivos
              </CardTitle>
              <CardDescription>
                {activeYears.length} ativo(s), {archivedYears.length} arquivado(s)
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={loadSchoolYears}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingYears ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : schoolYears.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum ano letivo cadastrado</p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Ano Letivo
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ano</TableHead>
                      <TableHead>Turmas</TableHead>
                      <TableHead>Matrículas</TableHead>
                      <TableHead>Ocorrências</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolYears.map((year) => (
                      <TableRow key={year.id} className={year.is_archived ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {year.year}
                          {year.is_current && (
                            <Badge variant="success" className="ml-2">Atual</Badge>
                          )}
                        </TableCell>
                        <TableCell>{year.stats?.classes || 0}</TableCell>
                        <TableCell>{year.stats?.students || 0}</TableCell>
                        <TableCell>{year.stats?.occurrences || 0}</TableCell>
                        <TableCell>
                          {year.is_archived ? (
                            <Badge variant="secondary">
                              <Archive className="h-3 w-3 mr-1" />
                              Arquivado
                            </Badge>
                          ) : (
                            <Badge variant="success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!year.is_current && !year.is_archived && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetCurrent(year)}
                                title="Definir como atual"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Tornar Atual
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleArchive(year)}
                              title={year.is_archived ? 'Desarquivar' : 'Arquivar'}
                            >
                              {year.is_archived ? (
                                <>
                                  <ArchiveRestore className="h-4 w-4 mr-1" />
                                  Desarquivar
                                </>
                              ) : (
                                <>
                                  <Archive className="h-4 w-4 mr-1" />
                                  Arquivar
                                </>
                              )}
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

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-muted p-3">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Como funciona a virada de ano?</h3>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>1. O ano atual é arquivado (dados preservados para consulta)</li>
                  <li>2. Um novo ano letivo é criado e definido como atual</li>
                  <li>3. As turmas são replicadas para o novo ano (opcional)</li>
                  <li>4. Alunos podem ser promovidos automaticamente (opcional)</li>
                  <li>5. O histórico de ocorrências é preservado e permanece consultável</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Year Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Ano Letivo"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Input
              id="year"
              type="number"
              min={2020}
              max={2050}
              value={newYear}
              onChange={(e) => setNewYear(parseInt(e.target.value))}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Será criado o ano letivo {newYear} com as datas padrão (Fevereiro a Dezembro).
            Você pode ajustar as datas posteriormente.
          </p>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateYear} disabled={creating}>
              {creating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Criando...
                </>
              ) : (
                'Criar Ano Letivo'
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Rollover Modal */}
      <Modal
        isOpen={showRolloverModal}
        onClose={() => setShowRolloverModal(false)}
        title="Virada de Ano Letivo"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Esta ação irá encerrar o ano letivo {currentYear?.year} e iniciar {currentYear ? currentYear.year + 1 : ''}.
              Os dados históricos serão preservados.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="archive_current"
                checked={rolloverOptions.archive_current}
                onCheckedChange={(checked) =>
                  setRolloverOptions({ ...rolloverOptions, archive_current: !!checked })
                }
              />
              <Label htmlFor="archive_current" className="font-normal cursor-pointer">
                Arquivar ano atual ({currentYear?.year})
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="create_classes"
                checked={rolloverOptions.create_classes}
                onCheckedChange={(checked) =>
                  setRolloverOptions({ ...rolloverOptions, create_classes: !!checked })
                }
              />
              <Label htmlFor="create_classes" className="font-normal cursor-pointer">
                Criar turmas baseadas no ano anterior
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="promote_students"
                checked={rolloverOptions.promote_students}
                onCheckedChange={(checked) =>
                  setRolloverOptions({ ...rolloverOptions, promote_students: !!checked })
                }
              />
              <Label htmlFor="promote_students" className="font-normal cursor-pointer">
                Promover alunos automaticamente para o próximo ano
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="copy_periods"
                checked={rolloverOptions.copy_periods}
                onCheckedChange={(checked) =>
                  setRolloverOptions({ ...rolloverOptions, copy_periods: !!checked })
                }
              />
              <Label htmlFor="copy_periods" className="font-normal cursor-pointer">
                Copiar períodos acadêmicos (bimestres/trimestres)
              </Label>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowRolloverModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRollover} disabled={rollingOver}>
              {rollingOver ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Iniciar Virada de Ano
                </>
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
