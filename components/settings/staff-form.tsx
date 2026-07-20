'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { staffSchema } from '@/lib/validators';
import { createStaff, updateStaff } from '@/lib/actions/staff';
import type { CompanyOption } from '@/lib/data/reference';

const NONE = '__none__';

interface StaffVM {
  id: string;
  full_name: string;
  initials: string | null;
  email: string | null;
  company_id: number | null;
  phone?: string | null;
}

export function StaffForm({
  companies,
  staff,
  onSuccess,
}: {
  companies: CompanyOption[];
  staff?: StaffVM;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({
    full_name: staff?.full_name ?? '',
    initials: staff?.initials ?? '',
    email: staff?.email ?? '',
    company_id: staff?.company_id ? String(staff.company_id) : NONE,
    phone: staff?.phone ?? '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const input = {
      full_name: form.full_name,
      initials: form.initials || undefined,
      email: form.email || undefined,
      company_id: form.company_id === NONE ? undefined : Number(form.company_id),
      phone: form.phone || undefined,
    };
    const parsed = staffSchema.safeParse(input);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Invalid input');
    setPending(true);
    const res = staff ? await updateStaff(staff.id, parsed.data) : await createStaff(parsed.data);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(staff ? 'Staff updated' : 'Staff added');
    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name" required error={error}>
        <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Jane Doe" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Initials" hint="Auto-derived if blank">
          <Input value={form.initials} onChange={(e) => set('initials', e.target.value)} maxLength={4} placeholder="JD" />
        </Field>
        <Field label="Company">
          <Select value={form.company_id} onValueChange={(v) => set('company_id', v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@tdkengineering.com" />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(315) 555-0100" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {staff ? 'Save' : 'Add staff'}
        </Button>
      </div>
    </form>
  );
}
