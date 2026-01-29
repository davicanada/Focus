'use client';

import { ProgressLink } from '@/components/ProgressLink';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

const variantClasses = {
  default: 'bg-card hover:bg-muted/50',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
};

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  variant = 'default',
  className,
}: QuickActionCardProps) {
  return (
    <ProgressLink
      href={href}
      className={cn(
        'block rounded-lg border p-6 shadow-sm transition-all hover:shadow-md',
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'rounded-full p-3',
            variant === 'default' ? 'bg-primary/10' : 'bg-white/10'
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              variant === 'default' ? 'text-primary' : 'text-current'
            )}
          />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p
            className={cn(
              'mt-1 text-sm',
              variant === 'default' ? 'text-muted-foreground' : 'text-current/80'
            )}
          >
            {description}
          </p>
        </div>
      </div>
    </ProgressLink>
  );
}
