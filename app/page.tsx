'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FocusLogo } from '@/components/FocusLogo';
import { LoginForm } from '@/components/auth/LoginForm';
import { AccessRequestModal } from '@/components/auth/AccessRequestModal';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Check if user is already logged in (non-blocking - form renders immediately)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Primeiro verifica localStorage (instantaneo)
        const currentRole = getFromStorage('currentRole', null);
        if (currentRole) {
          // Redireciona imediatamente baseado no role salvo
          if (currentRole === 'master') {
            router.push('/master');
            return;
          } else if (currentRole === 'admin') {
            router.push('/admin');
            return;
          } else if (currentRole === 'admin_viewer') {
            router.push('/viewer');
            return;
          } else if (currentRole === 'professor') {
            router.push('/professor');
            return;
          }
        }

        // Verifica sessao Supabase em background (nao bloqueia UI)
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session && currentRole) {
          // Sessao existe e tem role - redireciona
          if (currentRole === 'master') {
            router.push('/master');
          } else if (currentRole === 'admin') {
            router.push('/admin');
          } else if (currentRole === 'admin_viewer') {
            router.push('/viewer');
          } else if (currentRole === 'professor') {
            router.push('/professor');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center text-primary-foreground">
          {/* Logo e títulos */}
          <div className="flex flex-col items-center mb-8">
            {/* Focus com logo posicionada à esquerda */}
            <div className="relative">
              <FocusLogo variant="white" size="lg" showText={false} className="absolute -left-16 top-1/2 -translate-y-1/2" />
              <span className="text-4xl font-bold">Focus</span>
            </div>
            {/* Sistema de Gestão Escolar abaixo, centralizado */}
            <span className="text-4xl font-bold">Sistema de Gestão Escolar</span>
          </div>
          <p className="text-lg text-primary-foreground/80">
            Gerencie ocorrências disciplinares, pedagógicas e administrativas
            de forma eficiente e organizada.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6 text-left">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Multi-Tenant</h3>
              <p className="text-sm text-primary-foreground/70">
                Cada instituição com seus próprios dados isolados
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Rastreamento</h3>
              <p className="text-sm text-primary-foreground/70">
                Histórico completo de ocorrências por aluno
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Relatórios</h3>
              <p className="text-sm text-primary-foreground/70">
                Exportação em PDF e Excel com filtros avançados
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-primary-foreground/70">
                Dashboards e gráficos para análise de dados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <div className="flex flex-col items-center">
              {/* Focus com logo posicionada à esquerda */}
              <div className="relative">
                <FocusLogo size="md" showText={false} className="absolute -left-12 top-1/2 -translate-y-1/2" />
                <span className="text-2xl font-bold text-[#2d3a5f]">Focus</span>
              </div>
              {/* Sistema de Gestão Escolar abaixo */}
              <span className="text-sm text-muted-foreground">Sistema de Gestão Escolar</span>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Entrar</CardTitle>
              <CardDescription>
                Entre com seu email e senha para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm
                onAccessRequest={() => setShowAccessRequest(true)}
                onForgotPassword={() => setShowForgotPassword(true)}
              />
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Access Request Modal */}
      <AccessRequestModal
        isOpen={showAccessRequest}
        onClose={() => setShowAccessRequest(false)}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
