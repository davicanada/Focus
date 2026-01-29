'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { hideLoadingOverlay } from './LoadingOverlay';

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.15,
  speed: 400,
});

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Quando a rota muda, esconde o overlay e completa o NProgress
    NProgress.done();
    hideLoadingOverlay();
  }, [pathname, searchParams]);

  return null;
}

// Helper to start progress on navigation
export function startProgress() {
  NProgress.start();
}

export function stopProgress() {
  NProgress.done();
}
