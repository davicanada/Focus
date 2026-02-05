'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Settings, User, Lock, LogOut, MessageSquare, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import type { User as UserType, Institution } from '@/types';

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

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback action types
  const [actionTypes, setActionTypes] = useState<FeedbackActionType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<FeedbackActionType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', description: '', icon: 'MessageCircle' });
  const [savingType, setSavingType] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FeedbackActionType | null>(null);

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
      await loadActionTypes();
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadActionTypes = async () => {
    setLoadingTypes(true);
    try {
      const response = await fetch('/api/feedback-action-types');
      if (response.ok) {
        const data = await response.json();
        setActionTypes(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de ação:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar senha');
      }

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha');
    } finally {
      setSaving(false);
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

  const openAddTypeModal = () => {
    setEditingType(null);
    setTypeForm({ name: '', description: '', icon: 'MessageCircle' });
    setShowTypeModal(true);
  };

  const openEditTypeModal = (type: FeedbackActionType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      description: type.description || '',
      icon: type.icon,
    });
    setShowTypeModal(true);
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
      setShowTypeModal(false);
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas preferências e segurança
            </p>
          </div>
        </div>

        {/* Tipos de Ação de Devolutiva */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Tipos de Ação (Devolutivas)
              </CardTitle>
              <CardDescription>
                Configure os tipos de ação disponíveis para devolutivas
              </CardDescription>
            </div>
            <Button onClick={openAddTypeModal} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTypes ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : actionTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum tipo de ação cadastrado.</p>
                <p className="text-sm mt-2">
                  Execute a migration para criar os tipos padrão ou adicione manualmente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {actionTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      type.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                    }`}
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
                    <div className="flex items-center gap-2">
                      {!type.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(type)}
                        title={type.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {type.is_active ? (
                          <span className="h-4 w-4 rounded-full bg-green-500" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-gray-300" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTypeModal(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(type)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
            <CardDescription>
              Seus dados de usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={currentUser?.full_name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={currentUser?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Papel Atual</Label>
              <Input value="Administrador" disabled />
            </div>
            {currentInstitution && (
              <div className="space-y-2">
                <Label>Instituição</Label>
                <Input value={currentInstitution.name} disabled />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </CardContent>
        </Card>

          {/* Session */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Sessão
              </CardTitle>
              <CardDescription>
                Encerrar sessão atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleSignOut}>
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para adicionar/editar tipo de ação */}
      <Modal
        isOpen={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title={editingType ? 'Editar Tipo de Ação' : 'Adicionar Tipo de Ação'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type_name">Nome *</Label>
            <Input
              id="type_name"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="Ex: Conversa com aluno"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type_description">Descrição</Label>
            <Textarea
              id="type_description"
              value={typeForm.description}
              onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              placeholder="Descreva quando usar este tipo de ação..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type_icon">Ícone</Label>
            <Select
              id="type_icon"
              value={typeForm.icon}
              onChange={(e) => setTypeForm({ ...typeForm, icon: e.target.value })}
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowTypeModal(false)} disabled={savingType}>
              Cancelar
            </Button>
            <Button onClick={handleSaveType} disabled={savingType}>
              {savingType ? (
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

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir Tipo de Ação"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p>
            Tem certeza que deseja excluir o tipo de ação <strong>{deleteConfirm?.name}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            Se existirem devolutivas usando este tipo, ele será apenas desativado em vez de excluído.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteType}>
              Excluir
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
