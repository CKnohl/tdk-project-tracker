import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { WidgetCard } from './widget-card';
import { cn } from '@/lib/utils';
import type { ScheduleHealthSummary } from '@/lib/data/dashboard';

function Tile({ label, value, tone, href }: { label: string; value: number; tone: string; href?: string }) {
  const inner = (
    <div className="rounded-lg border bg-card p-2.5 text-center transition-colors hover:bg-accent">
      <div className={cn('text-2xl font-semibold tabular-nums', value > 0 ? tone : 'text-foreground')}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** V4.0 dashboard section — schedule health across all active projects. */
export function ScheduleHealth({ data }: { data: ScheduleHealthSummary }) {
  return (
    <WidgetCard title="Project Schedule Health" icon={CalendarRange}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile label="On schedule" value={data.onSchedule} tone="text-emerald-600 dark:text-emerald-400" />
        <Tile label="Slipping" value={data.slipping} tone="text-red-600 dark:text-red-400" href="/projects?workflow=urgent_follow_up" />
        <Tile label="Waiting · municipality" value={data.waitingMunicipality} tone="text-amber-600 dark:text-amber-400" />
        <Tile label="Waiting · client" value={data.waitingClient} tone="text-amber-600 dark:text-amber-400" href="/projects?workflow=awaiting_response" />
        <Tile label="Upcoming milestones" value={data.upcomingMilestones} tone="text-violet-600 dark:text-violet-400" />
      </div>

      {(data.slippingProjects.length > 0 || data.upcoming.length > 0) && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {data.slippingProjects.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Slipping</div>
              <div className="space-y-0.5">
                {data.slippingProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}?tab=timeline`} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                    <span className="truncate"><span className="font-mono text-xs text-muted-foreground">{p.project_number}</span> {p.name}</span>
                    <span className="shrink-0 text-xs text-red-600 dark:text-red-400">{p.reason}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {data.upcoming.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Upcoming milestones</div>
              <div className="space-y-0.5">
                {data.upcoming.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}?tab=timeline`} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                    <span className="truncate">{p.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{p.project_number} · {p.days === 0 ? 'today' : `${p.days}d`}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
