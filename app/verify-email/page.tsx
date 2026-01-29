'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle, XCircle, AlertCircle, Mail } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message');
  const name = searchParams.get('name');

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Email Verificado com Sucesso!
            </h1>
            <p className="text-gray-600 mb-6">
              {name ? `Olá ${name}, seu` : 'Seu'} email foi verificado. Sua solicitação de acesso foi enviada para análise.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-800">Próximos passos:</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Um administrador irá analisar sua solicitação</li>
                    <li>• Você receberá um email quando for aprovada</li>
                    <li>• Após aprovação, receberá suas credenciais de acesso</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'already_verified':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Email Já Verificado
            </h1>
            <p className="text-gray-600 mb-6">
              Este email já foi verificado anteriormente. Sua solicitação está em análise.
            </p>
          </div>
        );

      case 'already_processed':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Solicitação Já Processada
            </h1>
            <p className="text-gray-600 mb-6">
              Esta solicitação já foi processada. Verifique seu email para mais informações.
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Erro na Verificação
            </h1>
            <p className="text-gray-600 mb-6">
              {message || 'Não foi possível verificar seu email. O link pode estar expirado ou ser inválido.'}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                Se você acredita que isso é um erro, tente fazer uma nova solicitação de acesso.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-10 h-10 text-gray-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificação de Email
            </h1>
            <p className="text-gray-600 mb-6">
              Verifique seu email e clique no link de confirmação para continuar.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {renderContent()}

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para a Página Inicial
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
