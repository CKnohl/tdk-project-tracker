'use client';

import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MetaBadge } from '@/components/shared/meta-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { TASK_STATUS, TASK_RECURRENCE } from '@/lib/constants';
import { describeDue, formatRelative, humanize, cn } from '@/lib/utils';
import type { TaskWithStaff, ActivityItem, ReviewItem } from '@/lib/types';

const dueTone: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-foreground',
  none: 'text-muted-foreground',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

export function TaskDetailDialog({
  task,
  activity,
  reviews,
  canEdit,
  onClose,
  onEdit,
}: {
  task: TaskWithStaff | null;
  activity: ActivityItem[];
  reviews: ReviewItem[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: (task: TaskWithStaff) => void;
}) {
  if (!task) return null;
  const due = describeDue(task.due_date);
  const members = task.assignees.map((a) => a.staff).filter(Boolean) as { id: string; full_name: string; initials: string | null }[];
  const history = activity
    .filter((a) => a.entity_type === 'task' && a.entity_id === task.id)
    .slice(0, 12);

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8">{task.name}</DialogTitle>
        </DialogHeader>

        <div className="divide-y">
          <Row label="Status">
            <div className="flex items-center gap-2">
              <MetaBadge meta={TASK_STATUS[task.status]} />
              <PriorityBadge priority={task.priority} />
              {task.completion_pct > 0 && task.status !== 'completed' && (
                <span className="text-xs text-muted-foreground">{task.completion_pct}%</span>
              )}
            </div>
          </Row>
          <Row label="Assigned">
            {members.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {members.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1.5">
                    <StaffAvatar name={m.full_name} initials={m.initials} className="h-5 w-5 text-[9px]" />
                    <span>{m.full_name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </Row>
          <Row label="Due Date">
            <span className={cn('font-medium', dueTone[due.tone])}>{due.label}</span>
          </Row>
          {task.recurrence !== 'none' && <Row label="Repeats">{TASK_RECURRENCE[task.recurrence]}</Row>}
          <Row label="Description">
            {task.description ? <p className="whitespace-pre-wrap">{task.description}</p> : <span className="text-muted-foreground">—</span>}
          </Row>
          {reviews.length > 0 && (
            <Row label="Review History">
              <ul className="space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="text-xs">
                    <span className="font-medium text-foreground">{r.actor?.full_name ?? 'Someone'}</span>{' '}
                    <span
                      className={cn(
                        r.action === 'approved' && 'text-emerald-600 dark:text-emerald-400',
                        r.action === 'rejected' && 'text-red-600 dark:text-red-400',
                        r.action === 'submitted' && 'text-violet-600 dark:text-violet-400',
                      )}
                    >
                      {r.action === 'submitted' ? 'sent for review' : r.action === 'approved' ? 'approved' : 'requested changes'}
                    </span>
                    <span className="text-muted-foreground"> · {formatRelative(r.created_at)}</span>
                    {r.comment && <p className="mt-0.5 whitespace-pre-wrap text-foreground/80">“{r.comment}”</p>}
                  </li>
                ))}
              </ul>
            </Row>
          )}
          <Row label="History">
            {history.length === 0 ? (
              <span className="text-muted-foreground">No recent activity.</span>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{h.actor?.full_name ?? 'System'}</span>{' '}
                    {humanize(h.action)} · {formatRelative(h.created_at)}
                  </li>
                ))}
              </ul>
            )}
          </Row>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(task); }}>
              <Pencil className="h-4 w-4" /> Edit task
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
