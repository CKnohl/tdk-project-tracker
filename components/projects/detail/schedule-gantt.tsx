import { eachMonthOfInterval, format, parseISO } from 'date-fns';
import { MetaBadge } from '@/components/shared/meta-badge';
import { TASK_STATUS } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';
import type { ProjectSchedule } from '@/lib/schedule';
import type { TaskWithStaff } from '@/lib/types';

const STATE_BAR: Record<ProjectSchedule['phases'][number]['state'], string> = {
  completed: 'bg-emerald-500',
  current: 'bg-primary',
  upcoming: 'bg-muted-foreground/30',
};

/**
 * Lightweight Gantt: phase bars on a date axis with a today line, milestone and
 * submittal markers, and the open tasks that fall within each phase. Purely
 * presentational — all logic lives in lib/schedule.ts.
 */
export function ScheduleGantt({ schedule, tasks }: { schedule: ProjectSchedule; tasks: TaskWithStaff[] }) {
  const startMs = parseISO(schedule.rangeStart).getTime();
  const endMs = parseISO(schedule.rangeEnd).getTime();
  const span = Math.max(1, endMs - startMs);
  const pct = (date: string) => ((parseISO(date).getTime() - startMs) / span) * 100;

  const months = eachMonthOfInterval({ start: parseISO(schedule.rangeStart), end: parseISO(schedule.rangeEnd) });
  const todayPct = pct(schedule.today);

  const openTasks = tasks.filter((t) => t.status !== 'cancelled' && t.status !== 'completed');
  const tasksForPhase = (start: string, end: string) =>
    openTasks.filter((t) => t.due_date && t.due_date >= start && t.due_date <= end);

  return (
    <div className="space-y-3">
      {/* Month axis */}
      <div className="relative h-4 text-[10px] text-muted-foreground">
        {months.map((m) => {
          const left = pct(format(m, 'yyyy-MM-dd'));
          if (left < 0 || left > 100) return null;
          return (
            <span key={m.toISOString()} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${left}%` }}>
              {format(m, 'MMM ’yy')}
            </span>
          );
        })}
      </div>

      {/* Chart */}
      <div className="relative rounded-md border bg-muted/20 p-2">
        {todayPct >= 0 && todayPct <= 100 && (
          <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500/70" style={{ left: `${todayPct}%` }}>
            <span className="absolute top-0 -translate-x-1/2 rounded-b bg-red-500 px-1 text-[9px] font-medium text-white">Today</span>
          </div>
        )}

        <div className="space-y-1.5">
          {schedule.phases.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">No phases defined.</p>
          ) : (
            schedule.phases.map((b) => (
              <div key={b.id} className="relative h-7">
                <div
                  className={cn('absolute top-0 flex h-7 items-center overflow-hidden rounded-md', STATE_BAR[b.state], b.derived && 'opacity-70')}
                  style={{ left: `${pct(b.start)}%`, width: `${Math.max(3, pct(b.end) - pct(b.start))}%` }}
                  title={`${b.name} · ${formatDate(b.start)} – ${formatDate(b.end)}${b.derived ? ' (estimated)' : ''}`}
                >
                  {b.state === 'current' && b.progress > 0 && (
                    <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${b.progress}%` }} />
                  )}
                  <span className="relative truncate px-2 text-[11px] font-medium text-white">{b.name}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {schedule.submittals.length > 0 && (
          <div className="relative mt-2 h-5 border-t border-border/60 pt-2">
            {schedule.submittals.map((m) => (
              <span
                key={`s-${m.id}`}
                className="absolute top-2.5 -translate-x-1/2"
                style={{ left: `${pct(m.date)}%` }}
                title={`Submittal due: ${m.label} · ${formatDate(m.date)}`}
              >
                <span className={cn('block h-2 w-2 rounded-full', m.past ? 'bg-red-500' : 'bg-amber-500')} />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-emerald-500" /> Completed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-primary" /> Current</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-muted-foreground/30" /> Upcoming</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Submittal due</span>
      </div>

      {/* Tasks beneath their phase (open tasks whose due date falls in the phase window) */}
      {(() => {
        const groups = schedule.phases
          .map((b) => ({ name: b.name, tasks: tasksForPhase(b.start, b.end) }))
          .filter((g) => g.tasks.length > 0);
        if (groups.length === 0) return null;
        return (
          <div className="space-y-2 border-t pt-3">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="text-xs font-semibold text-muted-foreground">{g.name}</div>
                <div className="mt-1 space-y-1">
                  {g.tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{t.name}</span>
                      <MetaBadge meta={TASK_STATUS[t.status]} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
