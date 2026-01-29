'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold">{value}</p>

        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}

        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-sm text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
