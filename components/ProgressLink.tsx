'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { startProgress } from './NavigationProgress';
import { showLoadingOverlay } from './LoadingOverlay';
import { cn } from '@/lib/utils';

interface ProgressLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

export function ProgressLink({
  href,
  children,
  className,
  activeClassName,
  onClick,
  ...props
}: ProgressLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (typeof href === 'string' && pathname.startsWith(href) && href !== '/');

  const handleClick = () => {
    if (pathname !== href) {
      startProgress();
      showLoadingOverlay(); // Mostra overlay imediatamente ao clicar
    }
    onClick?.();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
