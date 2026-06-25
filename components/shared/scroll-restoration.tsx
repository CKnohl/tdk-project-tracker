'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Best-effort scroll-position restoration for a list page. Saves window.scrollY
 * (debounced) keyed by the full URL, then restores it when the user returns to
 * the same URL — e.g. opening a project and clicking Back. Pairs with the
 * filter/search restoration on the project Back link so returning to a list
 * feels like a desktop app rather than a fresh page load.
 */
export function ScrollRestoration({ storageKey }: { storageKey: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const key = `${storageKey}:${pathname}${search ? `?${search}` : ''}`;

  // Restore — retry briefly while server-streamed content settles its height.
  React.useEffect(() => {
    let raf = 0;
    let tries = 0;
    let saved = 0;
    try {
      saved = parseInt(sessionStorage.getItem(key) ?? '0', 10);
    } catch {
      /* storage unavailable */
    }
    if (!saved) return;
    const tick = () => {
      window.scrollTo(0, saved);
      if (++tries < 10 && Math.abs(window.scrollY - saved) > 2) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);

  // Save — debounced on scroll.
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          sessionStorage.setItem(key, String(window.scrollY));
        } catch {
          /* storage unavailable */
        }
      }, 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t);
    };
  }, [key]);

  return null;
}
