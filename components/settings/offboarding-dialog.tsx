'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRightLeft, UserX, FolderKanban, ListChecks, FileStack, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Combobox } from '@/components/shared/combobox';
import { getOffboardingImpact, setStaffActive, transferOwnership, type OffboardingImpact } from '@/lib/actions/staff';

interface StaffLite {
  id: string;
  full_name: string;
}

/**
 * Offboarding checklist — shown BEFORE deactivating someone, so "where does their
 * work go?" is answered up front instead of discovered later:
 *  - Transfer & deactivate hands their whole book to a colleague first
 *    (atomic transfer_staff_ownership), or
 *  - Deactivate without transfer keeps every assignment in place: history stays
 *    in their name, displays stop showing them as assigned, projects they managed
 *    are flagged on the dashboard (with a suggested new manager), and admins/PMs
 *    are alerted. Reactivating brings their open assignments straight back.
 */
export function OffboardingDialog({
  person,
  activeStaff,
  onClose,
}: {
  person: StaffLite | null;
  activeStaff: StaffLite[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [impact, setImpact] = React.useState<OffboardingImpact | null>(null);
  const [to, setTo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setImpact(null);
    setTo(null);
    if (!person) return;
    getOffboardingImpact(person.id).then((res) => {
      if (res.ok) setImpact(res.data);
      else toast.error(res.error);
    });
  }, [person]);

  const options = activeStaff.filter((s) => s.id !== person?.id).map((s) => ({ value: s.id, label: s.full_name }));
  const hasWork =
    !!impact &&
    (impact.managedProjects.length > 0 || impact.leadOf > 0 || impact.openTasks > 0 || impact.openSubmittals > 0 || impact.pendingReviews > 0);

  function close() {
    if (!busy) onClose();
  }

  async function deactivate(withTransfer: boolean) {
    if (!person || busy) return;
    setBusy(true);
    try {
      if (withTransfer) {
        if (!to) return;
        const t = await transferOwnership(person.id, to);
        if (!t.ok) return void toast.error(t.error);
      }
      const res = await setStaffActive(person.id, false);
      if (!res.ok) return void toast.error(res.error);
      toast.success(
        withTransfer
          ? `Book transferred and ${person.full_name} deactivated`
          : `${person.full_name} deactivated — their projects are flagged for reassignment`,
      );
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deactivate {person?.full_name}</DialogTitle>
        </DialogHeader>

        {!impact ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Checking their current responsibilities…
          </p>
        ) : (
          <div className="space-y-4">
            {hasWork ? (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                {impact.managedProjects.length > 0 && (
                  <div className="flex items-start gap-2">
                    <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      Manages <span className="font-medium">{impact.managedProjects.length}</span> active project{impact.managedProjects.length === 1 ? '' : 's'}:
                      <span className="text-muted-foreground"> {impact.managedProjects.map((p) => p.project_number).join(', ')}</span>
                    </div>
                  </div>
                )}
                {impact.leadOf > 0 && (
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>Project Lead on <span className="font-medium">{impact.leadOf}</span></span>
                  </div>
                )}
                {impact.openTasks > 0 && (
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span><span className="font-medium">{impact.openTasks}</span> open task{impact.openTasks === 1 ? '' : 's'} assigned</span>
                  </div>
                )}
                {impact.openSubmittals > 0 && (
                  <div className="flex items-center gap-2">
                    <FileStack className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span><span className="font-medium">{impact.openSubmittals}</span> open submittal{impact.openSubmittals === 1 ? '' : 's'} assigned</span>
                  </div>
                )}
                {impact.pendingReviews > 0 && (
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span><span className="font-medium">{impact.pendingReviews}</span> task{impact.pendingReviews === 1 ? '' : 's'} they sent for review still pending</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">
                No active projects, open tasks, or pending reviews — safe to deactivate.
              </p>
            )}

            {hasWork && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Transfer their book to (recommended)</label>
                <Combobox options={options} value={to} onChange={setTo} placeholder="Choose a colleague…" emptyText="No other active staff" />
                <p className="text-[11px] text-muted-foreground">
                  Moves manager role, team membership, task and submittal assignments in one atomic step.
                </p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Nothing is deleted either way: completed work and history stay in their name, and
              reactivating restores their open assignments. Without a transfer, their projects are
              flagged on the dashboard and each project&apos;s open tasks can be reassigned there.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={close} disabled={busy}>Cancel</Button>
              <Button variant="outline" size="sm" onClick={() => deactivate(false)} disabled={busy}>
                <UserX className="h-4 w-4" /> Deactivate only
              </Button>
              {hasWork && (
                <Button size="sm" onClick={() => deactivate(true)} disabled={busy || !to}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />} Transfer &amp; deactivate
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
