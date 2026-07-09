'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS, isActive } from './nav';
import { Logo, LogoIcon } from '@/components/shared/logo';
import { useBadgeData } from '@/lib/hooks/use-badge-data';
import { cn } from '@/lib/utils';

export function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  // My Work badge = unread notifications + pending reviews (no double-count of
  // assignments, which are already notifications). Shared 15s poll with the bell.
  const { data } = useBadgeData();
  const myWorkBadge = (data?.unread ?? 0) + (data?.reviews ?? 0);

  return (
    <nav className={cn('flex flex-col gap-1 py-4', collapsed ? 'items-center px-2' : 'px-3')}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        const badge = item.href === '/my-work' ? myWorkBadge : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              'relative flex items-center rounded-md text-sm font-medium transition-colors',
              collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && badge > 0 && (
              <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-destructive-foreground">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
            {collapsed && badge > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn('flex w-full items-center justify-center py-3', collapsed ? 'px-2' : 'px-3')}
    >
      {collapsed ? (
        <LogoIcon size={36} priority />
      ) : (
        // White plate keeps the official (white-background) logo crisp in both themes.
        <span className="flex w-[88%] items-center justify-center rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/5">
          <Logo priority className="h-auto w-full" />
        </span>
      )}
      <span className="sr-only">TDK Project Tracker — dashboard</span>
    </Link>
  );
}

export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <div className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className={cn('border-t p-2', collapsed && 'flex justify-center')}>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center rounded-md text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2 px-3 py-2',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" /> Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
