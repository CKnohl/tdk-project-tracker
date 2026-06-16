'use client';

import Link from 'next/link';
import { LogOut, Settings, UserCog } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { Badge } from '@/components/ui/badge';
import { signOut } from '@/lib/actions/auth';
import { ROLE_LABEL, type RoleKey } from '@/lib/permissions';

export function UserMenu({
  user,
}: {
  user: { full_name: string | null; email: string; avatar_url: string | null; role: RoleKey };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <StaffAvatar name={user.full_name ?? user.email} src={user.avatar_url} className="h-8 w-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate">{user.full_name ?? 'Account'}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          <Badge tone="slate" className="mt-1 w-fit">
            {ROLE_LABEL[user.role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <UserCog className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            e.preventDefault();
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
