'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  ClipboardList,
  Calendar,
  CalendarRange,
  BarChart3,
  FileSpreadsheet,
  PlusCircle,
  List,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { FocusLogo } from '@/components/FocusLogo';
import { ProgressLink } from '@/components/ProgressLink';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
  institutionName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const masterNavItems: NavItem[] = [
  { href: '/master', label: 'Painel Master', icon: LayoutDashboard },
];

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/admin/turmas', label: 'Turmas', icon: BookOpen },
  { href: '/admin/alunos', label: 'Alunos', icon: GraduationCap },
  { href: '/admin/professores', label: 'Usuários', icon: Users },
  { href: '/admin/tipos-ocorrencias', label: 'Tipos de Ocorrências', icon: ClipboardList },
  { href: '/admin/trimestres', label: 'Períodos', icon: Calendar },
  { href: '/admin/anos-letivos', label: 'Anos Letivos', icon: CalendarRange },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
  { href: '/admin/alertas', label: 'Alertas', icon: Bell },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

const professorNavItems: NavItem[] = [
  { href: '/professor', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/professor/registrar', label: 'Registrar Ocorrência', icon: PlusCircle },
  { href: '/professor/ocorrencias', label: 'Minhas Ocorrências', icon: List },
  { href: '/professor/analytics', label: 'Analytics', icon: BarChart3 },
];

const viewerNavItems: NavItem[] = [
  { href: '/viewer', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/viewer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/viewer/relatorios', label: 'Relatórios', icon: FileSpreadsheet },
  { href: '/viewer/alertas', label: 'Alertas', icon: Bell },
  { href: '/viewer/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ role, institutionName, isOpen = false, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Fetch unread alerts count for admin and admin_viewer
  // Uses Visibility API to only poll when tab is visible (saves ~80% requests)
  useEffect(() => {
    if (role !== 'admin' && role !== 'admin_viewer') return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/alert-notifications/count');
        if (response.ok) {
          const data = await response.json();
          setUnreadAlerts(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching alert count:', error);
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Fetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling every 5 minutes (only when tab is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 300000); // 5 minutes

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [role]);

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'master':
        return masterNavItems;
      case 'admin':
        // Add badge to alerts item
        return adminNavItems.map(item =>
          item.href === '/admin/alertas' && unreadAlerts > 0
            ? { ...item, badge: unreadAlerts }
            : item
        );
      case 'professor':
        return professorNavItems;
      case 'admin_viewer':
        // Add badge to alerts item for viewer
        return viewerNavItems.map(item =>
          item.href === '/viewer/alertas' && unreadAlerts > 0
            ? { ...item, badge: unreadAlerts }
            : item
        );
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // Handle navigation click - close sidebar on mobile
  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300',
          // Desktop: always visible, respects collapsed state
          'hidden md:block',
          collapsed ? 'md:w-16' : 'md:w-64',
          // Mobile: slide in/out based on isOpen
          isOpen && 'block w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {(!collapsed || isOpen) && <FocusLogo variant="white" size="sm" />}
          {/* Close button on mobile */}
          <button
            onClick={isOpen ? onClose : onToggleCollapse}
            className="rounded-md p-1.5 hover:bg-sidebar-accent transition-colors"
          >
            {isOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Institution Name */}
        {(!collapsed || isOpen) && institutionName && (
          <div className="border-b border-sidebar-border px-4 py-3">
            <p className="text-xs text-sidebar-foreground/60">Instituição</p>
            <p className="text-sm font-medium break-words">{institutionName}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== `/${role}` && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <ProgressLink
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {item.badge && item.badge > 0 && collapsed && !isOpen && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
                {(!collapsed || isOpen) && (
                  <span className="flex-1 flex items-center justify-between">
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </span>
                )}
              </ProgressLink>
            );
          })}
        </nav>

        {/* Settings Link (only for non-admin roles, since admin and admin_viewer have it in the main menu) */}
        {role !== 'admin' && role !== 'admin_viewer' && (
          <div className="border-t border-sidebar-border px-2 py-4">
            <ProgressLink
              href="/settings"
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {(!collapsed || isOpen) && <span>Configurações</span>}
            </ProgressLink>
          </div>
        )}
      </aside>
    </>
  );
}
