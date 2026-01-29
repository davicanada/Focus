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
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isEditing = !!teacher;

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.user.full_name);
      setEmail(teacher.user.email);
    } else {
      setFullName('');
      setEmail('');
    }
    setEmailError('');
  }, [teacher, isOpen]);

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setEmailError('');
    onClose();
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

        toast.success('Professor atualizado com sucesso');
      } else {
        // Criar
        const response = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            institution_id: institutionId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao cadastrar');
        }

        toast.success('Professor cadastrado! Email de boas-vindas enviado.');
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
      title={isEditing ? 'Editar Professor' : 'Adicionar Professor'}
      description={isEditing ? 'Atualize os dados do professor' : 'Preencha os dados para cadastrar um novo professor'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo do professor"
            disabled={isLoading}
            required
          />
        </div>

        {!isEditing && (
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
              O professor receberá um email com instruções de acesso
            </p>
          </div>
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
    </Modal>
  );
}
