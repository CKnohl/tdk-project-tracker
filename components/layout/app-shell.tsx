'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { cn } from '@/lib/utils';
import type { RoleKey } from '@/lib/permissions';

const KEY = 'tdk-sidebar-collapsed';

interface ShellUser {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: RoleKey;
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(KEY) === '1');
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable — keep in-memory state */
      }
      return next;
    });

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'md:pl-16' : 'md:pl-60')}>
        <Topbar user={user} />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <InstallPrompt />
    </div>
  );
}
