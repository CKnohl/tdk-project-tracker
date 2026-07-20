'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Repeat, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetaBadge } from '@/components/shared/meta-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { StaffStack } from '@/components/shared/staff-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { GeneralTaskForm } from './general-task-form';
import { TaskDetailDialog } from '@/components/projects/detail/task-detail-dialog';
import { CompletionNoteDialog, type CompletedTaskRef } from '@/components/tasks/completion-note-dialog';
import { TASK_STATUS } from '@/lib/constants';
import { describeDue, cn } from '@/lib/utils';
import { setGeneralTaskStatus, deleteGeneralTask } from '@/lib/actions/general-tasks';
import { celebrate } from '@/lib/confetti';
import type { StaffOption } from '@/lib/data/reference';
import type { TaskWithStaff, ActivityItem, ReviewItem } from '@/lib/types';
import type { TaskStatus } from '@/types/database.types';

const dueTone: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

export function GeneralTasksView({
  tasks,
  activity,
  staff,
  canEdit,
  reviews = {},
}: {
  tasks: TaskWithStaff[];
  activity: ActivityItem[];
  staff: StaffOption[];
  canEdit: boolean;
  reviews?: Record<string, ReviewItem[]>;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskWithStaff | null>(null);
  const [viewing, setViewing] = React.useState<TaskWithStaff | null>(null);
  const [completedTask, setCompletedTask] = React.useState<CompletedTaskRef | null>(null);
  const [showArchive, setShowArchive] = React.useState(false);

  async function quickStatus(task: TaskWithStaff, status: TaskStatus) {
    const res = await setGeneralTaskStatus(task.id, status);
    if (!res.ok) return toast.error(res.error);
    if (status === 'completed') setCompletedTask({ id: task.id, name: task.name, project_id: null });
    router.refresh();
  }

  async function complete(task: TaskWithStaff) {
    const res = await setGeneralTaskStatus(task.id, 'completed');
    if (!res.ok) return toast.error(res.error);
    celebrate();
    toast.success('Task completed');
    // Optional context note (skippable) — the full picture isn't always yes/no.
    setCompletedTask({ id: task.id, name: task.name, project_id: null });
    router.refresh();
  }

  async function onDelete(task: TaskWithStaff) {
    if (!confirm(`Delete task "${task.name}"?`)) return;
    const res = await deleteGeneralTask(task.id);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Task deleted'); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> Add task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New office task</DialogTitle></DialogHeader>
              <GeneralTaskForm staff={staff} onSuccess={() => setAdding(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {(() => {
        // Archive layer — finished work drops out of the working list into a
        // collapsed section instead of cluttering the day-to-day view.
        const active = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
        const archived = tasks.filter((t) => t.status === 'completed' || t.status === 'cancelled');

        const renderRow = (task: TaskWithStaff) => {
          const due = describeDue(task.due_date);
          const done = task.status === 'completed';
          // Deactivated staff drop out of the assigned display (history keeps their name).
          const members = task.assignees
            .map((a) => a.staff)
            .filter((s): s is NonNullable<typeof s> => !!s && s.is_active !== false);
          return (
              <div key={task.id} className={cn('flex items-center justify-between gap-3 p-3', done && 'bg-muted/30')}>
                <button type="button" onClick={() => setViewing(task)} className="min-w-0 flex-1 rounded text-left transition-opacity hover:opacity-70">
                  <div className="flex items-center gap-2">
                    <span className={cn('truncate font-medium', done && 'text-muted-foreground line-through')}>
                      {task.name}
                    </span>
                    {!done && <PriorityBadge priority={task.priority} />}
                    {task.recurrence !== 'none' && <Repeat className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    {done ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                    ) : (
                      <span className={dueTone[due.tone]}>{due.label}</span>
                    )}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  {members.length > 0 && <StaffStack members={members} max={3} />}
                  {canEdit && !done && task.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      onClick={() => complete(task)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Complete
                    </Button>
                  )}
                  {canEdit ? (
                    <Select value={task.status} onValueChange={(v) => quickStatus(task, v as TaskStatus)}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.values(TASK_STATUS).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <MetaBadge meta={TASK_STATUS[task.status]} />
                  )}
                  {canEdit && (
                    <>
                      <Button variant="ghost" size="icon" aria-label="Edit task" className="h-8 w-8" onClick={() => setEditing(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete task" className="h-8 w-8 text-destructive" onClick={() => onDelete(task)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
          );
        };

        if (tasks.length === 0) {
          return <EmptyState title="No office tasks yet" description={canEdit ? 'Add a standalone task that isn’t tied to a project.' : undefined} />;
        }
        return (
          <>
            {active.length === 0 ? (
              <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">Nothing open — everything is in the archive below.</p>
            ) : (
              <div className="divide-y rounded-lg border">{active.map(renderRow)}</div>
            )}
            {archived.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowArchive((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {showArchive ? 'Hide' : 'Show'} archive ({archived.length} completed / cancelled)
                </button>
                {showArchive && <div className="divide-y rounded-lg border">{archived.map(renderRow)}</div>}
              </div>
            )}
          </>
        );
      })()}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>
          {editing && <GeneralTaskForm staff={staff} task={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        task={viewing}
        activity={activity}
        reviews={viewing ? reviews[viewing.id] ?? [] : []}
        canEdit={canEdit}
        onClose={() => setViewing(null)}
        onEdit={(t) => setEditing(t)}
      />

      <CompletionNoteDialog task={completedTask} onClose={() => setCompletedTask(null)} />
    </div>
  );
}
