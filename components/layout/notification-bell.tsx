'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, CheckCheck, ChevronLeft, FolderKanban, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ICONS, TYPE_LABEL } from '@/components/notifications/notifications-list';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications';
import { useBadgeData } from '@/lib/hooks/use-badge-data';
import { cn, formatBadgeCount, formatDateTime, formatRelative } from '@/lib/utils';
import type { NotificationItem } from '@/lib/types';

/**
 * Productivity overlay (not a page). The bell drops an Outlook-style panel that can
 * be referenced from anywhere without navigating away. Clicking a notification opens
 * a DETAIL view inside the panel (Project / Date / Status / Message + Open actions) —
 * it doesn't navigate until you choose to, so you can just reference it.
 * Polls every 15s; pulses + toasts when new items arrive.
 */
export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useBadgeData();
  const unread = data?.unread ?? 0;
  const recent = data?.recent ?? [];
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<NotificationItem | null>(null);

  // Live-feel on top of polling: pulse + toast the newest item when unread rises.
  const prevUnread = React.useRef<number | null>(null);
  const [pulse, setPulse] = React.useState(false);
  React.useEffect(() => {
    if (!data) return;
    if (prevUnread.current !== null && data.unread > prevUnread.current) {
      setPulse(true);
      const newest = data.recent[0];
      if (newest) toast(newest.title, { description: newest.body ?? undefined });
      const t = setTimeout(() => setPulse(false), 1500);
      prevUnread.current = data.unread;
      return () => clearTimeout(t);
    }
    prevUnread.current = data.unread;
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['badge-data'] });

  async function markAll() {
    await markAllNotificationsRead();
    invalidate();
  }

  async function toggleRead(n: NotificationItem) {
    const next = !n.is_read;
    await markNotificationRead(n.id, next);
    invalidate();
    setSelected((s) => (s && s.id === n.id ? { ...s, is_read: next } : s));
  }

  function go(href: string) {
    setOpen(false);
    setSelected(null);
    router.push(href);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelected(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
          <Bell className={cn('h-4 w-4', pulse && 'animate-bounce')} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {formatBadgeCount(unread)}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {selected ? (
          <NotificationDetail
            n={selected}
            onBack={() => setSelected(null)}
            onToggleRead={() => toggleRead(selected)}
            onOpenProject={selected.project ? () => go(`/projects/${selected.project!.id}`) : undefined}
            onOpenTask={
              selected.entity_type === 'task'
                ? () => go(selected.project_id ? `/projects/${selected.project_id}?tab=tasks` : '/tasks')
                : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">Notifications{unread > 0 ? ` (${unread})` : ''}</span>
              {unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((n) => {
                    const Icon = ICONS[n.type] ?? Bell;
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => setSelected(n)}
                          className={cn('flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent', !n.is_read && 'bg-primary/5')}
                        >
                          <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{n.title}</span>
                              {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                            </span>
                            {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                            <span className="block text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t p-2">
              <Link
                href="/my-work?tab=inbox"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-md py-1.5 text-sm font-medium text-primary hover:bg-accent"
              >
                View Inbox →
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function NotificationDetail({
  n,
  onBack,
  onToggleRead,
  onOpenProject,
  onOpenTask,
}: {
  n: NotificationItem;
  onBack: () => void;
  onToggleRead: () => void;
  onOpenProject?: () => void;
  onOpenTask?: () => void;
}) {
  const Icon = ICONS[n.type] ?? Bell;
  return (
    <div>
      <div className="flex items-center gap-1 border-b px-2 py-2">
        <button onClick={onBack} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{n.title}</div>
            <div className="text-xs text-muted-foreground">{TYPE_LABEL[n.type] ?? n.type}</div>
          </div>
        </div>

        <div className="space-y-1.5 rounded-md border p-2.5">
          {n.project && (
            <DetailRow label="Project">
              <span className="truncate">
                <span className="font-mono text-xs text-muted-foreground">{n.project.project_number}</span> {n.project.name}
              </span>
            </DetailRow>
          )}
          <DetailRow label="Date">{formatDateTime(n.created_at)}</DetailRow>
          <DetailRow label="Status">
            <span className={n.is_read ? 'text-muted-foreground' : 'font-medium text-primary'}>{n.is_read ? 'Read' : 'Unread'}</span>
          </DetailRow>
          {n.body && <DetailRow label="Message">{n.body}</DetailRow>}
        </div>

        <div className="flex flex-wrap gap-2">
          {onOpenProject && (
            <Button size="sm" variant="outline" onClick={onOpenProject}>
              <FolderKanban className="h-4 w-4" /> Open Project
            </Button>
          )}
          {onOpenTask && (
            <Button size="sm" variant="outline" onClick={onOpenTask}>
              <ListChecks className="h-4 w-4" /> Open Task
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onToggleRead}>
            <CheckCheck className="h-4 w-4" /> Mark {n.is_read ? 'Unread' : 'Read'}
          </Button>
        </div>
      </div>
    </div>
  );
}
