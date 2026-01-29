'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, FileSpreadsheet, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ProgressLink } from '@/components/ProgressLink';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import type { User as UserType, Institution } from '@/types';

const reportTypes = [
  {
    id: 'periodo',
    title: 'Relatório por Período',
    description: 'Ideal para reuniões de professores. Lista todas as turmas em ordem alfabética, com os alunos e suas respectivas ocorrências.',
    icon: Calendar,
    color: 'bg-primary/10 text-primary',
    features: [
      'Turmas ordenadas alfabeticamente',
      'Alunos ordenados dentro de cada turma',
      'Ocorrências com descrições completas',
      'Filtro por período de datas',
    ],
  },
  {
    id: 'aluno',
    title: 'Relatório por Aluno',
    description: 'Histórico completo de ocorrências de um aluno específico. Selecione a turma e depois o aluno.',
    icon: User,
    color: 'bg-green-100 text-green-700',
    features: [
      'Selecione a turma primeiro',
      'Depois selecione o aluno',
      'Histórico completo de ocorrências',
      'Ideal para acompanhamento individual',
    ],
  },
];

export default function ViewerRelatoriosPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<UserType | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (role !== 'admin_viewer' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      setIsLoading(false);
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
      currentRole="admin_viewer"
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Selecione o tipo de relatório que deseja gerar
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <ProgressLink
                key={report.id}
                href={`/viewer/relatorios/${report.id}`}
              >
                <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg p-3 ${report.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-sm">
                      {report.description}
                    </CardDescription>
                    <ul className="space-y-2">
                      {report.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </ProgressLink>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formatos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="text-sm">Excel (.xlsx)</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                <span className="text-sm">PDF</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
