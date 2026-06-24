'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetaBadge } from '@/components/shared/meta-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { StaffStack } from '@/components/shared/staff-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskForm } from '../task-form';
import { TaskDetailDialog } from './task-detail-dialog';
import { TASK_STATUS } from '@/lib/constants';
import { describeDue, cn } from '@/lib/utils';
import { setTaskStatus, deleteTask } from '@/lib/actions/tasks';
import { celebrate } from '@/lib/confetti';
import type { StaffOption } from '@/lib/data/reference';
import type { TaskWithStaff, ActivityItem } from '@/lib/types';
import type { TaskStatus } from '@/types/database.types';

const dueTone: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

export function TasksTab({
  projectId,
  tasks,
  staff,
  canEdit,
  activity = [],
}: {
  projectId: string;
  tasks: TaskWithStaff[];
  staff: StaffOption[];
  canEdit: boolean;
  activity?: ActivityItem[];
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskWithStaff | null>(null);
  const [viewing, setViewing] = React.useState<TaskWithStaff | null>(null);

  async function quickStatus(task: TaskWithStaff, status: TaskStatus) {
    const res = await setTaskStatus(task.id, projectId, status);
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  }

  async function complete(task: TaskWithStaff) {
    const res = await setTaskStatus(task.id, projectId, 'completed');
    if (!res.ok) return toast.error(res.error);
    celebrate();
    toast.success('Task completed');
    router.refresh();
  }

  async function onDelete(task: TaskWithStaff) {
    if (!confirm(`Delete task "${task.name}"?`)) return;
    const res = await deleteTask(task.id, projectId);
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
              <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
              <TaskForm projectId={projectId} staff={staff} onSuccess={() => setAdding(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" description={canEdit ? 'Add the first task to get started.' : undefined} />
      ) : (
        <div className="divide-y rounded-lg border">
          {tasks.map((task) => {
            const due = describeDue(task.due_date);
            const done = task.status === 'completed';
            const members = task.assignees.map((a) => a.staff).filter(Boolean) as { id: string; full_name: string; initials: string | null }[];
            return (
              <div key={task.id} className={cn('flex items-center justify-between gap-3 p-3', done && 'bg-muted/30')}>
                <button type="button" onClick={() => setViewing(task)} className="min-w-0 flex-1 rounded text-left transition-opacity hover:opacity-70">
                  <div className="flex items-center gap-2">
                    <span className={cn('truncate font-medium', done && 'text-muted-foreground line-through')}>
                      {task.name}
                    </span>
                    {!done && <PriorityBadge priority={task.priority} />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    {done ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                    ) : (
                      <>
                        <span className={dueTone[due.tone]}>{due.label}</span>
                        {task.completion_pct > 0 && <span className="text-muted-foreground">· {task.completion_pct}%</span>}
                      </>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(task)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>
          {editing && <TaskForm projectId={projectId} staff={staff} task={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        task={viewing}
        activity={activity}
        canEdit={canEdit}
        onClose={() => setViewing(null)}
        onEdit={(t) => setEditing(t)}
      />
    </div>
  );
}
