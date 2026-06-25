'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Re-keys on the route segment so each page entrance plays a subtle fade + 4px
 * rise. Keyed on pathname only (not search params) so in-page filtering doesn't
 * re-animate. motion-safe gates it behind prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:ease-out"
    >
      {children}
    </div>
  );
}
