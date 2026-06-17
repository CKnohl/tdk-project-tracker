import Link from 'next/link';
import { CalendarClock, ListChecks, AlertTriangle, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MetaBadge } from '@/components/shared/meta-badge';
import { ProjectStatusBadge } from '@/components/shared/status-indicator';
import { PROJECT_PHASE, WORKFLOW_STATE } from '@/lib/constants';
import { formatDate, describeDue, formatCompanyTag, cn } from '@/lib/utils';
import type { ProjectCard as ProjectCardType } from '@/lib/data/projects';

export function ProjectCard({ project }: { project: ProjectCardType }) {
  const due = describeDue(project.stats?.next_due_date);
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="card-hover flex h-full flex-col gap-3 p-4 hover:border-primary/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{project.project_number}</span>
              {project.company && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: project.company.color ?? '#475569' }}
                >
                  {formatCompanyTag(project.company.key)}
                </span>
              )}
            </div>
            <h3 className="mt-0.5 truncate font-semibold">{project.name}</h3>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <MetaBadge meta={PROJECT_PHASE[project.phase]} />
          {project.workflow_state !== 'normal' && <MetaBadge meta={WORKFLOW_STATE[project.workflow_state]} />}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <User className="h-3.5 w-3.5" />
            {project.manager?.full_name ?? 'Unassigned'}
          </span>
          <div className="flex items-center gap-3">
            {!!project.stats?.open_tasks && (
              <span className="flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {project.stats.open_tasks}
              </span>
            )}
            {!!project.stats?.overdue_tasks && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {project.stats.overdue_tasks}
              </span>
            )}
            {project.stats?.next_due_date && (
              <span className={cn('flex items-center gap-1', due.tone === 'overdue' && 'text-red-600 dark:text-red-400')}>
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(project.stats.next_due_date)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
