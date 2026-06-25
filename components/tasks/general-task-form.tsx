'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { MultiSelect } from '@/components/shared/multi-select';
import { TASK_STATUS, TASK_PRIORITY, TASK_RECURRENCE } from '@/lib/constants';
import { generalTaskSchema } from '@/lib/validators';
import { createGeneralTask, updateGeneralTask } from '@/lib/actions/general-tasks';
import type { StaffOption } from '@/lib/data/reference';
import type { TaskWithStaff } from '@/lib/types';

export function GeneralTaskForm({
  staff,
  task,
  onSuccess,
}: {
  staff: StaffOption[];
  task?: TaskWithStaff;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    name: task?.name ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? 'not_started',
    start_date: task?.start_date ?? '',
    due_date: task?.due_date ?? '',
    recurrence: task?.recurrence ?? 'none',
    staff_ids: (task?.assignees?.map((a) => a.staff?.id).filter(Boolean) as string[]) ?? [],
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const staffOptions = staff.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const input = {
      name: form.name,
      description: form.description || undefined,
      priority: form.priority,
      status: form.status,
      start_date: form.start_date || undefined,
      due_date: form.due_date || undefined,
      recurrence: form.recurrence,
      staff_ids: form.staff_ids,
    };
    const parsed = generalTaskSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setPending(true);
    const res = task ? await updateGeneralTask(task.id, parsed.data) : await createGeneralTask(parsed.data);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(task ? 'Task updated' : 'Task added');
    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Task name" required error={error}>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Update CAD standards, order supplies…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select value={form.priority} onValueChange={(v) => set('priority', v as typeof form.priority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(TASK_PRIORITY).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v as typeof form.status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(TASK_STATUS).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
        </Field>
        <Field label="Repeats" hint="Creates the next occurrence on completion">
          <Select value={form.recurrence} onValueChange={(v) => set('recurrence', v as typeof form.recurrence)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TASK_RECURRENCE).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Assignees">
        <MultiSelect options={staffOptions} selected={form.staff_ids} onChange={(v) => set('staff_ids', v)} placeholder="Assign staff" />
      </Field>
      <Field label="Description">
        <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {task ? 'Save' : 'Add task'}
        </Button>
      </div>
    </form>
  );
}
