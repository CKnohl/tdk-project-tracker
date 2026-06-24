'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, X, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboOption } from '@/components/shared/combobox';
import { MetaBadge } from '@/components/shared/meta-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { AssignTaskDialog } from './assign-task-dialog';
import { CreateTaskDialog } from './create-task-dialog';
import { reassignTasks, unassignTaskFromStaff } from '@/lib/actions/workload';
import { TASK_STATUS } from '@/lib/constants';
import { describeDue, cn } from '@/lib/utils';
import type { StaffTaskRow } from '@/lib/data/staff';
import type { ProjectOption, StaffOption } from '@/lib/data/reference';

const dueToneClass: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

export function StaffTasksCard({
  staffId,
  tasks,
  staffOptions,
  projects,
  canManage,
}: {
  staffId: string;
  tasks: StaffTaskRow[];
  staffOptions: StaffOption[];
  projects: ProjectOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [target, setTarget] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const others: ComboOption[] = staffOptions
    .filter((s) => s.id !== staffId && s.is_active)
    .map((s) => ({ value: s.id, label: s.full_name }));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reassign() {
    if (!target || selected.size === 0) return;
    setPending(true);
    const res = await reassignTasks([...selected], staffId, target);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(selected.size === 1 ? 'Task reassigned' : 'Tasks reassigned');
    setSelected(new Set());
    setTarget(null);
    router.refresh();
  }

  async function remove(taskId: string) {
    const res = await unassignTaskFromStaff(taskId, staffId);
    if (!res.ok) return toast.error(res.error);
    toast.success('Assignment removed');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <CreateTaskDialog staffId={staffId} projects={projects} />
          <AssignTaskDialog staffId={staffId} projects={projects} />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-44">
              <Combobox options={others} value={target} onChange={setTarget} placeholder="Reassign to…" emptyText="No other staff" />
            </div>
            <Button size="sm" onClick={reassign} disabled={!target || selected.size === 0 || pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reassign{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No open tasks" />
      ) : (
        <div className="divide-y rounded-lg border">
          {tasks.map((t) => {
            const due = describeDue(t.due_date);
            return (
              <div key={t.id} className="flex items-center gap-3 p-2.5">
                {canManage && (
                  <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={`Select ${t.name}`} />
                )}
                <Link href={`/projects/${t.project_id}?tab=tasks`} className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.project_number ? `${t.project_number} · ${t.project_name}` : '—'}
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <MetaBadge meta={TASK_STATUS[t.status]} />
                  <span className={cn('hidden whitespace-nowrap text-xs sm:inline', dueToneClass[due.tone])}>{due.label}</span>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => remove(t.id)}
                      title="Remove assignment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
