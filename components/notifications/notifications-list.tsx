'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bell, AlertTriangle, Clock, FolderPlus, CheckCheck, Trash2, FileWarning, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { cn, formatRelative } from '@/lib/utils';
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/lib/actions/notifications';
import type { NotificationItem } from '@/lib/types';
import type { NotificationType } from '@/types/database.types';

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  task_due_tomorrow: Clock,
  task_overdue: AlertTriangle,
  submittal_awaiting_too_long: FileWarning,
  project_assigned: FolderPlus,
  task_assigned: Bell,
  project_updated: RefreshCw,
  follow_up_due: Clock,
};

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function allRead() {
    setPending(true);
    const res = await markAllNotificationsRead();
    setPending(false);
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  }

  async function toggle(n: NotificationItem) {
    await markNotificationRead(n.id, !n.is_read);
    router.refresh();
  }

  async function remove(n: NotificationItem) {
    await deleteNotification(n.id);
    router.refresh();
  }

  const unread = items.filter((n) => !n.is_read).length;

  if (items.length === 0) {
    return <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{unread} unread</span>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={allRead} disabled={pending}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>
      <div className="divide-y rounded-lg border">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          return (
            <div key={n.id} className={cn('flex items-start gap-3 p-3', !n.is_read && 'bg-primary/5')}>
              <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {n.project ? (
                    <Link href={`/projects/${n.project.id}`} className="truncate text-sm font-medium hover:underline" onClick={() => !n.is_read && toggle(n)}>
                      {n.title}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium">{n.title}</span>
                  )}
                  {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggle(n)} title={n.is_read ? 'Mark unread' : 'Mark read'}>
                  <CheckCheck className={cn('h-4 w-4', n.is_read && 'text-muted-foreground')} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(n)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
