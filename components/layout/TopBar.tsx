'use client';

import { useState } from 'react';
import {
  LogOut,
  ChevronDown,
  Building2,
  RefreshCcw,
  Menu,
  Clock,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { UserRole, Institution, UserInstitution } from '@/types';

interface TopBarProps {
  userName: string;
  userEmail: string;
  currentRole: UserRole;
  currentInstitution?: Institution;
  userInstitutions?: (UserInstitution & { institution: Institution })[];
  onSignOut: () => void;
  onSwitchInstitution?: (institutionId: string) => void;
  onSwitchRole?: (role: UserRole) => void;
  onMenuClick?: () => void;
  selectedShift?: string | null;
  onChangeShift?: () => void;
}

export function TopBar({
  userName,
  userEmail,
  currentRole,
  currentInstitution,
  userInstitutions = [],
  onSignOut,
  onSwitchInstitution,
  onSwitchRole,
  onMenuClick,
  selectedShift,
  onChangeShift,
}: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInstitutionMenu, setShowInstitutionMenu] = useState(false);

  const roleLabels: Record<UserRole, string> = {
    master: 'Master',
    admin: 'Administrador',
    professor: 'Professor',
    admin_viewer: 'Visualizador',
  };

  const hasMultipleInstitutions = userInstitutions.length > 1;
  const availableRoles = userInstitutions
    .filter(ui => ui.institution_id === currentInstitution?.id)
    .map(ui => ui.role);
  const hasMultipleRoles = availableRoles.length > 1;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Left - Menu button (mobile) + Institution Selector */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Hamburger menu - mobile only */}
        {/* Hamburger menu - mobile only (hidden for professors who use bottom nav) */}
        {currentRole !== 'professor' && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 hover:bg-muted transition-colors md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {hasMultipleInstitutions && currentInstitution && (
          <div className="relative">
            <button
              onClick={() => setShowInstitutionMenu(!showInstitutionMenu)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{currentInstitution.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showInstitutionMenu && (
              <div className="absolute left-0 top-full mt-1 w-64 rounded-md border bg-popover p-1 shadow-lg">
                {userInstitutions.map((ui) => (
                  <button
                    key={ui.institution_id}
                    onClick={() => {
                      onSwitchInstitution?.(ui.institution_id);
                      setShowInstitutionMenu(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors',
                      ui.institution_id === currentInstitution?.id && 'bg-muted'
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{ui.institution.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {roleLabels[currentRole]}
          </span>

          {hasMultipleRoles && (
            <button
              onClick={() => {
                const nextRole = availableRoles.find(r => r !== currentRole);
                if (nextRole) onSwitchRole?.(nextRole);
              }}
              className="rounded-md p-1 hover:bg-muted transition-colors"
              title="Trocar papel"
            >
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Shift Badge - Professor only */}
          {selectedShift && selectedShift !== 'all' && (
            <button
              onClick={onChangeShift}
              className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              title="Trocar turno"
            >
              <Clock className="h-3 w-3" />
              {selectedShift.charAt(0).toUpperCase() + selectedShift.slice(1)}
            </button>
          )}
        </div>
      </div>

      {/* Right - User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {getInitials(userName)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
            <div className="px-3 py-2 md:hidden">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <div className="md:hidden border-b my-1" />

            <button
              onClick={() => {
                onSignOut();
                setShowUserMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showInstitutionMenu) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShowUserMenu(false);
            setShowInstitutionMenu(false);
          }}
        />
      )}
    </header>
  );
}
