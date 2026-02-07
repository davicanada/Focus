'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RefreshCcw, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDateTime, createBrazilDateTimeISO } from '@/lib/utils';
import type { User, Institution, UserInstitution, Class, Occurrence, OccurrenceType } from '@/types';
import { OccurrenceStatusBadge, OccurrenceDetailModal } from '@/components/occurrences';

interface OccurrenceWithRelations extends Omit<Occurrence, 'student' | 'occurrence_type' | 'class_at_occurrence'> {
  student?: { full_name: string; class?: { name: string; education_level?: string } };
  occurrence_type?: { category: string; severity: string };
  class_at_occurrence?: { name: string };
}

export default function AdminMinhasOcorrenciasPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [userInstitutions, setUserInstitutions] = useState<(UserInstitution & { institution: Institution })[]>([]);

  // Data
  const [occurrences, setOccurrences] = useState<OccurrenceWithRelations[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // View Modal
  const [selectedOccurrence, setSelectedOccurrence] = useState<OccurrenceWithRelations | null>(null);

  // Edit Modal
  const [editingOccurrence, setEditingOccurrence] = useState<OccurrenceWithRelations | null>(null);
  const [editForm, setEditForm] = useState({
    occurrence_type_id: '',
    occurrence_date: '',
    occurrence_time: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete Modal
  const [deletingOccurrence, setDeletingOccurrence] = useState<OccurrenceWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const DELETION_WINDOW_MS = 48 * 60 * 60 * 1000;
  const isWithin48h = (createdAt: string) => {
    return Date.now() - new Date(createdAt).getTime() <= DELETION_WINDOW_MS;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);
      const userInst = getFromStorage<(UserInstitution & { institution: Institution })[]>('userInstitutions', []);

      if (role !== 'admin' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      setUserInstitutions(userInst);
      await Promise.all([
        loadClasses(institution.id),
        loadOccurrences(institution.id, user.id),
        loadOccurrenceTypes(institution.id),
      ]);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadClasses = async (institutionId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadOccurrenceTypes = async (institutionId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('occurrence_types')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('category');

      setOccurrenceTypes(data || []);
    } catch (error) {
      console.error('Error loading occurrence types:', error);
    }
  };

  const loadOccurrences = async (institutionId: string, userId: string) => {
    setLoadingOccurrences(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('occurrences')
        .select(`
          *,
          student:students(full_name, class:classes(name, education_level)),
          occurrence_type:occurrence_types(category, severity),
          class_at_occurrence:classes!occurrences_class_id_at_occurrence_fkey(name)
        `)
        .eq('institution_id', institutionId)
        .eq('registered_by', userId)
        .is('deleted_at', null)
        .order('occurrence_date', { ascending: false });

      if (error) throw error;
      setOccurrences(data || []);
    } catch (error) {
      console.error('Error loading occurrences:', error);
    } finally {
      setLoadingOccurrences(false);
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
        return <Badge variant="warning">Media</Badge>;
      default:
        return <Badge variant="mild">Leve</Badge>;
    }
  };

  const handleOpenEdit = (occurrence: OccurrenceWithRelations) => {
    const matchingType = occurrenceTypes.find(
      t => t.category === occurrence.occurrence_type?.category
    );

    const dateTime = new Date(occurrence.occurrence_date);
    const timeString = dateTime.toTimeString().slice(0, 5);

    setEditForm({
      occurrence_type_id: matchingType?.id || '',
      occurrence_date: occurrence.occurrence_date.split('T')[0],
      occurrence_time: timeString,
      description: occurrence.description || '',
    });
    setEditingOccurrence(occurrence);
  };

  const handleSaveEdit = async () => {
    if (!editingOccurrence || !editForm.occurrence_type_id || !editForm.occurrence_date || !editForm.occurrence_time) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/occurrences/${editingOccurrence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occurrence_type_id: editForm.occurrence_type_id,
          occurrence_date: createBrazilDateTimeISO(editForm.occurrence_date, editForm.occurrence_time),
          description: editForm.description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar');
      }

      toast.success('Ocorrencia atualizada com sucesso');
      setEditingOccurrence(null);
      loadOccurrences(currentInstitution!.id, currentUser!.id);
    } catch (error) {
      console.error('Error updating occurrence:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar ocorrencia');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOccurrence) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/occurrences/${deletingOccurrence.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao excluir ocorrencia');
        return;
      }
      toast.success('Ocorrencia excluida com sucesso');
      setDeletingOccurrence(null);
      if (currentInstitution && currentUser) {
        loadOccurrences(currentInstitution.id, currentUser.id);
      }
    } catch {
      toast.error('Erro ao excluir ocorrencia');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered occurrences
  const filteredOccurrences = occurrences.filter((occurrence) => {
    const matchesSearch = occurrence.student?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass || occurrence.student?.class?.name === classes.find(c => c.id === filterClass)?.name;
    const matchesSeverity = !filterSeverity || occurrence.occurrence_type?.severity === filterSeverity;
    const matchesStatus = !filterStatus || occurrence.status === filterStatus;
    return matchesSearch && matchesClass && matchesSeverity && matchesStatus;
  });

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
      userInstitutions={userInstitutions}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minhas Ocorrencias</h1>
          <p className="text-muted-foreground">
            Visualize todas as ocorrencias que voce registrou
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-40"
              >
                <option value="">Todas turmas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-40"
              >
                <option value="">Todas severidades</option>
                <option value="leve">Leve</option>
                <option value="media">Media</option>
                <option value="grave">Grave</option>
              </Select>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-40"
              >
                <option value="">Todos status</option>
                <option value="pending">Pendente</option>
                <option value="in_progress">Em andamento</option>
                <option value="resolved">Resolvida</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Occurrences Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Ocorrencias</CardTitle>
              <CardDescription>
                {filteredOccurrences.length} de {occurrences.length} ocorrencia(s)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadOccurrences(currentInstitution!.id, currentUser!.id)}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingOccurrences ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredOccurrences.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma ocorrencia encontrada
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
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOccurrences.map((occurrence) => (
                    <TableRow key={occurrence.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(occurrence.occurrence_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {occurrence.student?.full_name}
                      </TableCell>
                      <TableCell>{occurrence.student?.class?.name}</TableCell>
                      <TableCell>{occurrence.occurrence_type?.category}</TableCell>
                      <TableCell>
                        {getSeverityBadge(occurrence.occurrence_type?.severity || 'leve')}
                      </TableCell>
                      <TableCell>
                        <OccurrenceStatusBadge status={occurrence.status || 'pending'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOccurrence(occurrence)}
                            title="Ver detalhes e devolutivas"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(occurrence)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isWithin48h(occurrence.created_at) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingOccurrence(occurrence)}
                              title="Excluir (disponivel ate 48h apos registro)"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Details Modal with Timeline */}
      <OccurrenceDetailModal
        isOpen={!!selectedOccurrence}
        onClose={() => setSelectedOccurrence(null)}
        occurrence={selectedOccurrence ? {
          id: selectedOccurrence.id,
          occurrence_date: selectedOccurrence.occurrence_date,
          description: selectedOccurrence.description,
          status: selectedOccurrence.status || 'pending',
          student: selectedOccurrence.student,
          class_at_occurrence: selectedOccurrence.class_at_occurrence || selectedOccurrence.student?.class,
          occurrence_type: selectedOccurrence.occurrence_type
        } : null}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingOccurrence}
        onClose={() => setEditingOccurrence(null)}
        title="Editar Ocorrencia"
      >
        {editingOccurrence && (
          <div className="space-y-4">
            {/* Read-only student info */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Aluno</p>
              <p className="font-medium">{editingOccurrence.student?.full_name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Turma: {editingOccurrence.student?.class?.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_type">Tipo de Ocorrencia *</Label>
              <Select
                id="edit_type"
                value={editForm.occurrence_type_id}
                onChange={(e) => setEditForm({ ...editForm, occurrence_type_id: e.target.value })}
              >
                <option value="">Selecione o tipo</option>
                {occurrenceTypes
                  .filter(type => {
                    if (!type.education_levels || type.education_levels.length === 0) return true;
                    const level = editingOccurrence?.student?.class?.education_level;
                    return level ? type.education_levels.includes(level) : true;
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
                <Label htmlFor="edit_date">Data *</Label>
                <Input
                  id="edit_date"
                  type="date"
                  value={editForm.occurrence_date}
                  onChange={(e) => setEditForm({ ...editForm, occurrence_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_time">Hora *</Label>
                <Input
                  id="edit_time"
                  type="time"
                  value={editForm.occurrence_time}
                  onChange={(e) => setEditForm({ ...editForm, occurrence_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Descricao</Label>
              <Textarea
                id="edit_description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Descreva a ocorrencia..."
                rows={3}
              />
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => setEditingOccurrence(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
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
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingOccurrence}
        onClose={() => !deleting && setDeletingOccurrence(null)}
        title="Excluir Ocorrencia"
      >
        {deletingOccurrence && (
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir esta ocorrencia?</p>
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Aluno:</strong> {deletingOccurrence.student?.full_name}</p>
              <p><strong>Tipo:</strong> {deletingOccurrence.occurrence_type?.category}</p>
              <p><strong>Data:</strong> {formatDateTime(deletingOccurrence.occurrence_date)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta acao pode ser desfeita apenas por um administrador.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setDeletingOccurrence(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
