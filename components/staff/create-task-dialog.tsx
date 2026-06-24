'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboOption } from '@/components/shared/combobox';
import { Field } from '@/components/shared/field';
import { TASK_PRIORITY, TASK_STATUS } from '@/lib/constants';
import { createTask } from '@/lib/actions/tasks';
import { createGeneralTask } from '@/lib/actions/general-tasks';
import type { ProjectOption } from '@/lib/data/reference';
import type { TaskPriority, TaskStatus } from '@/types/database.types';

const GENERAL = '__general__';

/**
 * Create a brand-new task directly from a staff profile, auto-assigned to that
 * staffer. Supports project tasks (pick a project) and general tasks ("General").
 */
export function CreateTaskDialog({ staffId, projects }: { staffId: string; projects: ProjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    project: GENERAL,
    name: '',
    description: '',
    due_date: '',
    priority: 'medium' as TaskPriority,
    status: 'not_started' as TaskStatus,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const projectOptions: ComboOption[] = [
    { value: GENERAL, label: 'General (no project)' },
    ...projects.map((p) => ({ value: p.id, label: `${p.project_number} · ${p.name}` })),
  ];

  function reset() {
    setForm({ project: GENERAL, name: '', description: '', due_date: '', priority: 'medium', status: 'not_started' });
    setError('');
  }

  async function submit() {
    if (form.name.trim().length < 2) {
      setError('Task name is required');
      return;
    }
    setPending(true);
    const common = {
      name: form.name,
      description: form.description || undefined,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || undefined,
      recurrence: 'none' as const,
      staff_ids: [staffId],
    };
    const res =
      form.project === GENERAL
        ? await createGeneralTask(common)
        : await createTask({ ...common, project_id: form.project, completion_pct: 0 });
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Task created and assigned');
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Create task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create &amp; assign a task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Project" hint="Choose “General (no project)” for office work.">
            <Combobox options={projectOptions} value={form.project} onChange={(v) => set('project', v)} placeholder="Select a project" />
          </Field>
          <Field label="Task name" required error={error}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Inventory survey equipment" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => set('priority', v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TASK_PRIORITY).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set('status', v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TASK_STATUS).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date">
              <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending || form.name.trim().length < 2}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create &amp; assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
