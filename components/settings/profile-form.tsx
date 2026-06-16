'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { updateProfile } from '@/lib/actions/settings';

export function ProfileForm({ fullName, email, role }: { fullName: string; email: string; role: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = React.useState(fullName);
  const [pending, setPending] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  async function save() {
    setPending(true);
    const res = await updateProfile(name);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Profile updated');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Field label="Email"><Input value={email} disabled /></Field>
      <Field label="Role"><Input value={role} disabled /></Field>
      <Field label="Display name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Theme">
        <Select value={mounted ? theme : 'system'} onValueChange={setTheme}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending || name.trim() === fullName.trim()}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </Button>
      </div>
    </div>
  );
}
