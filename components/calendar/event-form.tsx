'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/shared/combobox';
import { Field } from '@/components/shared/field';
import { calendarEventSchema } from '@/lib/validators';
import { createCalendarEvent, updateCalendarEvent } from '@/lib/actions/calendar';
import type { CalendarEventRow } from '@/types/database.types';

const NONE = '__none__';
const TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'town_meeting', label: 'Town Meeting' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'custom', label: 'Custom' },
];

const toLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function EventForm({
  projects,
  event,
  onSuccess,
}: {
  projects: { id: string; project_number: string; name: string }[];
  event?: CalendarEventRow;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    event_type: event?.event_type ?? 'meeting',
    start_at: toLocal(event?.start_at),
    end_at: toLocal(event?.end_at),
    all_day: event?.all_day ?? false,
    project_id: event?.project_id ?? NONE,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const input = {
      title: form.title,
      description: form.description || undefined,
      event_type: form.event_type,
      start_at: form.start_at,
      end_at: form.end_at || undefined,
      all_day: form.all_day,
      project_id: form.project_id === NONE ? undefined : form.project_id,
    };
    const parsed = calendarEventSchema.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Invalid input');
    setPending(true);
    const res = event ? await updateCalendarEvent(event.id, parsed.data) : await createCalendarEvent(parsed.data);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(event ? 'Event updated' : 'Event added');
    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" required error={error}>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Site visit with contractor" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={form.event_type} onValueChange={(v) => set('event_type', v as typeof form.event_type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Project">
          {/* Searchable — the office has 100+ projects; scrolling a plain select doesn't scale. */}
          <Combobox
            options={[{ value: NONE, label: 'None' }, ...projects.map((p) => ({ value: p.id, label: `${p.project_number} · ${p.name}` }))]}
            value={form.project_id}
            onChange={(v) => set('project_id', v)}
            placeholder="None"
            emptyText="No matching projects"
          />
        </Field>
        <Field label="Start">
          <Input type="datetime-local" value={form.start_at} onChange={(e) => set('start_at', e.target.value)} />
        </Field>
        <Field label="End (optional)">
          <Input type="datetime-local" value={form.end_at} onChange={(e) => set('end_at', e.target.value)} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {event ? 'Save' : 'Add event'}
        </Button>
      </div>
    </form>
  );
}
