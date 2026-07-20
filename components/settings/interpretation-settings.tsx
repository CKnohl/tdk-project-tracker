'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { setInterpretationEnabled } from '@/lib/actions/settings';

// Admin toggle for document interpretation (Settings → Operations). The switch is the
// human gate; the server additionally requires a paid service key configured in the
// server environment before any document text can leave the building. Provider details
// live in docs/INTERPRETATION_RUNBOOK.md, not in the UI.

export function InterpretationSettings({ enabled, keyConfigured }: { enabled: boolean; keyConfigured: boolean }) {
  const router = useRouter();
  const [on, setOn] = React.useState(enabled);
  const [pending, setPending] = React.useState(false);

  async function toggle(next: boolean) {
    setPending(true);
    setOn(next);
    const res = await setInterpretationEnabled(next);
    setPending(false);
    if (!res.ok) {
      setOn(!next);
      return toast.error(res.error);
    }
    toast.success(next ? 'Operations Center turned on' : 'Operations Center turned off and hidden');
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Operations Center &amp; document interpretation</p>
            <p className="text-xs text-muted-foreground">
              Shows the Operations Center (document intake queue) to Project Managers and Admins,
              and — once a service key is configured — reads intake documents to draft suggested
              tracker updates for review. Suggestions are never applied without a person approving
              them. Turning this off hides the Operations Center everywhere; its documents and
              proposals are kept.
            </p>
          </div>
          <Switch checked={on} disabled={pending} onCheckedChange={toggle} aria-label="Operations Center and document interpretation" />
        </div>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {keyConfigured ? (
            <>Service key: <span className="font-medium text-foreground">configured</span>. Interpretation runs when the switch above is on.</>
          ) : (
            <>
              Service key: <span className="font-medium text-foreground">not configured</span> — interpretation stays
              inactive even when switched on. It requires a paid service key purchased for the office and added to the
              server environment. Setup steps and costs: <span className="font-mono">docs/INTERPRETATION_RUNBOOK.md</span>.
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
