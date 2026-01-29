'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage } from '@/lib/utils';
import type { User, Institution } from '@/types';
import { AlertNotifications } from '@/components/admin/alerts/AlertNotifications';
import { AlertRules } from '@/components/admin/alerts/AlertRules';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AlertasPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Central de Alertas
          </h1>
          <p className="text-muted-foreground">
            Gerencie notificacoes e regras de monitoramento
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificacoes
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Regras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <AlertNotifications />
          </TabsContent>

          <TabsContent value="rules">
            <AlertRules />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
