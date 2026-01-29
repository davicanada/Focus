'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Estado global para controlar o overlay
let showOverlayFn: ((show: boolean) => void) | null = null;

export function showLoadingOverlay() {
  showOverlayFn?.(true);
}

export function hideLoadingOverlay() {
  showOverlayFn?.(false);
}

export function LoadingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    showOverlayFn = setVisible;
    return () => {
      showOverlayFn = null;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-150">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Carregando...</p>
      </div>
    </div>
  );
}
