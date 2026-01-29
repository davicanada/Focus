'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { User, Lock, ArrowLeft, LogOut } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ProgressLink } from '@/components/ProgressLink';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import type { User as UserType, Institution, UserInstitution, UserRole } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('professor');
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [userInstitutions, setUserInstitutions] = useState<(UserInstitution & { institution: Institution })[]>([]);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage<UserRole>('currentRole', 'professor');
      const user = getFromStorage<UserType | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);
      const userInst = getFromStorage<(UserInstitution & { institution: Institution })[]>('userInstitutions', []);

      if (!user) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentRole(role);
      setCurrentInstitution(institution);
      setUserInstitutions(userInst);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

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
      toast.error('As senhas nao conferem');
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

  const getBackLink = () => {
    switch (currentRole) {
      case 'master':
        return '/master';
      case 'admin':
        return '/admin';
      default:
        return '/professor';
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
      currentRole={currentRole}
      currentInstitution={currentInstitution || undefined}
      userInstitutions={userInstitutions}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ProgressLink href={getBackLink()}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </ProgressLink>
          <div>
            <h1 className="text-3xl font-bold">Configuracoes</h1>
            <p className="text-muted-foreground">
              Gerencie suas preferencias e seguranca
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informacoes do Perfil
              </CardTitle>
              <CardDescription>
                Seus dados de usuario
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
                <Input
                  value={
                    currentRole === 'master'
                      ? 'Master'
                      : currentRole === 'admin'
                      ? 'Administrador'
                      : 'Professor'
                  }
                  disabled
                />
              </div>
              {currentInstitution && (
                <div className="space-y-2">
                  <Label>Instituicao</Label>
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
                  placeholder="Minimo 6 caracteres"
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
        </div>

        {/* Session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Sessao
            </CardTitle>
            <CardDescription>
              Encerrar sessao atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleSignOut}>
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
