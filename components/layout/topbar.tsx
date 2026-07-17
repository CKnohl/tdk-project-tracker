'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarBrand, SidebarNav } from './sidebar';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';
import { SearchCommand } from './search-command';
import type { RoleKey } from '@/lib/permissions';

export function Topbar({
  user,
}: {
  user: { full_name: string | null; email: string; avatar_url: string | null; role: RoleKey };
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand />
          <SidebarNav onNavigate={() => setOpen(false)} role={user.role} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center">
        <SearchCommand role={user.role} />
      </div>

      <ThemeToggle />
      <NotificationBell />
      <UserMenu user={user} />
    </header>
  );
}
