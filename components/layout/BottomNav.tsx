'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, List, BarChart3 } from 'lucide-react';
import { ProgressLink } from '@/components/ProgressLink';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/professor', label: 'Início', icon: LayoutDashboard },
        { href: '/professor/registrar', label: 'Registrar', icon: PlusCircle },
        { href: '/professor/ocorrencias', label: 'Minhas', icon: List },
        { href: '/professor/analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t bg-background px-4 pb-safe md:hidden">
            <div className="flex w-full items-center justify-around">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <ProgressLink
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 rounded-md px-4 py-2 text-xs font-medium transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <Icon className={cn('h-6 w-6', isActive && 'fill-current/20')} />
                            <span>{item.label}</span>
                        </ProgressLink>
                    );
                })}
            </div>
        </nav>
    );
}
