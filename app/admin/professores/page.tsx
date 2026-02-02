'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Users, RefreshCcw, Power, Mail, Plus, Clock, Check, X, CheckCheck, UserCog, UserCheck, Eye, EyeOff } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDate } from '@/lib/utils';
import { TeacherModal } from '@/components/teachers/TeacherModal';
import type { User, Institution } from '@/types';

interface AccessRequest {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  request_type: string;
  status: string;
  created_at: string;
  email_verified: boolean;
}

interface TeacherWithUser {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user: User;
}

export default function ProfessoresPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Data
  const [teachers, setTeachers] = useState<TeacherWithUser[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);

  // Inactive users toggle
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);

  // Role change modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<TeacherWithUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [changingRole, setChangingRole] = useState(false);

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
      await Promise.all([
        loadTeachers(institution.id),
        loadPendingRequests(institution.id)
      ]);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadPendingRequests = async (institutionId: string) => {
    setLoadingRequests(true);
    try {
      const response = await fetch(`/api/access-request?institution_id=${institutionId}&status=pending`);
      const result = await response.json();
      if (result.data) {
        // Filter professor and admin_existing requests with verified email
        const validRequests = result.data.filter(
          (r: AccessRequest) =>
            (r.request_type === 'professor' || r.request_type === 'admin_existing') &&
            r.email_verified
        );
        setPendingRequests(validRequests);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadTeachers = async (institutionId: string, includeInactive = false) => {
    setLoadingTeachers(true);
    try {
      // Usar API com service client para bypassa RLS - incluir todos os roles
      const params = new URLSearchParams({ institution_id: institutionId, include_all_roles: 'true' });
      if (includeInactive) params.set('include_inactive', 'true');
      const response = await fetch(`/api/teachers?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar professores');
      }

      setTeachers(result.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Erro ao carregar professores');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!currentUser) return;

    setApprovingId(requestId);
    try {
      const response = await fetch('/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action: 'approve',
          reviewer_id: currentUser.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Professor aprovado com sucesso! Email de boas-vindas enviado.');
        await Promise.all([
          loadTeachers(currentInstitution!.id),
          loadPendingRequests(currentInstitution!.id)
        ]);
      } else {
        toast.error(result.error || 'Erro ao aprovar solicitação');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erro ao aprovar solicitação');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!currentUser) return;

    const reason = prompt('Motivo da rejeição (opcional):');

    setRejectingId(requestId);
    try {
      const response = await fetch('/api/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action: 'reject',
          reviewer_id: currentUser.id,
          rejection_reason: reason || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Solicitação rejeitada');
        await loadPendingRequests(currentInstitution!.id);
      } else {
        toast.error(result.error || 'Erro ao rejeitar solicitação');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setRejectingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (!currentUser || pendingRequests.length === 0) return;

    if (!confirm(`Tem certeza que deseja aprovar todas as ${pendingRequests.length} solicitações?`)) {
      return;
    }

    setApprovingAll(true);
    let approved = 0;
    let failed = 0;

    for (const request of pendingRequests) {
      try {
        const response = await fetch('/api/approve-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: request.id,
            action: 'approve',
            reviewer_id: currentUser.id,
          }),
        });

        const result = await response.json();
        if (result.success) {
          approved++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    if (approved > 0) {
      toast.success(`${approved} professor(es) aprovado(s) com sucesso!`);
    }
    if (failed > 0) {
      toast.error(`${failed} solicitação(ões) falharam`);
    }

    await Promise.all([
      loadTeachers(currentInstitution!.id),
      loadPendingRequests(currentInstitution!.id)
    ]);
    setApprovingAll(false);
  };

  const handleToggleStatus = async (teacher: TeacherWithUser) => {
    try {
      const endpoint = teacher.is_active ? 'deactivate' : 'reactivate';
      const response = await fetch(`/api/users/${teacher.user_id}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Desativado pelo admin' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao alterar status');
      }

      toast.success(teacher.is_active ? 'Usuário desativado' : 'Usuário reativado');
      loadTeachers(currentInstitution!.id, showInactive);
    } catch (error: any) {
      console.error('Error toggling teacher status:', error);
      toast.error(error.message || 'Erro ao alterar status');
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

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleModalSuccess = () => {
    loadTeachers(currentInstitution!.id);
  };

  const handleOpenRoleModal = (teacher: TeacherWithUser) => {
    setRoleChangeTarget(teacher);
    setNewRole(teacher.role);
    setShowRoleModal(true);
  };

  const handleCloseRoleModal = () => {
    setRoleChangeTarget(null);
    setNewRole('');
    setShowRoleModal(false);
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget || !currentInstitution || !newRole) return;
    if (newRole === roleChangeTarget.role) {
      toast.error('Selecione uma função diferente da atual');
      return;
    }

    setChangingRole(true);
    try {
      const response = await fetch(`/api/users/${roleChangeTarget.user_id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: currentInstitution.id,
          new_role: newRole,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message || 'Função alterada com sucesso!');
        handleCloseRoleModal();
        loadTeachers(currentInstitution.id);
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
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários vinculados à instituição
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Usuário
          </Button>
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <Clock className="h-5 w-5" />
                  Solicitações Pendentes
                  <Badge variant="warning" className="ml-2">
                    {pendingRequests.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Professores aguardando aprovação para acessar a instituição
                </CardDescription>
              </div>
              {pendingRequests.length > 1 && (
                <Button
                  onClick={handleApproveAll}
                  disabled={approvingAll}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approvingAll ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Aprovar Todas
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Data da Solicitação</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {request.full_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {request.email}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveRequest(request.id)}
                                  disabled={approvingId === request.id || rejectingId === request.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {approvingId === request.id ? (
                                    <Spinner className="h-4 w-4" />
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4 mr-1" />
                                      Aprovar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectRequest(request.id)}
                                  disabled={approvingId === request.id || rejectingId === request.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  {rejectingId === request.id ? (
                                    <Spinner className="h-4 w-4" />
                                  ) : (
                                    <>
                                      <X className="h-4 w-4 mr-1" />
                                      Rejeitar
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
          )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Usuários
              </CardTitle>
              <CardDescription>
                {teachers.length} usuário(s) cadastrado(s)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showInactive ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const next = !showInactive;
                  setShowInactive(next);
                  loadTeachers(currentInstitution!.id, next);
                }}
              >
                {showInactive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
              </Button>
              <Button variant="outline" size="icon" onClick={() => loadTeachers(currentInstitution!.id, showInactive)}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTeachers ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Usuários são adicionados através de solicitações de acesso ou cadastro direto
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((teacher) => {
                      const isSelf = teacher.user_id === currentUser?.id;
                      return (
                        <TableRow key={teacher.id} className={!teacher.is_active ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          {teacher.user?.full_name}
                          {!teacher.is_active && <span className="text-muted-foreground"> (desativado)</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {teacher.user?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(teacher.role)}>
                            {getRoleLabel(teacher.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(teacher.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={teacher.is_active ? 'success' : 'secondary'}>
                            {teacher.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {teacher.is_active && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenRoleModal(teacher)}
                                  title="Alterar Função"
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                                {!isSelf && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleStatus(teacher)}
                                    title="Desativar"
                                  >
                                    <Power className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </>
                            )}
                            {!teacher.is_active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(teacher)}
                                title="Reativar"
                              >
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-muted p-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Como adicionar usuários?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Opção 1:</strong> Clique em &quot;Adicionar Usuário&quot; e cadastre diretamente.
                  O usuário receberá um email com as credenciais de acesso.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Opção 2:</strong> Usuários podem solicitar acesso na tela de login.
                  O administrador poderá aprovar a solicitação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Cadastro */}
      <TeacherModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        institutionId={currentInstitution?.id || ''}
      />

      {/* Modal de Alteração de Função */}
      <Modal
        isOpen={showRoleModal}
        onClose={handleCloseRoleModal}
        title="Alterar Função do Usuário"
        description={roleChangeTarget ? `Alterar função de ${roleChangeTarget.user?.full_name}` : ''}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Função Atual</Label>
            <div>
              <Badge variant={getRoleBadgeVariant(roleChangeTarget?.role || '')}>
                {getRoleLabel(roleChangeTarget?.role || '')}
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

          {roleChangeTarget?.role === 'admin' && newRole !== 'admin' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <strong>Atenção:</strong> Ao remover a função de Administrador, este usuário
              perderá acesso às funcionalidades de gestão (turmas, alunos, tipos de ocorrência, etc.).
            </div>
          )}

          {newRole === 'admin' && roleChangeTarget?.role !== 'admin' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <strong>Atenção:</strong> Ao promover para Administrador, este usuário terá
              acesso completo à gestão da instituição.
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={handleCloseRoleModal}
            disabled={changingRole}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRoleChange}
            disabled={changingRole || newRole === roleChangeTarget?.role}
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
    </DashboardLayout>
  );
}
