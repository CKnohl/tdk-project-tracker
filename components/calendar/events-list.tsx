'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { EventForm } from './event-form';
import { EVENT_COLORS } from '@/lib/queries/calendar';
import { formatDateTime, formatDate, humanize, cn } from '@/lib/utils';
import { deleteCalendarEvent } from '@/lib/actions/calendar';
import type { CalendarEventItem } from '@/lib/types';

export function EventsList({
  events,
  projects,
  canEdit,
}: {
  events: CalendarEventItem[];
  projects: { id: string; project_number: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<CalendarEventItem | null>(null);

  async function remove(e: CalendarEventItem) {
    if (!confirm(`Delete event "${e.title}"?`)) return;
    const res = await deleteCalendarEvent(e.id);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Event deleted'); router.refresh(); }
  }

  if (events.length === 0) {
    return <EmptyState icon={CalendarClock} title="No scheduled events" description={canEdit ? 'Add a meeting, site visit, or milestone.' : undefined} className="border-0" />;
  }

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', EVENT_COLORS[e.event_type] ?? 'bg-slate-500')} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{e.title}</span>
                <Badge tone="slate">{humanize(e.event_type)}</Badge>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {e.all_day ? formatDate(e.start_at) : formatDateTime(e.start_at)}
                {e.project ? (
                  <> · <Link href={`/projects/${e.project.id}`} className="hover:underline">{e.project.project_number}</Link></>
                ) : null}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label="Edit event" className="h-8 w-8" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Delete event" className="h-8 w-8 text-destructive" onClick={() => remove(e)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit event</DialogTitle></DialogHeader>
          {editing && <EventForm projects={projects} event={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
