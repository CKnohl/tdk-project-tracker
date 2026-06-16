'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { NAV_ITEMS, isActive } from './nav';
import { cn } from '@/lib/utils';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-5 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">TDK Tracker</div>
        <div className="text-[11px] text-muted-foreground">TDK · M&amp;P Engineering</div>
      </div>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card md:flex">
      <SidebarBrand />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <SidebarNav />
      </div>
      <div className="border-t px-5 py-3 text-[11px] text-muted-foreground">v1.0 · Production</div>
    </aside>
  );
}
