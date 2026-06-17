'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetaBadge } from '@/components/shared/meta-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { StaffStack } from '@/components/shared/staff-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskForm } from '../task-form';
import { TASK_STATUS } from '@/lib/constants';
import { describeDue, cn } from '@/lib/utils';
import { setTaskStatus, deleteTask } from '@/lib/actions/tasks';
import type { StaffOption } from '@/lib/data/reference';
import type { TaskWithStaff } from '@/lib/types';
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
}: {
  projectId: string;
  tasks: TaskWithStaff[];
  staff: StaffOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskWithStaff | null>(null);

  async function quickStatus(task: TaskWithStaff, status: TaskStatus) {
    const res = await setTaskStatus(task.id, projectId, status);
    if (!res.ok) toast.error(res.error);
    else router.refresh();
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
            const members = task.assignees.map((a) => a.staff).filter(Boolean) as { id: string; full_name: string; initials: string | null }[];
            return (
              <div key={task.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('truncate font-medium', task.status === 'completed' && 'text-muted-foreground line-through')}>
                      {task.name}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className={dueTone[due.tone]}>{due.label}</span>
                    {task.completion_pct > 0 && task.status !== 'completed' && (
                      <span className="text-muted-foreground">· {task.completion_pct}%</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {members.length > 0 && <StaffStack members={members} max={3} />}
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
    </div>
  );
}
