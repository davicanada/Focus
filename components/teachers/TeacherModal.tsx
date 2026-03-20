'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { isValidEmail } from '@/lib/utils';
import type { User } from '@/types';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  institutionId: string;
  teacher?: {
    id: string;
    user: User;
  } | null;
}

export function TeacherModal({
  isOpen,
  onClose,
  onSuccess,
  institutionId,
  teacher
}: TeacherModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('professor');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [inactiveUser, setInactiveUser] = useState<{
    id: string;
    full_name: string;
    email: string;
    old_role: string;
    deactivated_at: string;
  } | null>(null);

  const isEditing = !!teacher;

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.user.full_name);
      setEmail(teacher.user.email);
    } else {
      setFullName('');
      setEmail('');
      setRole('professor');
    }
    setEmailError('');
    setInactiveUser(null);
  }, [teacher, isOpen]);

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setRole('professor');
    setEmailError('');
    setInactiveUser(null);
    onClose();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    professor: 'Professor',
    admin_viewer: 'Visualizador',
  };

  const handleReactivate = async () => {
    if (!inactiveUser) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: inactiveUser.full_name,
          email: inactiveUser.email,
          institution_id: institutionId,
          role,
          reactivate: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao reativar');
      }

      toast.success('Usuário reativado com sucesso! Email de boas-vindas enviado.');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao reativar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Preencha o nome completo');
      return;
    }

    if (!isEditing) {
      if (!email.trim()) {
        toast.error('Preencha o email');
        return;
      }
      if (!isValidEmail(email)) {
        setEmailError('Email inválido');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isEditing && teacher) {
        // Atualizar
        const response = await fetch(`/api/teachers/${teacher.user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: fullName.trim() }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao atualizar');
        }

        toast.success('Usuário atualizado com sucesso');
      } else {
        // Criar
        const response = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            institution_id: institutionId,
            role,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao cadastrar');
        }

        // API detected an inactive user — show reactivation prompt
        if (data.status === 'inactive_found') {
          setInactiveUser(data.user);
          setIsLoading(false);
          return;
        }

        if (data.reactivated) {
          toast.success('Usuário reativado com sucesso! Email de boas-vindas enviado.');
        } else {
          toast.success('Usuário cadastrado! Email de boas-vindas enviado.');
        }
      }

      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={inactiveUser ? 'Usuário Inativo Encontrado' : isEditing ? 'Editar Usuário' : 'Adicionar Usuário'}
      description={inactiveUser ? 'Este email pertence a um usuário que foi desativado anteriormente' : isEditing ? 'Atualize os dados do usuário' : 'Preencha os dados para cadastrar um novo usuário'}
    >
      {inactiveUser ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              O usuário <strong>{inactiveUser.full_name}</strong> ({inactiveUser.email}) já foi cadastrado como <strong>{roleLabels[inactiveUser.old_role] || inactiveUser.old_role}</strong> e foi desativado em {new Date(inactiveUser.deactivated_at).toLocaleDateString('pt-BR')}.
            </p>
            <p className="text-sm text-amber-700">
              Deseja reativá-lo? Uma nova senha será gerada e enviada por email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reactivateRole">Função ao reativar *</Label>
            <select
              id="reactivateRole"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="professor">Professor</option>
              <option value="admin">Administrador</option>
              <option value="admin_viewer">Visualizador</option>
            </select>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleReactivate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Reativando...
                </>
              ) : (
                'Reativar Usuário'
              )}
            </Button>
          </ModalFooter>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo do usuário"
            disabled={isLoading}
            required
          />
        </div>

        {!isEditing && (
          <>
            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="professor">Professor</option>
                <option value="admin">Administrador</option>
                <option value="admin_viewer">Visualizador</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="email@exemplo.com"
                disabled={isLoading}
                required
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                O usuário receberá um email com instruções de acesso
              </p>
            </div>
          </>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {isEditing ? 'Salvando...' : 'Cadastrando...'}
              </>
            ) : (
              isEditing ? 'Salvar' : 'Cadastrar'
            )}
          </Button>
        </ModalFooter>
      </form>
      )}
    </Modal>
  );
}
