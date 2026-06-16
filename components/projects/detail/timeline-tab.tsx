import { Check, CalendarClock } from 'lucide-react';
import { PHASE_ORDER, PROJECT_PHASE } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';
import type { ProjectListItem, SubmittalWithProject, TaskWithStaff } from '@/lib/types';

export function TimelineTab({
  project,
  submittals,
  tasks,
}: {
  project: ProjectListItem;
  submittals: SubmittalWithProject[];
  tasks: TaskWithStaff[];
}) {
  const currentIdx = PHASE_ORDER.indexOf(project.phase);

  const milestones = [
    { label: 'Project created', date: project.created_at, kind: 'created' },
    ...submittals
      .filter((s) => s.response_due_date)
      .map((s) => ({ label: `${s.submission_type} response due`, date: s.response_due_date!, kind: 'submittal' })),
    ...tasks
      .filter((t) => t.due_date && t.status !== 'completed' && t.status !== 'cancelled')
      .map((t) => ({ label: t.name, date: t.due_date!, kind: 'task' })),
    ...(project.target_completion_date
      ? [{ label: 'Target completion', date: project.target_completion_date, kind: 'target' }]
      : []),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Phase progression</h3>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_ORDER.map((phase, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div
                key={phase}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                  active && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done && <Check className="h-3 w-3" />}
                {PROJECT_PHASE[phase].label}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Key dates</h3>
        <ol className="relative ml-2 space-y-3 border-l pl-6">
          {milestones.map((m, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[27px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-muted-foreground" />
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatDate(m.date)}</span>
                <span className="text-muted-foreground">{m.label}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
