'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ExternalLink, Copy, RefreshCw, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import type { User, Institution } from '@/types';

interface MigrationStatus {
  columnsExist: boolean;
  loading: boolean;
  error: string | null;
}

const MIGRATION_SQL = `-- Executar no Supabase SQL Editor
-- Link: https://supabase.com/dashboard/project/jtxfqsojicjtabtslqvf/sql/new

-- 1. Adicionar campos de soft delete em occurrences
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE occurrences ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- 2. Adicionar soft delete em alert_rules
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_occurrences_active
ON occurrences (institution_id, deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_occurrences_student_active
ON occurrences (student_id, deleted_at)
WHERE deleted_at IS NULL;`;

export default function SetupPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [status, setStatus] = useState<MigrationStatus>({
    columnsExist: false,
    loading: true,
    error: null
  });

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
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    removeFromStorage('currentRole');
    removeFromStorage('currentUser');
    removeFromStorage('currentInstitution');
    removeFromStorage('userInstitutions');
    router.push('/');
  };

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/setup/add-soft-delete-columns');
      const data = await response.json();

      if (data.success) {
        setStatus({
          columnsExist: data.columnsExist,
          loading: false,
          error: null
        });
      } else {
        setStatus({
          columnsExist: false,
          loading: false,
          error: data.error || data.message
        });
      }
    } catch {
      setStatus({
        columnsExist: false,
        loading: false,
        error: 'Erro ao verificar status'
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(MIGRATION_SQL);
    toast.success('SQL copiado para a area de transferencia!');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/jtxfqsojicjtabtslqvf/sql/new', '_blank');
  };

  return (
    <DashboardLayout
      userName={currentUser?.full_name || ''}
      userEmail={currentUser?.email || ''}
      currentRole="admin"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setup do Sistema</h1>
          <p className="text-gray-600 mt-1">
            Configuracoes e migrations do banco de dados
          </p>
        </div>

        {/* Status da Migration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Governanca de Dados - Soft Delete
            </CardTitle>
            <CardDescription>
              Migration para adicionar campos de soft delete em occurrences e alert_rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
              {status.loading ? (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-gray-600">Verificando status...</span>
                </>
              ) : status.columnsExist ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-green-700 font-medium">
                    Migration ja aplicada! Colunas deleted_at e deleted_by existem.
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-700 font-medium">
                    Migration pendente. Execute o SQL abaixo no Supabase.
                  </span>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={checkStatus}
                disabled={status.loading}
                className="ml-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${status.loading ? 'animate-spin' : ''}`} />
                Verificar
              </Button>
            </div>

            {/* SQL Box - only show if migration is pending */}
            {!status.columnsExist && !status.loading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    SQL para executar:
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                    <Button variant="default" size="sm" onClick={openSupabase}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir Supabase SQL Editor
                    </Button>
                  </div>
                </div>

                <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                  {MIGRATION_SQL}
                </pre>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Instrucoes:</h4>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>Clique em &quot;Abrir Supabase SQL Editor&quot;</li>
                    <li>Cole o SQL (ou clique em &quot;Copiar&quot; primeiro)</li>
                    <li>Clique em &quot;Run&quot; para executar</li>
                    <li>Volte aqui e clique em &quot;Verificar&quot; para confirmar</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Error message */}
            {status.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                Erro: {status.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info sobre o que a migration faz */}
        <Card>
          <CardHeader>
            <CardTitle>O que esta migration faz?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Soft Delete em Ocorrencias:</strong> Adiciona as colunas <code>deleted_at</code> e <code>deleted_by</code>
              na tabela <code>occurrences</code>, permitindo desativar ocorrencias sem perder o historico.
            </p>
            <p>
              <strong>Soft Delete em Regras de Alerta:</strong> Adiciona <code>deleted_at</code> na tabela <code>alert_rules</code>
              para consistencia com o padrao de soft delete.
            </p>
            <p>
              <strong>Indices de Performance:</strong> Cria indices parciais para otimizar queries que filtram apenas registros ativos
              (onde <code>deleted_at IS NULL</code>).
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
