'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building, History as HistoryIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MetaBadge } from '@/components/shared/meta-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { SubmittalForm } from '../submittal-form';
import { SUBMITTAL_STATUS } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/utils';
import { deleteSubmittal } from '@/lib/actions/submittals';
import type { StaffOption } from '@/lib/data/reference';
import type { SubmittalWithProject, SubmittalHistoryItem } from '@/lib/types';

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
  const [historyFor, setHistoryFor] = React.useState<SubmittalWithProject | null>(null);

  async function onDelete(s: SubmittalWithProject) {
    if (!confirm(`Delete submittal "${s.submission_type}"?`)) return;
    const res = await deleteSubmittal(s.id, projectId);
    if (!res.ok) toast.error(res.error);
    else { toast.success('Submittal deleted'); router.refresh(); }
  }

  const timeline = historyFor ? history[historyFor.id] ?? [] : [];

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
            const changes = history[s.id]?.length ?? 0;
            return (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.submission_type}</span>
                      <MetaBadge meta={SUBMITTAL_STATUS[s.status]} />
                    </div>
                    {s.agency && <div className="text-xs text-muted-foreground">{s.agency}</div>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => setHistoryFor(s)}>
                      <HistoryIcon className="h-4 w-4" /> History{changes ? ` (${changes})` : ''}
                    </Button>
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
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <div><span className="block text-[10px] uppercase">Submitted</span>{formatDate(s.submission_date)}</div>
                  <div><span className="block text-[10px] uppercase">Response Due</span>{formatDate(s.response_due_date)}</div>
                  <div><span className="block text-[10px] uppercase">Follow Up</span>{formatDate(s.follow_up_date)}</div>
                  <div><span className="block text-[10px] uppercase">Assigned</span>{s.assigned?.full_name ?? '—'}</div>
                </div>
                {s.notes && <p className="mt-2 text-sm text-muted-foreground">{s.notes}</p>}
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

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{historyFor?.submission_type} — status history</DialogTitle>
          </DialogHeader>
          {timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No status changes recorded yet.</p>
          ) : (
            <ol className="relative ml-2 space-y-4 border-l pl-6">
              {timeline.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <div className="flex items-center gap-2 text-sm">
                    {h.from_status ? (
                      <>
                        <MetaBadge meta={SUBMITTAL_STATUS[h.from_status]} />
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">created</span>
                    )}
                    <MetaBadge meta={SUBMITTAL_STATUS[h.to_status]} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(h.created_at)} · {h.actor?.full_name ?? 'System'}
                  </div>
                  {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
