'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RefreshCcw, Search, Plus, Eye, ClipboardList, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Settings, Pencil, Trash2, GripVertical } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OccurrenceStatusBadge, OccurrenceDetailModal, AddFeedbackModal } from '@/components/occurrences';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDateTime } from '@/lib/utils';
import type { User, Institution, Class, OccurrenceType, OccurrenceStatus } from '@/types';

interface OccurrenceWithRelations {
  id: string;
  occurrence_date: string;
  description?: string;
  status: OccurrenceStatus;
  student?: { full_name: string };
  class_at_occurrence?: { name: string };
  occurrence_type?: { category: string; severity: string };
  registered_by_user?: { full_name: string };
}

interface FeedbackActionType {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

const ICON_OPTIONS = [
  { value: 'MessageCircle', label: 'Conversa' },
  { value: 'Phone', label: 'Telefone' },
  { value: 'AlertTriangle', label: 'Alerta' },
  { value: 'FileText', label: 'Documento' },
  { value: 'ArrowRight', label: 'Encaminhamento' },
  { value: 'Building', label: 'Prédio' },
  { value: 'Heart', label: 'Cuidado' },
  { value: 'UserX', label: 'Usuário X' },
  { value: 'Users', label: 'Grupo' },
  { value: 'Eye', label: 'Observação' },
  { value: 'CheckCircle', label: 'Resolvido' },
  { value: 'MoreHorizontal', label: 'Outros' },
];

export default function AdminOcorrenciasPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [occurrences, setOccurrences] = useState<OccurrenceWithRelations[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
  const [loadingOccurrences, setLoadingOccurrences] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 100;

  // Modals
  const [selectedOccurrence, setSelectedOccurrence] = useState<OccurrenceWithRelations | null>(null);
  const [feedbackOccurrence, setFeedbackOccurrence] = useState<OccurrenceWithRelations | null>(null);

  // Action Types Management
  const [showActionTypesModal, setShowActionTypesModal] = useState(false);
  const [actionTypes, setActionTypes] = useState<FeedbackActionType[]>([]);
  const [loadingActionTypes, setLoadingActionTypes] = useState(false);
  const [showTypeFormModal, setShowTypeFormModal] = useState(false);
  const [editingType, setEditingType] = useState<FeedbackActionType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', icon: 'MessageCircle' });
  const [savingType, setSavingType] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FeedbackActionType | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (!['admin', 'viewer'].includes(role || '') || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      await Promise.all([
        loadClasses(institution.id),
        loadOccurrences(institution.id),
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

  // Action Types Management Functions
  const loadActionTypes = async () => {
    setLoadingActionTypes(true);
    try {
      const response = await fetch('/api/feedback-action-types');
      if (response.ok) {
        const data = await response.json();
        setActionTypes(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de ação:', error);
    } finally {
      setLoadingActionTypes(false);
    }
  };

  const openActionTypesModal = async () => {
    setShowActionTypesModal(true);
    await loadActionTypes();
  };

  const openAddTypeModal = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '', icon: 'MessageCircle' });
    setShowTypeFormModal(true);
  };

  const openEditTypeModal = (type: FeedbackActionType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      description: type.description || '',
      icon: type.icon,
    });
    setShowTypeFormModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSavingType(true);
    try {
      const url = editingType
        ? `/api/feedback-action-types/${editingType.id}`
        : '/api/feedback-action-types';
      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar');
      }

      toast.success(editingType ? 'Tipo atualizado!' : 'Tipo criado!');
      setShowTypeFormModal(false);
      await loadActionTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setSavingType(false);
    }
  };

  const handleToggleActive = async (type: FeedbackActionType) => {
    try {
      const response = await fetch(`/api/feedback-action-types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !type.is_active }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar');
      }

      toast.success(type.is_active ? 'Tipo desativado' : 'Tipo ativado');
      await loadActionTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar');
    }
  };

  const handleDeleteType = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch(`/api/feedback-action-types/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir');
      }

      toast.success(data.deactivated ? 'Tipo desativado (em uso)' : 'Tipo excluído!');
      setDeleteConfirm(null);
      await loadActionTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  const loadOccurrences = async (institutionId: string, page: number = 1) => {
    setLoadingOccurrences(true);
    try {
      const supabase = createClient();

      // Buscar contagens com queries individuais para evitar limite de 1000 linhas do Supabase
      const [totalResult, pendingResult, inProgressResult, resolvedResult] = await Promise.all([
        // Total de ocorrências
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null),
        // Pendentes (NULL ou 'pending')
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .or('status.is.null,status.eq.pending'),
        // Em andamento
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .eq('status', 'in_progress'),
        // Resolvidas
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .eq('status', 'resolved'),
      ]);

      const total = totalResult.count || 0;
      setTotalCount(total);
      setStats({
        total,
        pending: pendingResult.count || 0,
        in_progress: inProgressResult.count || 0,
        resolved: resolvedResult.count || 0
      });

      // Buscar dados paginados
      const offset = (page - 1) * pageSize;
      const { data, error } = await supabase
        .from('occurrences')
        .select(`
          id,
          occurrence_date,
          description,
          status,
          student:students!student_id(full_name),
          class_at_occurrence:classes!occurrences_class_id_at_occurrence_fkey(name),
          occurrence_type:occurrence_types!occurrence_type_id(category, severity),
          registered_by_user:users!registered_by(full_name)
        `)
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .order('occurrence_date', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const occurrencesList: OccurrenceWithRelations[] = (data || []).map((o: any) => ({
        id: o.id,
        occurrence_date: o.occurrence_date,
        description: o.description,
        student: o.student as unknown as { full_name: string } | undefined,
        class_at_occurrence: o.class_at_occurrence as unknown as { name: string } | undefined,
        occurrence_type: o.occurrence_type as unknown as { category: string; severity: string } | undefined,
        registered_by_user: o.registered_by_user as unknown as { full_name: string } | undefined,
        status: (o.status || 'pending') as OccurrenceStatus
      }));

      setOccurrences(occurrencesList);
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
        return <Badge variant="warning">Média</Badge>;
      default:
        return <Badge variant="mild">Leve</Badge>;
    }
  };

  // Filtered occurrences
  const filteredOccurrences = occurrences.filter((occurrence) => {
    const matchesSearch = !searchTerm ||
      occurrence.student?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !filterClass ||
      occurrence.class_at_occurrence?.name === classes.find(c => c.id === filterClass)?.name;
    const matchesStatus = !filterStatus || occurrence.status === filterStatus;
    const matchesType = !filterType ||
      occurrence.occurrence_type?.category === occurrenceTypes.find(t => t.id === filterType)?.category;
    return matchesSearch && matchesClass && matchesStatus && matchesType;
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
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Ocorrências</h1>
            <p className="text-muted-foreground">
              Visualize e registre devolutivas nas ocorrências
            </p>
          </div>
          <Button
            variant="outline"
            onClick={openActionTypesModal}
          >
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar Ações
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
                  <p className="text-sm text-muted-foreground">Em andamento</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resolvidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-40"
              >
                <option value="">Todos status</option>
                <option value="pending">Pendente</option>
                <option value="in_progress">Em andamento</option>
                <option value="resolved">Resolvida</option>
              </Select>
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
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-40"
              >
                <option value="">Todos tipos</option>
                {occurrenceTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.category}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Occurrences Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Ocorrências</CardTitle>
              <CardDescription>
                {filteredOccurrences.length} de {occurrences.length} ocorrência(s)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => currentInstitution && loadOccurrences(currentInstitution.id, currentPage)}
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
                Nenhuma ocorrência encontrada
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
                      <TableHead>Professor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOccurrences.map((occurrence) => (
                      <TableRow key={occurrence.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(occurrence.occurrence_date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {occurrence.student?.full_name || '-'}
                        </TableCell>
                        <TableCell>{occurrence.class_at_occurrence?.name || '-'}</TableCell>
                        <TableCell>{occurrence.occurrence_type?.category || '-'}</TableCell>
                        <TableCell>
                          {getSeverityBadge(occurrence.occurrence_type?.severity || 'leve')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {occurrence.registered_by_user?.full_name || '-'}
                        </TableCell>
                        <TableCell>
                          <OccurrenceStatusBadge status={occurrence.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedOccurrence(occurrence)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setFeedbackOccurrence(occurrence)}
                              title="Adicionar devolutiva"
                              className="text-primary"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      if (currentInstitution) loadOccurrences(currentInstitution.id, newPage);
                    }}
                    disabled={currentPage === 1 || loadingOccurrences}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm">
                    Página {currentPage} de {Math.ceil(totalCount / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      if (currentInstitution) loadOccurrences(currentInstitution.id, newPage);
                    }}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize) || loadingOccurrences}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <OccurrenceDetailModal
        isOpen={!!selectedOccurrence}
        onClose={() => setSelectedOccurrence(null)}
        occurrence={selectedOccurrence}
      />

      {/* Add Feedback Modal */}
      <AddFeedbackModal
        isOpen={!!feedbackOccurrence}
        onClose={() => setFeedbackOccurrence(null)}
        occurrence={feedbackOccurrence}
        onSuccess={() => currentInstitution && loadOccurrences(currentInstitution.id, currentPage)}
      />

      {/* Action Types Management Modal */}
      <Modal
        isOpen={showActionTypesModal}
        onClose={() => setShowActionTypesModal(false)}
        title="Gerenciar Tipos de Ação"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure os tipos de ação disponíveis para devolutivas
            </p>
            <Button onClick={openAddTypeModal} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          </div>

          {loadingActionTypes ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : actionTypes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum tipo de ação configurado
            </p>
          ) : (
            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {actionTypes.map((type) => (
                <div
                  key={type.id}
                  className={`flex items-center justify-between p-3 ${!type.is_active ? 'opacity-50 bg-gray-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{type.name}</p>
                      {type.description && (
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditTypeModal(type)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(type)}
                      title={type.is_active ? 'Desativar' : 'Ativar'}
                      className={type.is_active ? 'text-yellow-600' : 'text-green-600'}
                    >
                      {type.is_active ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(type)}
                      title="Excluir"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowActionTypesModal(false)}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add/Edit Action Type Modal */}
      <Modal
        isOpen={showTypeFormModal}
        onClose={() => setShowTypeFormModal(false)}
        title={editingType ? 'Editar Tipo de Ação' : 'Novo Tipo de Ação'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="typeName">Nome *</Label>
            <Input
              id="typeName"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="Ex: Conversa com Aluno"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typeDescription">Descrição</Label>
            <Textarea
              id="typeDescription"
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              placeholder="Descreva o tipo de ação..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typeIcon">Ícone</Label>
            <Select
              id="typeIcon"
              value={typeForm.icon}
              onChange={(e) => setTypeForm({ ...typeForm, icon: e.target.value })}
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon.value} value={icon.value}>{icon.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowTypeFormModal(false)} disabled={savingType}>
            Cancelar
          </Button>
          <Button onClick={handleSaveType} disabled={savingType}>
            {savingType ? <Spinner size="sm" className="mr-2" /> : null}
            {editingType ? 'Salvar' : 'Criar'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
      >
        <p>
          Tem certeza que deseja excluir o tipo de ação <strong>{deleteConfirm?.name}</strong>?
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Se este tipo estiver em uso, ele será desativado em vez de excluído.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDeleteType}>
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  );
}
