'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MetaBadge } from '@/components/shared/meta-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { SubmittalForm } from '../submittal-form';
import { SubmittalDetailDialog } from './submittal-detail-dialog';
import { SUBMITTAL_STATUS } from '@/lib/constants';
import { formatDate, describeDue, cn } from '@/lib/utils';
import { deleteSubmittal } from '@/lib/actions/submittals';
import type { StaffOption } from '@/lib/data/reference';
import type { SubmittalWithProject, SubmittalHistoryItem } from '@/lib/types';

const dueTone: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-foreground',
  none: 'text-muted-foreground',
};

export function SubmittalsTab({
  projectId,
  submittals,
  history,
  staff,
  canEdit,
  canManage,
}: {
  projectId: string;
  submittals: SubmittalWithProject[];
  history: Record<string, SubmittalHistoryItem[]>;
  staff: StaffOption[];
  canEdit: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<SubmittalWithProject | null>(null);
  const [viewing, setViewing] = React.useState<SubmittalWithProject | null>(null);

  async function onDelete(s: SubmittalWithProject) {
    if (!confirm(`Delete submittal "${s.submission_type}"?`)) return;
    const res = await deleteSubmittal(s.id, projectId);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Submittal deleted'); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> Add submittal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New submittal</DialogTitle></DialogHeader>
              <SubmittalForm projectId={projectId} staff={staff} onSuccess={() => setAdding(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {submittals.length === 0 ? (
        <EmptyState icon={Building} title="No submittals tracked" />
      ) : (
        <div className="space-y-2">
          {submittals.map((s) => {
            const due = describeDue(s.response_due_date);
            return (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setViewing(s)} className="min-w-0 flex-1 rounded text-left transition-opacity hover:opacity-70">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.submission_type}</span>
                      <MetaBadge meta={SUBMITTAL_STATUS[s.status]} />
                    </div>
                    {s.agency && <div className="text-xs text-muted-foreground">{s.agency}</div>}
                    <div className="mt-1 text-sm">
                      <span className="mr-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Due Date</span>
                      <span className={cn('font-semibold', dueTone[due.tone])}>{due.label}</span>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div><span className="block text-[10px] uppercase">Date Submitted</span>{formatDate(s.submission_date)}</div>
                  <div><span className="block text-[10px] uppercase">Follow-Up Date</span>{formatDate(s.follow_up_date)}</div>
                  <div><span className="block text-[10px] uppercase">Assigned</span>{s.assigned?.full_name ?? '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit submittal</DialogTitle></DialogHeader>
          {editing && <SubmittalForm projectId={projectId} staff={staff} submittal={editing} onSuccess={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <SubmittalDetailDialog
        submittal={viewing}
        history={viewing ? history[viewing.id] ?? [] : []}
        canEdit={canEdit}
        onClose={() => setViewing(null)}
        onEdit={(s) => setEditing(s)}
      />
    </div>
  );
}
