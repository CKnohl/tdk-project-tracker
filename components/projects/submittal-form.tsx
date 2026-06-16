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
import { SUBMITTAL_STATUS } from '@/lib/constants';
import { submittalSchema } from '@/lib/validators';
import { createSubmittal, updateSubmittal } from '@/lib/actions/submittals';
import type { StaffOption } from '@/lib/data/reference';
import type { SubmittalWithProject } from '@/lib/types';

const NONE = '__none__';

export function SubmittalForm({
  projectId,
  staff,
  submittal,
  onSuccess,
}: {
  projectId: string;
  staff: StaffOption[];
  submittal?: SubmittalWithProject;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    submission_type: submittal?.submission_type ?? '',
    agency: submittal?.agency ?? '',
    submission_date: submittal?.submission_date ?? '',
    response_due_date: submittal?.response_due_date ?? '',
    follow_up_date: submittal?.follow_up_date ?? '',
    assigned_staff_id: submittal?.assigned_staff_id ?? NONE,
    status: submittal?.status ?? 'drafting',
    notes: submittal?.notes ?? '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const input = {
      project_id: projectId,
      submission_type: form.submission_type,
      agency: form.agency || undefined,
      submission_date: form.submission_date || undefined,
      response_due_date: form.response_due_date || undefined,
      follow_up_date: form.follow_up_date || undefined,
      assigned_staff_id: form.assigned_staff_id === NONE ? undefined : form.assigned_staff_id,
      status: form.status,
      notes: form.notes || undefined,
    };
    const parsed = submittalSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setPending(true);
    const res = submittal ? await updateSubmittal(submittal.id, parsed.data) : await createSubmittal(parsed.data);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(submittal ? 'Submittal updated' : 'Submittal added');
    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Submission type" required error={error}>
        <Input value={form.submission_type} onChange={(e) => set('submission_type', e.target.value)} placeholder="Planning Board, NYSDOT Permit, FOIL Request…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Agency">
          <Input value={form.agency} onChange={(e) => set('agency', e.target.value)} placeholder="Town Planning Board" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v as typeof form.status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(SUBMITTAL_STATUS).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Submission date">
          <Input type="date" value={form.submission_date} onChange={(e) => set('submission_date', e.target.value)} />
        </Field>
        <Field label="Response due">
          <Input type="date" value={form.response_due_date} onChange={(e) => set('response_due_date', e.target.value)} />
        </Field>
        <Field label="Follow-up date">
          <Input type="date" value={form.follow_up_date} onChange={(e) => set('follow_up_date', e.target.value)} />
        </Field>
        <Field label="Assigned staff">
          <Select value={form.assigned_staff_id} onValueChange={(v) => set('assigned_staff_id', v)}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unassigned</SelectItem>
              {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submittal ? 'Save' : 'Add submittal'}
        </Button>
      </div>
    </form>
  );
}
