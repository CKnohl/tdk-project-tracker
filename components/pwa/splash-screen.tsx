'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Brief native-style launch screen — only shown when the app is running as an
 * installed PWA (standalone display mode), never in a normal browser tab.
 */
export function SplashScreen() {
  const [mounted, setMounted] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    setMounted(true);
    const t1 = setTimeout(() => setLeaving(true), 950);
    const t2 = setTimeout(() => setMounted(false), 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 transition-opacity duration-500',
        leaving ? 'opacity-0' : 'opacity-100',
      )}
      style={{ backgroundColor: '#081224' }}
      aria-hidden="true"
    >
      <Image src="/icons/icon-512.png" alt="" width={96} height={96} priority className="h-24 w-24 object-contain" />
      <div className="text-center">
        <div className="text-lg font-semibold text-white">TDK Tracker</div>
        <div className="mt-0.5 text-xs text-white/60">TDK · M&amp;P</div>
      </div>
    </div>
  );
}
