'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { cn, getAdminMode, setAdminMode, type AdminMode } from '@/lib/utils';
import type { UserRole, Institution, UserInstitution } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  currentRole: UserRole;
  currentInstitution?: Institution;
  userInstitutions?: (UserInstitution & { institution: Institution })[];
  onSignOut: () => void;
  onSwitchInstitution?: (institutionId: string) => void;
  onSwitchRole?: (role: UserRole) => void;
  selectedShift?: string | null;
  onChangeShift?: () => void;
}

export function DashboardLayout({
  children,
  userName,
  userEmail,
  currentRole,
  currentInstitution,
  userInstitutions = [],
  onSignOut,
  onSwitchInstitution,
  onSwitchRole,
  selectedShift,
  onChangeShift,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminMode, setAdminModeState] = useState<AdminMode>('admin');

  // Load admin mode from localStorage on mount
  useEffect(() => {
    if (currentRole === 'admin') {
      const savedMode = getAdminMode();
      setAdminModeState(savedMode);
    }
  }, [currentRole]);

  // Handle admin mode change
  const handleAdminModeChange = (mode: AdminMode) => {
    setAdminModeState(mode);
    setAdminMode(mode);
  };

  // Determine if BottomNav should be shown (professor OR admin in professor mode)
  const showBottomNav = currentRole === 'professor' || (currentRole === 'admin' && adminMode === 'professor');

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar - hidden on mobile if professor */}
      <Sidebar
        role={currentRole}
        institutionName={currentInstitution?.name}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        hasMultipleInstitutions={userInstitutions.filter(ui => ui.is_active).length > 1}
        adminMode={adminMode}
        onAdminModeChange={handleAdminModeChange}
      />

      {/* Main Content - pl-0 on mobile, pl-64/pl-16 on md+ based on sidebar */}
      {/* pb-20 on mobile if showing bottom nav */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "pl-0 md:pl-16" : "pl-0 md:pl-64", // Responsive to sidebar collapse
        showBottomNav && "pb-20 md:pb-6" // Mobile: padded for bottom nav
      )}>
        {/* Top Bar */}
        <TopBar
          userName={userName}
          userEmail={userEmail}
          currentRole={currentRole}
          currentInstitution={currentInstitution}
          userInstitutions={userInstitutions}
          onSignOut={onSignOut}
          onSwitchInstitution={onSwitchInstitution}
          onSwitchRole={onSwitchRole}
          onMenuClick={() => setSidebarOpen(true)}
          selectedShift={selectedShift}
          onChangeShift={onChangeShift}
        />

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Bottom Nav - Mobile only, Professor OR Admin in professor mode */}
      {showBottomNav && <BottomNav role={currentRole} adminMode={adminMode} />}
    </div>
  );
}
