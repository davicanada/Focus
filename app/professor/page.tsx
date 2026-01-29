'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, List, ClipboardList, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDateTime } from '@/lib/utils';
import type { User, Institution, UserInstitution } from '@/types';

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [userInstitutions, setUserInstitutions] = useState<(UserInstitution & { institution: Institution })[]>([]);

  // Stats
  const [stats, setStats] = useState({
    myOccurrencesTotal: 0,
    myOccurrencesThisMonth: 0,
    studentsCount: 0,
  });
  const [recentOccurrences, setRecentOccurrences] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);
      const userInst = getFromStorage<(UserInstitution & { institution: Institution })[]>('userInstitutions', []);

      if (role !== 'professor' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      setUserInstitutions(userInst);
      await loadDashboardData(institution.id, user.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // Refresh data when tab gains focus (ensures data is up-to-date after edits in other tabs)
  useEffect(() => {
    const handleFocus = () => {
      if (currentInstitution?.id && currentUser?.id && !isLoading) {
        loadDashboardData(currentInstitution.id, currentUser.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentInstitution?.id, currentUser?.id, isLoading]);

  const loadDashboardData = async (institutionId: string, userId: string) => {
    try {
      const supabase = createClient();

      // Data para filtro do mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthISO = startOfMonth.toISOString();

      // Executar todas as queries em paralelo para melhor performance
      const [totalRes, monthRes, studentsRes, recentRes] = await Promise.all([
        // My total occurrences
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('registered_by', userId),
        // My occurrences this month
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('registered_by', userId)
          .gte('occurrence_date', startOfMonthISO),
        // Students count
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('is_active', true)
          .is('deleted_at', null),
        // Recent occurrences (my last 10)
        supabase
          .from('occurrences')
          .select(`
            *,
            student:students(full_name),
            occurrence_type:occurrence_types(category, severity),
            class_at_occurrence:classes!occurrences_class_id_at_occurrence_fkey(name)
          `)
          .eq('institution_id', institutionId)
          .eq('registered_by', userId)
          .is('deleted_at', null)
          .order('occurrence_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setStats({
        myOccurrencesTotal: totalRes.count || 0,
        myOccurrencesThisMonth: monthRes.count || 0,
        studentsCount: studentsRes.count || 0,
      });

      setRecentOccurrences(recentRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const handleSwitchInstitution = (institutionId: string) => {
    const newInstitution = userInstitutions.find(ui => ui.institution_id === institutionId);
    if (newInstitution && currentUser) {
      setCurrentInstitution(newInstitution.institution);
      localStorage.setItem('currentInstitution', JSON.stringify(newInstitution.institution));
      loadDashboardData(institutionId, currentUser.id);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'grave':
        return <Badge variant="destructive">Grave</Badge>;
      case 'media':
        return <Badge variant="warning">Media</Badge>;
      default:
        return <Badge variant="mild">Leve</Badge>;
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
      currentRole="professor"
      currentInstitution={currentInstitution || undefined}
      userInstitutions={userInstitutions}
      onSignOut={handleSignOut}
      onSwitchInstitution={handleSwitchInstitution}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bem-vindo, {currentUser?.full_name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">
            {currentInstitution?.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Minhas Ocorrências (Total)"
            value={stats.myOccurrencesTotal}
            icon={ClipboardList}
          />
          <StatCard
            title="Ocorrências Este Mês"
            value={stats.myOccurrencesThisMonth}
            icon={TrendingUp}
          />
          <StatCard
            title="Alunos na Instituição"
            value={stats.studentsCount}
            icon={List}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <QuickActionCard
              title="Registrar Ocorrência"
              description="Registrar uma nova ocorrência para um ou mais alunos"
              icon={PlusCircle}
              href="/professor/registrar"
              variant="primary"
            />
            <QuickActionCard
              title="Minhas Ocorrências"
              description="Ver todas as ocorrências que registrei"
              icon={List}
              href="/professor/ocorrencias"
            />
          </div>
        </div>

        {/* Recent Occurrences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Minhas Últimas Dez Ocorrências
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOccurrences.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Você ainda não registrou nenhuma ocorrência
              </p>
            ) : (
              <div className="space-y-4">
                {recentOccurrences.map((occurrence) => (
                  <div
                    key={occurrence.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        {occurrence.student?.full_name}
                        {occurrence.class_at_occurrence?.name && (
                          <span className="text-muted-foreground font-normal"> - {occurrence.class_at_occurrence.name}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {occurrence.occurrence_type?.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ocorreu em {formatDateTime(occurrence.occurrence_date)}
                      </p>
                    </div>
                    {getSeverityBadge(occurrence.occurrence_type?.severity)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
