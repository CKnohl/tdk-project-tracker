'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordNav } from '@/lib/nav-history';

/**
 * Records every route change (path + query) into the shared nav back-stack so
 * <BackLink/> can return the user to their true origin. Mounted once in the app
 * shell. Renders nothing.
 */
export function RouteHistoryTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  React.useEffect(() => {
    recordNav(`${pathname}${search ? `?${search}` : ''}`);
  }, [pathname, search]);

  return null;
}
