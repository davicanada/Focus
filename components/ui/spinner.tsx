'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ className, size = 'default' }: SpinnerProps) {
  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
}
