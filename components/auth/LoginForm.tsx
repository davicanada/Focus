'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { setToStorage } from '@/lib/utils';
import type { UserRole } from '@/types';

interface LoginFormProps {
  onAccessRequest: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onAccessRequest, onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error('Email ou senha incorretos');
      }

      // 2. Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('Usuário não encontrado');
      }

      // 3. Check if user is active
      if (!userData.is_active) {
        await supabase.auth.signOut();
        throw new Error('Sua conta está desativada. Entre em contato com o administrador.');
      }

      // 4. Check if user is master
      if (userData.is_master) {
        setToStorage('currentRole', 'master');
        setToStorage('currentUser', userData);
        router.push('/master');
        return;
      }

      // 5. Get user institutions and roles
      const { data: userInstitutions, error: uiError } = await supabase
        .from('user_institutions')
        .select(`
          *,
          institution:institutions(*)
        `)
        .eq('user_id', authData.user.id)
        .eq('is_active', true);

      if (uiError || !userInstitutions || userInstitutions.length === 0) {
        await supabase.auth.signOut();
        throw new Error('Você não tem acesso a nenhuma instituição');
      }

      // 6. Determine the highest priority role (admin > admin_viewer > professor)
      const hasAdminRole = userInstitutions.some((ui: { role: string }) => ui.role === 'admin');
      const hasViewerRole = userInstitutions.some((ui: { role: string }) => ui.role === 'admin_viewer');
      const currentRole: UserRole = hasAdminRole ? 'admin' : hasViewerRole ? 'admin_viewer' : 'professor';

      // 7. Select the first institution for this role
      const currentUserInstitution = userInstitutions.find((ui: { role: string }) => ui.role === currentRole);
      const currentInstitution = currentUserInstitution?.institution;

      // 8. Store session data
      setToStorage('currentRole', currentRole);
      setToStorage('currentUser', userData);
      setToStorage('currentInstitution', currentInstitution);
      setToStorage('userInstitutions', userInstitutions);

      // 9. Redirect based on role
      toast.success(`Bem-vindo, ${userData.full_name}!`);
      router.push(
        currentRole === 'admin' ? '/admin' :
        currentRole === 'admin_viewer' ? '/viewer' :
        '/professor'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>

      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={onAccessRequest}
          className="text-sm text-primary hover:underline block w-full"
        >
          Solicitar acesso
        </button>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
        >
          Esqueci minha senha
        </button>
      </div>
    </form>
  );
}
