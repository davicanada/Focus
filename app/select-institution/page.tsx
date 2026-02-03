'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Building2, EyeOff, Eye, MapPin, Shield, BookOpen, BarChart3 } from 'lucide-react';
import { FocusLogo } from '@/components/FocusLogo';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { setActiveInstitution } from '@/lib/institution-context';
import { setToStorage, getFromStorage } from '@/lib/utils';
import type { UserRole } from '@/types';

interface UserInstitutionLink {
  id: string;
  user_id: string;
  institution_id: string;
  role: UserRole;
  is_active: boolean;
  hidden_at: string | null;
  institution: {
    id: string;
    name: string;
    city: string | null;
    state_code: string | null;
  };
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  admin_viewer: 'Visualizador',
  professor: 'Professor',
  master: 'Master',
};

const roleIcons: Record<string, React.ElementType> = {
  admin: Shield,
  admin_viewer: BarChart3,
  professor: BookOpen,
  master: Shield,
};

export default function SelectInstitutionPage() {
  const router = useRouter();
  const [links, setLinks] = useState<UserInstitutionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/user-institutions');
      if (!res.ok) {
        router.push('/');
        return;
      }
      const { data } = await res.json();
      setLinks(data || []);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (link: UserInstitutionLink) => {
    if (!link.is_active) return;

    // Set active institution context
    setActiveInstitution(link.institution_id, link.role);

    // Store session data for compatibility with existing code
    setToStorage('currentRole', link.role);
    setToStorage('currentInstitution', link.institution);

    // Store all user institutions
    setToStorage('userInstitutions', links.filter(l => l.is_active));

    toast.success(`Acessando ${link.institution.name}`);

    // Redirect based on role
    const redirectPath =
      link.role === 'admin' ? '/admin' :
      link.role === 'admin_viewer' ? '/viewer' :
      '/professor';
    router.push(redirectPath);
  };

  const handleToggleHidden = async (linkId: string, hide: boolean) => {
    setTogglingId(linkId);
    try {
      const res = await fetch('/api/user-institutions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId, hidden: hide }),
      });
      if (res.ok) {
        setLinks(prev =>
          prev.map(l =>
            l.id === linkId
              ? { ...l, hidden_at: hide ? new Date().toISOString() : null }
              : l
          )
        );
        toast.success(hide ? 'Instituição ocultada' : 'Instituição visível novamente');
      }
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setTogglingId(null);
    }
  };

  // Separate visible and hidden links
  const visibleLinks = links.filter(l => !l.hidden_at);
  const hiddenLinks = links.filter(l => l.hidden_at);
  const activeVisibleLinks = visibleLinks.filter(l => l.is_active);
  const inactiveVisibleLinks = visibleLinks.filter(l => !l.is_active);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If only 1 active accessible link, go directly
  if (activeVisibleLinks.length === 1 && inactiveVisibleLinks.length === 0 && hiddenLinks.length === 0) {
    handleSelect(activeVisibleLinks[0]);
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FocusLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Selecione a instituição</h1>
          <p className="text-gray-600 mt-1">Escolha qual instituição deseja acessar</p>
        </div>

        {/* Active institution cards */}
        <div className="space-y-3">
          {activeVisibleLinks.map(link => {
            const RoleIcon = roleIcons[link.role] || Building2;
            return (
              <button
                key={link.id}
                onClick={() => handleSelect(link)}
                className="w-full rounded-xl border-2 border-transparent bg-white p-4 shadow-sm hover:border-primary hover:shadow-md transition-all text-left flex items-center gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{link.institution.name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                    {link.institution.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {link.institution.city}{link.institution.state_code ? ` - ${link.institution.state_code}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary flex-shrink-0">
                  <RoleIcon className="h-3 w-3" />
                  {roleLabels[link.role] || link.role}
                </div>
              </button>
            );
          })}
        </div>

        {/* Inactive institution cards (not hidden) */}
        {inactiveVisibleLinks.length > 0 && (
          <div className="mt-4 space-y-3">
            {inactiveVisibleLinks.map(link => (
              <div
                key={link.id}
                className="w-full rounded-xl border border-gray-200 bg-white/60 p-4 opacity-60 flex items-center gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-400 flex-shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-600 truncate">{link.institution.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Acesso desativado — entre em contato com o administrador
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleHidden(link.id, true)}
                  disabled={togglingId === link.id}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  title="Ocultar esta instituição"
                >
                  {togglingId === link.id ? <Spinner size="sm" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Show hidden link */}
        {hiddenLinks.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 inline mr-1" />
              {showHidden ? 'Ocultar' : `Mostrar ${hiddenLinks.length} instituição(ões) oculta(s)`}
            </button>

            {showHidden && (
              <div className="mt-3 space-y-2">
                {hiddenLinks.map(link => (
                  <div
                    key={link.id}
                    className="rounded-lg border border-dashed border-gray-300 bg-white/40 p-3 flex items-center gap-3 text-sm"
                  >
                    <Building2 className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    <span className="text-gray-400 flex-1 truncate text-left">{link.institution.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleHidden(link.id, false)}
                      disabled={togglingId === link.id}
                      className="text-gray-400 hover:text-primary text-xs"
                    >
                      {togglingId === link.id ? <Spinner size="sm" /> : 'Mostrar novamente'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No active institutions */}
        {activeVisibleLinks.length === 0 && (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma instituição ativa</p>
            <p className="text-sm text-gray-400 mt-1">
              Entre em contato com o administrador para solicitar acesso
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
