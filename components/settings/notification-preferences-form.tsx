'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateNotificationPreferences, type NotificationPrefsInput } from '@/lib/actions/settings';
import type { NotificationPrefs } from '@/lib/data/preferences';

const EMAIL_TYPES: { key: keyof NotificationPrefsInput; label: string; hint: string }[] = [
  { key: 'email_task_assigned', label: 'Task assigned', hint: 'When a task is assigned to you' },
  { key: 'email_task_completed', label: 'Task completed', hint: 'When a task on your projects is completed' },
  { key: 'email_project_assigned', label: 'Project assignment', hint: 'When you are added to a project' },
  { key: 'email_deadline_changed', label: 'Deadline changes', hint: 'When a task or project deadline moves' },
];

function Row({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export function NotificationPreferencesForm({ initial }: { initial: NotificationPrefs }) {
  const router = useRouter();
  const [prefs, setPrefs] = React.useState<NotificationPrefsInput>(initial);
  const [pending, setPending] = React.useState(false);

  const set = (key: keyof NotificationPrefsInput) => (v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: v }));

  const dirty = (Object.keys(prefs) as (keyof NotificationPrefsInput)[]).some(
    (k) => prefs[k] !== initial[k],
  );

  async function save() {
    setPending(true);
    const res = await updateNotificationPreferences(prefs);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Notification preferences saved');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="divide-y">
        <Row
          label="In-app notifications"
          hint="Show notifications in the app"
          checked={prefs.inapp_enabled}
          onChange={set('inapp_enabled')}
        />
        <Row
          label="Email notifications"
          hint="Master switch for all notification emails"
          checked={prefs.email_enabled}
          onChange={set('email_enabled')}
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Email me about
        </p>
        <div className="divide-y">
          {EMAIL_TYPES.map((t) => (
            <Row
              key={t.key}
              label={t.label}
              hint={t.hint}
              checked={prefs[t.key]}
              disabled={!prefs.email_enabled}
              onChange={set(t.key)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending || !dirty}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
        </Button>
      </div>
    </div>
  );
}
