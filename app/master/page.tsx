'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Users,
  Building2,
  ClipboardList,
  ScrollText,
  Check,
  X,
  RefreshCcw,
  Trash2,
  Power,
  CheckCheck,
  AlertTriangle,
  UserCog,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDateTime, formatDate } from '@/lib/utils';
import type { User, Institution, AccessRequest, SystemLog } from '@/types';

interface UserWithInstitutions extends User {
  user_institutions: Array<{
    role: string;
    institution: Institution;
  }>;
}

// Extended type for AccessRequest with joined institution data
interface AccessRequestWithInstitution extends AccessRequest {
  institution?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
  };
}

// Action labels for logs
const ACTION_LABELS: Record<string, string> = {
  'occurrence_create': 'Ocorrência Criada',
  'occurrence_update': 'Ocorrência Editada',
  'occurrence_delete': 'Ocorrência Excluída',
  'role_change': 'Mudança de Permissão',
  'user_approve': 'Usuário Aprovado',
  'user_reject': 'Usuário Rejeitado',
  'user_deactivate': 'Usuário Desativado',
  'student_create': 'Aluno Cadastrado',
  'student_deactivate': 'Aluno Desligado',
  'class_create': 'Turma Criada',
  'class_deactivate': 'Turma Desativada',
};

export default function MasterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('requests');

  // Data states
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithInstitution[]>([]);
  const [users, setUsers] = useState<UserWithInstitutions[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  // Note: logs state removed, now using allLogs with filtering/pagination

  // Loading states
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<AccessRequestWithInstitution | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);

  // Bulk approve modal
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

  // Delete institution modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingInstitution, setDeletingInstitution] = useState(false);
  const [deletePreview, setDeletePreview] = useState<{
    students: number;
    occurrences: number;
    classes: number;
    teachers: number;
    loading: boolean;
  }>({ students: 0, occurrences: 0, classes: 0, teachers: 0, loading: false });

  // Filter states
  const [filterName, setFilterName] = useState('');
  const [filterInstitution, setFilterInstitution] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Role change modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: UserWithInstitutions;
    userInstitution: { role: string; institution: Institution };
  } | null>(null);
  const [newRole, setNewRole] = useState('');
  const [changingRole, setChangingRole] = useState(false);

  // Log filter states
  const [logFilterAction, setLogFilterAction] = useState('');
  const [logFilterInstitution, setLogFilterInstitution] = useState('');
  const [logFilterPeriod, setLogFilterPeriod] = useState('30'); // days
  const [logPage, setLogPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(20);
  const [allLogs, setAllLogs] = useState<SystemLog[]>([]);

  // Log details modal
  const [showLogDetailModal, setShowLogDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  // Lookup maps for displaying names instead of IDs in logs
  const [studentLookup, setStudentLookup] = useState<Map<string, string>>(new Map());
  const [occurrenceTypeLookup, setOccurrenceTypeLookup] = useState<Map<string, string>>(new Map());

  // Check auth and load data
  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);

      if (role !== 'master' || !user) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // Load data when tab changes
  useEffect(() => {
    if (!currentUser) return;

    switch (activeTab) {
      case 'requests':
        loadAccessRequests();
        break;
      case 'users':
        loadUsers();
        break;
      case 'institutions':
        loadInstitutions();
        break;
      case 'logs':
        loadLogs();
        break;
    }
  }, [activeTab, currentUser]);

  const loadAccessRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch('/api/access-request?status=pending');
      const data = await response.json();
      setAccessRequests(data.data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_institutions(
            role,
            institution:institutions(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadInstitutions = async () => {
    setLoadingInstitutions(true);
    try {
      const response = await fetch('/api/institutions/admin');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar instituições');
      }

      setInstitutions(result.data || []);
    } catch (error) {
      console.error('Error loading institutions:', error);
      toast.error('Erro ao carregar instituições');
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const supabase = createClient();

      // Calculate date filter based on period
      const periodDays = parseInt(logFilterPeriod) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Fetch logs and lookup data in parallel
      // Use API for lookups to bypass RLS (master needs to see all students/types)
      const [logsResult, lookupsResponse] = await Promise.all([
        supabase
          .from('system_logs')
          .select(`
            *,
            user:users(full_name, email),
            institution:institutions(name)
          `)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(1000),
        fetch('/api/master/lookups'),
      ]);

      if (logsResult.error) throw logsResult.error;

      // Parse lookups response
      const lookupsData = await lookupsResponse.json();

      // Build lookup maps from API response
      const studentMap = new Map<string, string>();
      (lookupsData.students || []).forEach((s: { id: string; full_name: string }) => studentMap.set(s.id, s.full_name));
      setStudentLookup(studentMap);

      const typeMap = new Map<string, string>();
      (lookupsData.occurrenceTypes || []).forEach((t: { id: string; category: string }) => typeMap.set(t.id, t.category));
      setOccurrenceTypeLookup(typeMap);

      setAllLogs(logsResult.data || []);
      setLogPage(1); // Reset to first page when reloading
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Filtered and paginated logs
  const filteredLogs = useMemo(() => {
    let result = allLogs;

    // Filter by action
    if (logFilterAction) {
      result = result.filter(log => log.action === logFilterAction);
    }

    // Filter by institution
    if (logFilterInstitution) {
      result = result.filter(log => log.institution_id === logFilterInstitution);
    }

    return result;
  }, [allLogs, logFilterAction, logFilterInstitution]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * logItemsPerPage;
    const end = start + logItemsPerPage;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, logPage, logItemsPerPage]);

  const totalLogPages = Math.ceil(filteredLogs.length / logItemsPerPage);

  // Get unique actions from logs for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(allLogs.map(log => log.action));
    return Array.from(actions).sort();
  }, [allLogs]);

  // Get unique institutions from logs for filter dropdown
  const uniqueLogInstitutions = useMemo(() => {
    const institutions = new Map<string, string>();
    allLogs.forEach(log => {
      if (log.institution_id && (log as any).institution?.name) {
        institutions.set(log.institution_id, (log as any).institution.name);
      }
    });
    return Array.from(institutions.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allLogs]);

  // Resolve ID to name using lookup maps
  const resolveIdToName = (key: string, id: unknown): string => {
    if (!id || typeof id !== 'string') return String(id || '-');

    // Map of field names to their lookup maps and labels
    if (key === 'student_id' || key === 'student') {
      return studentLookup.get(id) || id;
    }
    if (key === 'occurrence_type_id' || key === 'occurrence_type') {
      return occurrenceTypeLookup.get(id) || id;
    }

    return String(id);
  };

  // Format field name for display
  const formatFieldName = (field: string): string => {
    const fieldLabels: Record<string, string> = {
      'student_id': 'Aluno',
      'occurrence_type_id': 'Tipo de Ocorrência',
      'occurrence_date': 'Data/Hora',
      'description': 'Descrição',
      'class_id_at_occurrence': 'Turma',
      'deleted_by': 'Excluído por',
      'reason': 'Motivo',
    };
    return fieldLabels[field] || field.replace(/_/g, ' ');
  };

  // Format date/time values
  const formatDetailValue = (key: string, value: unknown): string => {
    if (!value) return '-';

    // Format dates
    if (key.includes('date') && typeof value === 'string') {
      try {
        return formatDateTime(value);
      } catch {
        return String(value);
      }
    }

    // Resolve IDs to names
    if (key.includes('_id') || key === 'student' || key === 'occurrence_type') {
      return resolveIdToName(key, value);
    }

    return String(value);
  };

  // Format log details for display
  const formatLogDetails = (details: Record<string, unknown> | null | undefined) => {
    if (!details) return null;

    const formatValue = (value: unknown, key: string): React.ReactNode => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'object') {
        // Handle changes object
        if (key === 'changes') {
          const changes = value as Record<string, { old: unknown; new: unknown }>;
          return (
            <div className="space-y-2 mt-2">
              {Object.entries(changes).filter(([_, v]) => v !== null).map(([field, change]) => (
                <div key={field} className="bg-muted rounded-lg p-3">
                  <p className="font-medium">{formatFieldName(field)}</p>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Antes: </span>
                      <span className="text-destructive">{formatDetailValue(field, change.old)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Depois: </span>
                      <span className="text-green-600">{formatDetailValue(field, change.new)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return JSON.stringify(value, null, 2);
      }
      return formatDetailValue(key, value);
    };

    return (
      <div className="space-y-2">
        {Object.entries(details).map(([key, value]) => (
          <div key={key}>
            <span className="font-medium">{formatFieldName(key)}: </span>
            {formatValue(value, key)}
          </div>
        ))}
      </div>
    );
  };

  const handleApproveRequest = async (request: AccessRequestWithInstitution) => {
    setProcessingRequest(true);
    try {
      const response = await fetch('/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.id,
          action: 'approve',
          reviewer_id: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao aprovar solicitação');
      }

      toast.success(`Solicitação aprovada! Senha temporária: ${data.tempPassword}`);
      loadAccessRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aprovar');
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    setProcessingRequest(true);
    try {
      const response = await fetch('/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          action: 'reject',
          rejection_reason: rejectionReason,
          reviewer_id: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao rejeitar solicitação');
      }

      toast.success('Solicitação rejeitada');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadAccessRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao rejeitar');
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleBulkApprove = async () => {
    if (accessRequests.length === 0) return;

    setBulkApproving(true);
    try {
      const response = await fetch('/api/approve-user/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_ids: accessRequests.map(r => r.id),
          reviewer_id: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao aprovar solicitações');
      }

      if (data.failCount > 0) {
        toast.success(`${data.successCount} aprovado(s), ${data.failCount} falha(s)`);
      } else {
        toast.success(`Todas as ${data.successCount} solicitações foram aprovadas!`);
      }

      // Mostrar senhas temporárias
      const successResults = data.results?.filter((r: { success: boolean }) => r.success) || [];
      if (successResults.length > 0) {
        console.log('Senhas temporárias:', successResults.map((r: { email: string; tempPassword: string }) =>
          `${r.email}: ${r.tempPassword}`
        ));
      }

      setShowBulkApproveModal(false);
      loadAccessRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aprovar');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const response = await fetch('/api/user/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          is_active: !user.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar status');
      }

      toast.success(user.is_active ? 'Usuário desativado' : 'Usuário ativado');
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro');
    }
  };

  const openDeleteModal = async (institution: Institution) => {
    setInstitutionToDelete(institution);
    setDeleteConfirmText('');
    setDeletePreview({ students: 0, occurrences: 0, classes: 0, teachers: 0, loading: true });
    setShowDeleteModal(true);

    // GOVERNANÇA: Carregar contagem real de dados antes de permitir exclusão
    try {
      const supabase = createClient();
      const [studentsRes, occurrencesRes, classesRes, teachersRes] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institution.id),
        supabase
          .from('occurrences')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institution.id)
          .is('deleted_at', null),
        supabase
          .from('classes')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institution.id),
        supabase
          .from('user_institutions')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', institution.id)
          .eq('role', 'professor'),
      ]);

      setDeletePreview({
        students: studentsRes.count || 0,
        occurrences: occurrencesRes.count || 0,
        classes: classesRes.count || 0,
        teachers: teachersRes.count || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading delete preview:', error);
      setDeletePreview(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteInstitution = async () => {
    if (!institutionToDelete) return;
    if (deleteConfirmText !== institutionToDelete.name) {
      toast.error('Digite o nome da instituição corretamente');
      return;
    }

    setDeletingInstitution(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', institutionToDelete.id);

      if (error) throw error;

      toast.success('Instituição e todos os dados relacionados foram excluídos');
      setShowDeleteModal(false);
      setInstitutionToDelete(null);
      setDeleteConfirmText('');
      loadInstitutions();
    } catch (error) {
      console.error('Error deleting institution:', error);
      toast.error('Erro ao excluir instituição');
    } finally {
      setDeletingInstitution(false);
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

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'admin_new':
        return 'Nova Instituição + Admin';
      case 'admin_existing':
        return 'Admin em Instituição Existente';
      case 'professor':
        return 'Professor';
      default:
        return type;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'admin_viewer': return 'secondary';
      case 'professor': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'admin_viewer': return 'Visualizador';
      case 'professor': return 'Professor';
      default: return role;
    }
  };

  // Filtered users with memoization
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filter by name
      if (filterName && !user.full_name.toLowerCase().includes(filterName.toLowerCase())) {
        return false;
      }

      // Filter by institution
      if (filterInstitution) {
        const hasInstitution = user.user_institutions?.some(ui =>
          ui.institution?.name?.toLowerCase().includes(filterInstitution.toLowerCase())
        );
        if (!hasInstitution && !user.is_master) return false;
      }

      // Filter by role
      if (filterRole) {
        if (filterRole === 'master') {
          if (!user.is_master) return false;
        } else {
          const hasRole = user.user_institutions?.some(ui => ui.role === filterRole);
          if (!hasRole) return false;
        }
      }

      return true;
    });
  }, [users, filterName, filterInstitution, filterRole]);

  const handleRoleChange = async () => {
    if (!roleChangeTarget || !newRole) return;

    const { user, userInstitution } = roleChangeTarget;

    if (newRole === userInstitution.role) {
      toast.error('Selecione uma função diferente da atual');
      return;
    }

    setChangingRole(true);
    try {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: userInstitution.institution.id,
          new_role: newRole,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message || 'Função alterada com sucesso!');
        setShowRoleModal(false);
        setRoleChangeTarget(null);
        setNewRole('');
        loadUsers();
      } else {
        toast.error(result.error || 'Erro ao alterar função');
      }
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Erro ao alterar função');
    } finally {
      setChangingRole(false);
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
      currentRole="master"
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel Master</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de acesso, usuários e instituições
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="requests" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Solicitações</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="institutions" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Instituições</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <ScrollText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Access Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Solicitações de Acesso</CardTitle>
                  <CardDescription>
                    {accessRequests.length} solicitação(ões) pendente(s)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {accessRequests.length > 1 && (
                    <Button
                      variant="default"
                      onClick={() => setShowBulkApproveModal(true)}
                      disabled={processingRequest}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Aprovar Todos
                    </Button>
                  )}
                  <Button variant="outline" size="icon" onClick={loadAccessRequests}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : accessRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma solicitação pendente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {accessRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{request.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {request.email}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {getRequestTypeLabel(request.request_type)}
                          </Badge>
                        </div>

                        {request.request_type === 'admin_new' && (
                          <div className="text-sm bg-muted p-2 rounded space-y-1">
                            <p><strong>Nova Instituição:</strong> {request.institution_name}</p>
                            {request.institution_full_address ? (
                              <p className="text-muted-foreground">{request.institution_full_address}</p>
                            ) : (
                              <p>{request.institution_city}/{request.institution_state}</p>
                            )}
                          </div>
                        )}

                        {request.institution && (
                          <p className="text-sm">
                            <strong>Instituição:</strong> {request.institution.name}
                          </p>
                        )}

                        {request.message && (
                          <p className="text-sm text-muted-foreground">
                            {request.message}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(request.created_at)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectModal(true);
                              }}
                              disabled={processingRequest}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request)}
                              disabled={processingRequest}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>
                    {filteredUsers.length} de {users.length} usuário(s)
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={loadUsers}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Filtrar por nome..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Filtrar por instituição..."
                      value={filterInstitution}
                      onChange={(e) => setFilterInstitution(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <option value="">Todas as funções</option>
                      <option value="master">Master</option>
                      <option value="admin">Administrador</option>
                      <option value="admin_viewer">Visualizador</option>
                      <option value="professor">Professor</option>
                    </Select>
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.is_master ? (
                              <Badge>Master</Badge>
                            ) : user.user_institutions?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.user_institutions.map((ui, idx) => (
                                  <Badge key={idx} variant={getRoleBadgeVariant(ui.role)}>
                                    {getRoleLabel(ui.role)} - {ui.institution?.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'success' : 'destructive'}>
                              {user.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!user.is_master && user.user_institutions?.map((ui, idx) => (
                                <Button
                                  key={idx}
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setRoleChangeTarget({ user, userInstitution: ui });
                                    setNewRole(ui.role);
                                    setShowRoleModal(true);
                                  }}
                                  title={`Alterar função em ${ui.institution?.name}`}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              ))}
                              {!user.is_master && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleUserStatus(user)}
                                  title={user.is_active ? 'Desativar' : 'Ativar'}
                                >
                                  <Power className="h-4 w-4" />
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
          </TabsContent>

          {/* Institutions Tab */}
          <TabsContent value="institutions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Instituições</CardTitle>
                  <CardDescription>
                    {institutions.length} instituição(ões) cadastrada(s)
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={loadInstitutions}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingInstitutions ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Cidade/UF</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Criada em</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {institutions.map((inst) => (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium">{inst.name}</TableCell>
                            <TableCell>
                              {inst.city}/{inst.state}
                            </TableCell>
                            <TableCell>
                              <Badge variant={inst.is_active ? 'success' : 'destructive'}>
                                {inst.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(inst.created_at)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteModal(inst)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Logs do Sistema</CardTitle>
                    <CardDescription>
                      {filteredLogs.length} registro(s) encontrado(s)
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={loadLogs}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Ação
                    </Label>
                    <Select
                      value={logFilterAction}
                      onChange={(e) => {
                        setLogFilterAction(e.target.value);
                        setLogPage(1);
                      }}
                    >
                      <option value="">Todas as ações</option>
                      {uniqueActions.map(action => (
                        <option key={action} value={action}>
                          {ACTION_LABELS[action] || action}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Instituição</Label>
                    <Select
                      value={logFilterInstitution}
                      onChange={(e) => {
                        setLogFilterInstitution(e.target.value);
                        setLogPage(1);
                      }}
                    >
                      <option value="">Todas as instituições</option>
                      {uniqueLogInstitutions.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select
                      value={logFilterPeriod}
                      onChange={(e) => {
                        setLogFilterPeriod(e.target.value);
                        loadLogs();
                      }}
                    >
                      <option value="7">Últimos 7 dias</option>
                      <option value="30">Últimos 30 dias</option>
                      <option value="90">Últimos 90 dias</option>
                      <option value="365">Último ano</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Por página</Label>
                    <Select
                      value={String(logItemsPerPage)}
                      onChange={(e) => {
                        setLogItemsPerPage(Number(e.target.value));
                        setLogPage(1);
                      }}
                    >
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum log encontrado com os filtros selecionados
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Entidade</TableHead>
                            <TableHead>Instituição</TableHead>
                            <TableHead className="w-[80px]">Detalhes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm whitespace-nowrap">
                                {formatDateTime(log.created_at)}
                              </TableCell>
                              <TableCell>
                                {(log as any).user?.full_name || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  log.action.includes('delete') ? 'destructive' :
                                  log.action.includes('create') ? 'success' :
                                  log.action.includes('update') ? 'warning' :
                                  'secondary'
                                }>
                                  {ACTION_LABELS[log.action] || log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">
                                {log.entity_type?.replace(/_/g, ' ') || '-'}
                              </TableCell>
                              <TableCell>
                                {(log as any).institution?.name || '-'}
                              </TableCell>
                              <TableCell>
                                {log.details && Object.keys(log.details).length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedLog(log);
                                      setShowLogDetailModal(true);
                                    }}
                                    title="Ver detalhes"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalLogPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {((logPage - 1) * logItemsPerPage) + 1} a {Math.min(logPage * logItemsPerPage, filteredLogs.length)} de {filteredLogs.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setLogPage(p => Math.max(1, p - 1))}
                            disabled={logPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Página {logPage} de {totalLogPages}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                            disabled={logPage === totalLogPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
          setRejectionReason('');
        }}
        title="Rejeitar Solicitação"
        description="Informe o motivo da rejeição (opcional)"
      >
        <div className="space-y-4">
          <div>
            <p className="font-medium">{selectedRequest?.full_name}</p>
            <p className="text-sm text-muted-foreground">{selectedRequest?.email}</p>
          </div>
          <Input
            placeholder="Motivo da rejeição (opcional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setSelectedRequest(null);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequest}
              disabled={processingRequest}
            >
              {processingRequest ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Rejeitando...
                </>
              ) : (
                'Rejeitar'
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Bulk Approve Modal */}
      <Modal
        isOpen={showBulkApproveModal}
        onClose={() => setShowBulkApproveModal(false)}
        title="Aprovar Todas as Solicitações"
        description={`Você está prestes a aprovar ${accessRequests.length} solicitação(ões) de uma vez.`}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Atenção</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Esta ação irá criar contas para todos os usuários listados abaixo.
                  As senhas temporárias serão exibidas no console do navegador.
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
            {accessRequests.map((request) => (
              <div key={request.id} className="p-2 text-sm">
                <p className="font-medium">{request.full_name}</p>
                <p className="text-muted-foreground">{request.email}</p>
              </div>
            ))}
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkApproveModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
            >
              {bulkApproving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Aprovar Todos ({accessRequests.length})
                </>
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Delete Institution Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setInstitutionToDelete(null);
          setDeleteConfirmText('');
        }}
        title="Excluir Instituição"
        description="Esta ação é irreversível e excluirá todos os dados relacionados."
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Ação Destrutiva</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Ao excluir a instituição <strong>{institutionToDelete?.name}</strong>,
                  os seguintes dados serão permanentemente removidos:
                </p>
                {deletePreview.loading ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Spinner size="sm" />
                    <span className="text-sm text-red-700 dark:text-red-300">Calculando...</span>
                  </div>
                ) : (
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-2 list-disc list-inside space-y-1">
                    <li><strong>{deletePreview.teachers}</strong> professor(es)</li>
                    <li><strong>{deletePreview.classes}</strong> turma(s)</li>
                    <li><strong>{deletePreview.students}</strong> aluno(s)</li>
                    <li><strong>{deletePreview.occurrences}</strong> ocorrência(s)</li>
                    <li>Todos os tipos de ocorrência e períodos acadêmicos</li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Digite o nome da instituição para confirmar:
            </label>
            <p className="text-sm text-muted-foreground mb-2">
              <code className="bg-muted px-1 rounded">{institutionToDelete?.name}</code>
            </p>
            <Input
              placeholder="Digite o nome exatamente como mostrado acima"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setInstitutionToDelete(null);
                setDeleteConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInstitution}
              disabled={deletingInstitution || deleteConfirmText !== institutionToDelete?.name}
            >
              {deletingInstitution ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Permanentemente
                </>
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setRoleChangeTarget(null);
          setNewRole('');
        }}
        title="Alterar Função do Usuário"
        description={roleChangeTarget ?
          `Alterar função de ${roleChangeTarget.user.full_name} em ${roleChangeTarget.userInstitution.institution?.name}` :
          ''
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Função Atual</Label>
            <div>
              <Badge variant={getRoleBadgeVariant(roleChangeTarget?.userInstitution.role || '')}>
                {getRoleLabel(roleChangeTarget?.userInstitution.role || '')}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newRole">Nova Função</Label>
            <Select
              id="newRole"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              disabled={changingRole}
            >
              <option value="professor">Professor</option>
              <option value="admin_viewer">Visualizador</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>

          {roleChangeTarget?.userInstitution.role === 'admin' && newRole !== 'admin' && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Atenção:</strong> Ao remover a função de Administrador, este usuário
              perderá acesso às funcionalidades de gestão.
            </div>
          )}

          {newRole === 'admin' && roleChangeTarget?.userInstitution.role !== 'admin' && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
              <strong>Atenção:</strong> Ao promover para Administrador, este usuário terá
              acesso completo à gestão da instituição.
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowRoleModal(false);
              setRoleChangeTarget(null);
              setNewRole('');
            }}
            disabled={changingRole}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRoleChange}
            disabled={changingRole || newRole === roleChangeTarget?.userInstitution.role}
          >
            {changingRole ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Alterando...
              </>
            ) : (
              'Confirmar Alteração'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Log Details Modal */}
      <Modal
        isOpen={showLogDetailModal}
        onClose={() => {
          setShowLogDetailModal(false);
          setSelectedLog(null);
        }}
        title="Detalhes do Log"
        description={selectedLog ? `${ACTION_LABELS[selectedLog.action] || selectedLog.action}` : ''}
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data/Hora</p>
                <p className="font-medium">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Usuário</p>
                <p className="font-medium">{(selectedLog as any).user?.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ação</p>
                <Badge variant={
                  selectedLog.action.includes('delete') ? 'destructive' :
                  selectedLog.action.includes('create') ? 'success' :
                  selectedLog.action.includes('update') ? 'warning' :
                  'secondary'
                }>
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Entidade</p>
                <p className="font-medium capitalize">{selectedLog.entity_type?.replace(/_/g, ' ') || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Instituição</p>
                <p className="font-medium">{(selectedLog as any).institution?.name || '-'}</p>
              </div>
            </div>

            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium mb-3">Detalhes da Alteração</p>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  {formatLogDetails(selectedLog.details)}
                </div>
              </div>
            )}

            <ModalFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowLogDetailModal(false);
                  setSelectedLog(null);
                }}
              >
                Fechar
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
