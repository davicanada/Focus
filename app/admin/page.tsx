'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, formatDateTime, formatDate } from '@/lib/utils';
import type { User, Institution, UserInstitution } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [userInstitutions, setUserInstitutions] = useState<(UserInstitution & { institution: Institution })[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalOccurrences: 0,
    occurrencesThisMonth: 0,
    graveOccurrences: 0,
  });
  const [recentOccurrences, setRecentOccurrences] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const role = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);
      const userInst = getFromStorage<(UserInstitution & { institution: Institution })[]>('userInstitutions', []);

      if (role !== 'admin' || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);
      setUserInstitutions(userInst);
      await loadDashboardData(institution.id);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  // Refresh data when tab gains focus (ensures data is up-to-date after edits in other tabs)
  useEffect(() => {
    const handleFocus = () => {
      if (currentInstitution?.id && !isLoading) {
        loadDashboardData(currentInstitution.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentInstitution?.id, isLoading]);

  const loadDashboardData = async (institutionId: string) => {
    try {
      const supabase = createClient();

      // Data para filtro do mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthISO = startOfMonth.toISOString();

      // Todas as queries via browser client (dados sempre frescos)
      const [studentsRes, classesRes, teachersRes, occurrencesRes, monthRes, graveRes, recentRes] = await Promise.all([
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('is_active', true)
          .is('deleted_at', null),
        supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('is_active', true)
          .is('deleted_at', null),
        supabase
          .from('user_institutions')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .eq('role', 'professor')
          .eq('is_active', true),
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null),
        supabase
          .from('occurrences')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .gte('occurrence_date', startOfMonthISO),
        supabase
          .from('occurrences')
          .select(`
            *,
            occurrence_type:occurrence_types!inner(severity)
          `, { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .eq('occurrence_types.severity', 'grave')
          .gte('occurrence_date', startOfMonthISO),
        supabase
          .from('occurrences')
          .select(`
            *,
            student:students(full_name, class_id),
            occurrence_type:occurrence_types(category, severity),
            registered_by_user:users!occurrences_registered_by_fkey(full_name),
            class_at_occurrence:classes!occurrences_class_id_at_occurrence_fkey(name)
          `)
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .order('occurrence_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalClasses: classesRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalOccurrences: occurrencesRes.count || 0,
        occurrencesThisMonth: monthRes.count || 0,
        graveOccurrences: graveRes.count || 0,
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
    if (newInstitution) {
      setCurrentInstitution(newInstitution.institution);
      setToStorage('currentInstitution', newInstitution.institution);
      loadDashboardData(institutionId);
    }
  };

  const setToStorage = (key: string, value: unknown) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
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
      currentRole="admin"
      currentInstitution={currentInstitution || undefined}
      userInstitutions={userInstitutions}
      onSignOut={handleSignOut}
      onSwitchInstitution={handleSwitchInstitution}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Visão Geral</h1>
          <p className="text-muted-foreground">
            Resumo de {currentInstitution?.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Alunos"
            value={stats.totalStudents}
            icon={GraduationCap}
          />
          <StatCard
            title="Turmas Ativas"
            value={stats.totalClasses}
            icon={BookOpen}
          />
          <StatCard
            title="Professores"
            value={stats.totalTeachers}
            icon={Users}
          />
          <StatCard
            title="Ocorrências (Mês)"
            value={stats.occurrencesThisMonth}
            icon={ClipboardList}
            description={`${stats.graveOccurrences} graves`}
          />
        </div>

        {/* Alert for grave occurrences */}
        {stats.graveOccurrences > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {stats.graveOccurrences} ocorrência(s) grave(s) este mês
                </p>
                <p className="text-sm text-muted-foreground">
                  Verifique o painel de analytics para mais detalhes
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickActionCard
              title="Ver Analytics"
              description="Gráficos e análises detalhadas"
              icon={BarChart3}
              href="/admin/analytics"
            />
            <QuickActionCard
              title="Nova Turma"
              description="Cadastrar uma nova turma"
              icon={BookOpen}
              href="/admin/turmas"
            />
            <QuickActionCard
              title="Novo Aluno"
              description="Cadastrar um novo aluno"
              icon={GraduationCap}
              href="/admin/alunos"
            />
            <QuickActionCard
              title="Gerar Relatório"
              description="Exportar dados em PDF ou Excel"
              icon={FileSpreadsheet}
              href="/admin/relatorios"
            />
          </div>
        </div>

        {/* Recent Occurrences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Últimas Dez Ocorrências
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOccurrences.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma ocorrencia registrada
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
                        Ocorreu em {formatDateTime(occurrence.occurrence_date)} • Registrado por {occurrence.registered_by_user?.full_name}
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
