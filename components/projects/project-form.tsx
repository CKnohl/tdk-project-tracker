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
import { PROJECT_STATUS, WORKFLOW_STATE, PROJECT_PHASE, PHASE_ORDER } from '@/lib/constants';
import { projectSchema } from '@/lib/validators';
import { createProject, updateProject } from '@/lib/actions/projects';
import type { CompanyOption, StaffOption } from '@/lib/data/reference';
import type { ProjectListItem } from '@/lib/types';

const INACTIVE_REASONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'lost_bid', label: 'Lost Bid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'fell_through', label: 'Fell Through' },
];

const NONE = '__none__';

export function ProjectForm({
  companies,
  staff,
  project,
  assignedStaffIds = [],
  onSuccess,
}: {
  companies: CompanyOption[];
  staff: StaffOption[];
  project?: ProjectListItem;
  assignedStaffIds?: string[];
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [form, setForm] = React.useState({
    project_number: project?.project_number ?? '',
    name: project?.name ?? '',
    company_id: String(project?.company_id ?? companies[0]?.id ?? ''),
    status: project?.status ?? 'active',
    phase: project?.phase ?? 'proposal',
    workflow_state: project?.workflow_state ?? 'normal',
    project_manager_id: project?.project_manager_id ?? NONE,
    target_completion_date: project?.target_completion_date ?? '',
    inactive_reason: project?.inactive_reason ?? NONE,
    description: project?.description ?? '',
    scope: project?.scope ?? '',
    staff_ids: assignedStaffIds,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const staffOptions = staff.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const input = {
      project_number: form.project_number,
      name: form.name,
      company_id: Number(form.company_id),
      status: form.status,
      phase: form.phase,
      workflow_state: form.workflow_state,
      project_manager_id: form.project_manager_id === NONE ? undefined : form.project_manager_id,
      target_completion_date: form.target_completion_date || undefined,
      inactive_reason: form.inactive_reason === NONE ? undefined : (form.inactive_reason as never),
      description: form.description || undefined,
      scope: form.scope || undefined,
      staff_ids: form.staff_ids,
    };
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (map[String(i.path[0])] = i.message));
      setErrors(map);
      return;
    }

    setPending(true);
    const res = project ? await updateProject(project.id, parsed.data) : await createProject(parsed.data);
    setPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(project ? 'Project updated' : 'Project created');
    const id = 'id' in res ? res.id : undefined;
    if (onSuccess && id) onSuccess(id);
    else if (id) router.push(`/projects/${id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project Number" required error={errors.project_number} htmlFor="pn">
          <Input id="pn" value={form.project_number} onChange={(e) => set('project_number', e.target.value)} placeholder="2026021" />
        </Field>
        <Field label="Project Name" required error={errors.name} htmlFor="pname">
          <Input id="pname" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="West Herr - Clay" />
        </Field>
        <Field label="Company" required error={errors.company_id}>
          <Select value={form.company_id} onValueChange={(v) => set('company_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Project Manager" error={errors.project_manager_id}>
          <Select value={form.project_manager_id} onValueChange={(v) => set('project_manager_id', v)}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status" error={errors.status}>
          <Select value={form.status} onValueChange={(v) => set('status', v as typeof form.status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(PROJECT_STATUS).map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {form.status === 'inactive' ? (
          <Field label="Inactive Reason" required error={errors.inactive_reason}>
            <Select value={form.inactive_reason} onValueChange={(v) => set('inactive_reason', v as typeof form.inactive_reason)}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                {INACTIVE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Field label="Workflow State" error={errors.workflow_state}>
            <Select value={form.workflow_state} onValueChange={(v) => set('workflow_state', v as typeof form.workflow_state)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(WORKFLOW_STATE).map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Phase" error={errors.phase}>
          <Select value={form.phase} onValueChange={(v) => set('phase', v as typeof form.phase)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHASE_ORDER.map((p) => (
                <SelectItem key={p} value={p}>{PROJECT_PHASE[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Target Completion" error={errors.target_completion_date}>
          <Input type="date" value={form.target_completion_date} onChange={(e) => set('target_completion_date', e.target.value)} />
        </Field>
      </div>

      <Field label="Assigned Staff">
        <MultiSelect options={staffOptions} selected={form.staff_ids} onChange={(v) => set('staff_ids', v)} placeholder="Assign team members" />
      </Field>

      <Field label="Description / Scope" error={errors.description}>
        <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Brief description or scope notes…" />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}
