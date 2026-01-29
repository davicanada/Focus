'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired' | 'success' | 'error'>('validating');
  const [error, setError] = useState('');

  // Password strength validation
  const passwordRequirements = [
    { label: 'Pelo menos 8 caracteres', met: password.length >= 8 },
    { label: 'Pelo menos uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Pelo menos uma letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Pelo menos um número', met: /[0-9]/.test(password) },
  ];

  const isPasswordStrong = passwordRequirements.every(req => req.met);
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStatus('invalid');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/reset-password?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setStatus('valid');
        } else if (data.expired) {
          setStatus('expired');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('invalid');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('A senha não atende aos requisitos mínimos');
      return;
    }

    if (!doPasswordsMatch) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha');
      }

      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isValidating) {
      return (
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Validando link...</p>
        </div>
      );
    }

    switch (status) {
      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Senha Redefinida!
            </h1>
            <p className="text-gray-600 mb-6">
              Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Ir para o Login
            </Button>
          </div>
        );

      case 'invalid':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Link Inválido
            </h1>
            <p className="text-gray-600 mb-6">
              Este link de redefinição de senha é inválido ou já foi utilizado.
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Voltar para o Login
              </Button>
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Link Expirado
            </h1>
            <p className="text-gray-600 mb-6">
              Este link de redefinição expirou. Por favor, solicite um novo link.
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Voltar para o Login
              </Button>
            </Link>
          </div>
        );

      case 'valid':
        return (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Criar Nova Senha
              </h1>
              <p className="text-gray-600">
                Digite sua nova senha abaixo
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua nova senha"
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

              {/* Password requirements */}
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {req.met ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      )}
                    </div>
                    <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-sm ${doPasswordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                    {doPasswordsMatch ? '✓ As senhas coincidem' : '✗ As senhas não coincidem'}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isPasswordStrong || !doPasswordsMatch}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
