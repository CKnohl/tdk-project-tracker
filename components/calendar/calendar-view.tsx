'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, humanize } from '@/lib/utils';
import { useCalendarFeed, EVENT_COLORS } from '@/lib/queries/calendar';
import type { CalendarFeedRow } from '@/types/database.types';

type View = 'month' | 'week' | 'agenda';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function rangeFor(view: View, cursor: Date) {
  if (view === 'month') {
    return {
      start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
    };
  }
  if (view === 'week') {
    return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) };
  }
  return { start: cursor, end: addDays(cursor, 30) };
}

function EventChip({ ev }: { ev: CalendarFeedRow }) {
  return (
    <Link
      href={ev.project_id ? `/projects/${ev.project_id}` : '/tasks'}
      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] hover:bg-accent"
      title={ev.title}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', EVENT_COLORS[ev.event_type] ?? 'bg-slate-500')} />
      <span className="truncate">{ev.title}</span>
    </Link>
  );
}

export function CalendarView({
  defaultView = 'month',
  compact = false,
}: {
  defaultView?: View;
  compact?: boolean;
}) {
  const [view, setView] = React.useState<View>(defaultView);
  const [cursor, setCursor] = React.useState(new Date());

  const { start, end } = rangeFor(view, cursor);
  const { data: events = [], isLoading } = useCalendarFeed(iso(start), iso(addDays(end, 1)));

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarFeedRow[]>();
    for (const ev of events) {
      if (!ev.start_at) continue;
      const key = format(parseISO(ev.start_at), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), ev]);
    }
    return map;
  }, [events]);

  const move = (dir: 1 | -1) =>
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : view === 'week' ? addWeeks(c, dir) : addDays(c, dir * 30)));

  const heading =
    view === 'week'
      ? `${format(startOfWeek(cursor), 'MMM d')} – ${format(endOfWeek(cursor), 'MMM d, yyyy')}`
      : format(cursor, view === 'agenda' ? "'Agenda from' MMM d, yyyy" : 'MMMM yyyy');

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => move(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => move(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <span className="ml-2 text-sm font-semibold">{heading}</span>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="h-8">
            <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
            <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
            <TabsTrigger value="agenda" className="text-xs">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'month' && (
        <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1.5">{d}</div>
          ))}
        </div>
      )}

      {view === 'month' && (
        <div className="grid grid-cols-7 grid-rows-6">
          {eachDayOfInterval({ start, end }).map((day) => {
            const key = iso(day);
            const dayEvents = byDay.get(key) ?? [];
            const outside = view === 'month' && !isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[84px] border-b border-r p-1',
                  compact && 'min-h-[64px]',
                  outside && 'bg-muted/30 text-muted-foreground',
                )}
              >
                <div className="flex justify-end">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, compact ? 2 : 4).map((ev) => (
                    <EventChip key={ev.feed_id} ev={ev} />
                  ))}
                  {dayEvents.length > (compact ? 2 : 4) && (
                    <div className="px-1 text-[10px] text-muted-foreground">
                      +{dayEvents.length - (compact ? 2 : 4)} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'week' && (
        <div className="divide-y">
          {eachDayOfInterval({ start, end }).map((day) => {
            const key = iso(day);
            const dayEvents = byDay.get(key) ?? [];
            return (
              <div key={key} className="py-2.5">
                <div className={cn('mb-1 flex items-center gap-2 text-xs font-semibold', isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                  {format(day, 'EEEE, MMM d')}
                  {isToday(day) && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">Today</span>}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="pl-0.5 text-xs text-muted-foreground/70">Nothing scheduled</p>
                ) : (
                  <div className="space-y-0.5">
                    {dayEvents.map((ev) => (
                      <Link
                        key={ev.feed_id}
                        href={ev.project_id ? `/projects/${ev.project_id}` : '/tasks'}
                        className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', EVENT_COLORS[ev.event_type] ?? 'bg-slate-500')} />
                          <span className="truncate">{ev.title}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{ev.project_number ?? humanize(ev.source)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && <p className="py-3 text-center text-xs text-muted-foreground">Loading…</p>}
        </div>
      )}

      {view === 'agenda' && (
        <div className="divide-y">
          {events.length === 0 && !isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">No upcoming events.</p>
          )}
          {events.map((ev) => (
            <div key={ev.feed_id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', EVENT_COLORS[ev.event_type] ?? 'bg-slate-500')} />
                <div className="min-w-0">
                  <Link
                    href={ev.project_id ? `/projects/${ev.project_id}` : '/tasks'}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {ev.title}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">
                    {ev.project_number ? `${ev.project_number} · ` : ''}
                    {humanize(ev.source)}
                  </div>
                </div>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {ev.start_at ? format(parseISO(ev.start_at), 'EEE, MMM d') : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {isLoading && <p className="py-3 text-center text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}
