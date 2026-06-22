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
import { Combobox, type ComboOption } from '@/components/shared/combobox';
import { Field } from '@/components/shared/field';
import { assignTaskToStaff, listProjectOpenTasks, type AssignableTask } from '@/lib/actions/workload';
import type { ProjectOption } from '@/lib/data/reference';

export function AssignTaskDialog({ staffId, projects }: { staffId: string; projects: ProjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [tasks, setTasks] = React.useState<AssignableTask[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const projectOptions: ComboOption[] = projects.map((p) => ({
    value: p.id,
    label: `${p.project_number} · ${p.name}`,
  }));
  const taskOptions: ComboOption[] = tasks
    .filter((t) => !t.assignees.includes(staffId))
    .map((t) => ({ value: t.id, label: t.name }));

  function reset() {
    setProjectId(null);
    setTaskId(null);
    setTasks([]);
  }

  async function onPickProject(id: string) {
    setProjectId(id);
    setTaskId(null);
    setLoadingTasks(true);
    const res = await listProjectOpenTasks(id);
    setLoadingTasks(false);
    if (!res.ok) {
      setTasks([]);
      return toast.error(res.error);
    }
    setTasks(res.data);
  }

  async function submit() {
    if (!taskId) return;
    setPending(true);
    const res = await assignTaskToStaff(taskId, staffId);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Task assigned');
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
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Assign task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Project">
            <Combobox
              options={projectOptions}
              value={projectId}
              onChange={onPickProject}
              placeholder="Select a project"
            />
          </Field>
          <Field label="Task">
            <Combobox
              options={taskOptions}
              value={taskId}
              onChange={setTaskId}
              placeholder={loadingTasks ? 'Loading…' : projectId ? 'Select a task' : 'Pick a project first'}
              emptyText={projectId ? 'No open, unassigned tasks' : 'Pick a project first'}
              disabled={!projectId || loadingTasks}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!taskId || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
