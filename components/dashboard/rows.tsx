import Link from 'next/link';
import {
  FileText,
  CalendarClock,
  CircleDot,
  FolderKanban,
} from 'lucide-react';
import { MetaBadge } from '@/components/shared/meta-badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  TASK_PRIORITY,
  SUBMITTAL_STATUS,
  PROJECT_STATUS,
  WORKFLOW_STATE,
  PROJECT_PHASE,
} from '@/lib/constants';
import { describeDue, formatDate, formatRelative, cn, humanize } from '@/lib/utils';
import type {
  TaskWithProject,
  SubmittalWithProject,
  ProjectListItem,
  ActivityItem,
} from '@/lib/types';
import type { CalendarFeedRow, FollowUpNeededRow } from '@/types/database.types';
import { FOLLOW_UP_REASON_LABEL } from '@/lib/constants';

const dueToneClass: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

export function TaskRow({ task }: { task: TaskWithProject }) {
  const due = describeDue(task.due_date);
  return (
    <Link
      href={task.project ? `/projects/${task.project.id}?tab=tasks` : '#'}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{task.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {task.project ? `${task.project.project_number} · ${task.project.name}` : '—'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <MetaBadge meta={TASK_PRIORITY[task.priority]} />
        <span className={cn('whitespace-nowrap text-xs', dueToneClass[due.tone])}>{due.label}</span>
      </div>
    </Link>
  );
}

export function SubmittalRowItem({ submittal }: { submittal: SubmittalWithProject }) {
  return (
    <Link
      href={submittal.project ? `/projects/${submittal.project.id}?tab=submittals` : '#'}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{submittal.submission_type}</div>
        <div className="truncate text-xs text-muted-foreground">
          {submittal.project ? `${submittal.project.project_number} · ${submittal.project.name}` : '—'}
          {submittal.follow_up_date ? ` · follow up ${formatDate(submittal.follow_up_date)}` : ''}
        </div>
      </div>
      <MetaBadge meta={SUBMITTAL_STATUS[submittal.status]} />
    </Link>
  );
}

export function ProjectRowItem({ project }: { project: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{project.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {project.project_number} · {project.company?.name ?? ''}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {project.workflow_state !== 'normal' && <MetaBadge meta={WORKFLOW_STATE[project.workflow_state]} />}
        <MetaBadge meta={PROJECT_PHASE[project.phase]} />
      </div>
    </Link>
  );
}

export function FollowUpRow({ project }: { project: FollowUpNeededRow }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{project.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {FOLLOW_UP_REASON_LABEL[project.reason] ?? humanize(project.reason)}
        </div>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatRelative(project.last_activity_at)}
      </span>
    </Link>
  );
}

export function FeedRow({ item }: { item: CalendarFeedRow }) {
  return (
    <Link
      href={item.project_id ? `/projects/${item.project_id}` : '/calendar'}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-2">
        <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{item.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {item.project_number ? `${item.project_number} · ` : ''}
            {humanize(item.source)}
          </div>
        </div>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(item.start_at)}</span>
    </Link>
  );
}

export function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-2">
      <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-medium">{item.actor?.full_name ?? 'System'}</span>{' '}
          <span className="text-muted-foreground">
            {humanize(item.action)} {item.entity_type}
          </span>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {item.project ? `${item.project.project_number} · ${item.project.name}` : ''} ·{' '}
          {formatRelative(item.created_at)}
        </div>
      </div>
    </div>
  );
}

export function WidgetList<T>({
  items,
  render,
  emptyTitle,
  emptyIcon = FileText,
  max,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  emptyTitle: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  max?: number;
}) {
  const shown = max ? items.slice(0, max) : items;
  if (shown.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon as never}
        title={emptyTitle}
        className="border-0 p-6"
      />
    );
  }
  return <div className="-mx-2 divide-y divide-border/50">{shown.map((item) => render(item))}</div>;
}

export const widgetIcons = { FolderKanban, FileText };
