'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bell, AlertTriangle, Clock, FolderPlus, CheckCheck, Trash2, FileWarning, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const TYPE_LABEL: Record<NotificationType, string> = {
  task_due_tomorrow: 'Task due tomorrow',
  task_overdue: 'Task overdue',
  submittal_awaiting_too_long: 'Submittal awaiting',
  project_assigned: 'Project assigned',
  task_assigned: 'Task assigned',
  project_updated: 'Project updated',
  follow_up_due: 'Needs attention',
};

const ALL = '__all__';

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [type, setType] = React.useState<string>(ALL);

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
  const presentTypes = [...new Set(items.map((n) => n.type))];
  const visible = items.filter(
    (n) => (!unreadOnly || !n.is_read) && (type === ALL || n.type === type),
  );

  if (items.length === 0) {
    return <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={unreadOnly ? 'default' : 'outline'} size="sm" onClick={() => setUnreadOnly((v) => !v)}>
          Unread {unread > 0 && `(${unread})`}
        </Button>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {presentTypes.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABEL[t] ?? t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={allRead} disabled={pending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">No notifications match these filters.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {visible.map((n) => {
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
      )}
    </div>
  );
}
