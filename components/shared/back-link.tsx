'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBackTarget } from '@/lib/nav-history';

/**
 * A Back link that returns to wherever the user actually came from (via the shared
 * nav back-stack), not a hard-coded route. Falls back to `fallbackHref`/`fallbackLabel`
 * on a fresh load / deep-link where there's no history yet. SSR renders the fallback,
 * then the client swaps in the real origin on mount — no hydration mismatch.
 */
export function BackLink({
  fallbackHref,
  fallbackLabel,
  className,
}: {
  fallbackHref: string;
  fallbackLabel: string;
  className?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const currentUrl = `${pathname}${search ? `?${search}` : ''}`;

  const [target, setTarget] = React.useState<{ href: string; label: string }>({
    href: fallbackHref,
    label: fallbackLabel,
  });

  React.useEffect(() => {
    setTarget(getBackTarget(currentUrl, { href: fallbackHref, label: fallbackLabel }));
  }, [currentUrl, fallbackHref, fallbackLabel]);

  return (
    <Link
      href={target.href}
      className={cn('inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground', className)}
    >
      <ChevronLeft className="h-4 w-4" /> {target.label}
    </Link>
  );
}
