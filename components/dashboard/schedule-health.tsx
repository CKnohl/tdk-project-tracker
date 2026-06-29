import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { WidgetCard } from './widget-card';
import { cn } from '@/lib/utils';
import type { ScheduleHealthSummary } from '@/lib/data/dashboard';

function Tile({ label, value, tone, href }: { label: string; value: number; tone: string; href: string }) {
  return (
    <Link href={href}>
      <div className="rounded-lg border bg-card p-2.5 text-center transition-colors hover:bg-accent">
        <div className={cn('text-2xl font-semibold tabular-nums', value > 0 ? tone : 'text-foreground')}>{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

function List({ title, items, tone }: { title: string; items: ScheduleHealthSummary['slippingProjects']; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="space-y-0.5">
        {items.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}?tab=timeline`} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
            <span className="truncate"><span className="font-mono text-xs text-muted-foreground">{p.project_number}</span> {p.name}</span>
            <span className={cn('shrink-0 text-xs', tone)}>{p.reason}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** V4.3 dashboard section — On Schedule / Slipping / Behind across active projects. */
export function ScheduleHealth({ data }: { data: ScheduleHealthSummary }) {
  return (
    <WidgetCard title="Project Schedule Health" icon={CalendarRange}>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="On schedule" value={data.onSchedule} tone="text-emerald-600 dark:text-emerald-400" href="/projects?health=on_track" />
        <Tile label="Slipping" value={data.slipping} tone="text-amber-600 dark:text-amber-400" href="/projects?health=slipping" />
        <Tile label="Behind" value={data.behind} tone="text-red-600 dark:text-red-400" href="/projects?health=behind" />
      </div>

      {(data.behindProjects.length > 0 || data.slippingProjects.length > 0) && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <List title="Behind" items={data.behindProjects} tone="text-red-600 dark:text-red-400" />
          <List title="Slipping" items={data.slippingProjects} tone="text-amber-600 dark:text-amber-400" />
        </div>
      )}
    </WidgetCard>
  );
}
