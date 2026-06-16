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
import { CONTACT_ROLE } from '@/lib/constants';
import { contactSchema } from '@/lib/validators';
import { createContact, updateContact } from '@/lib/actions/contacts';
import type { ContactItem } from '@/lib/types';
import type { ContactRole } from '@/types/database.types';

export function ContactForm({
  projectId,
  contact,
  onSuccess,
}: {
  projectId: string;
  contact?: ContactItem;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    name: contact?.name ?? '',
    company: contact?.company ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    role: (contact?.role ?? 'other') as ContactRole,
    notes: contact?.notes ?? '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const input = {
      project_id: projectId,
      name: form.name,
      company: form.company || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      role: form.role,
      notes: form.notes || undefined,
    };
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setPending(true);
    const res = contact ? await updateContact(contact.id, parsed.data) : await createContact(parsed.data);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(contact ? 'Contact updated' : 'Contact added');
    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required error={error}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Doug Reith" />
        </Field>
        <Field label="Role">
          <Select value={form.role} onValueChange={(v) => set('role', v as ContactRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONTACT_ROLE).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Company">
          <Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="CNY Surveyors" />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Email" className="col-span-2">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {contact ? 'Save' : 'Add contact'}
        </Button>
      </div>
    </form>
  );
}
