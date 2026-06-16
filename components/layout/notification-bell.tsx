'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/notifications" aria-label={`Notifications${count ? ` (${count} unread)` : ''}`}>
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
