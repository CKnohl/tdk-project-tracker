'use client';

import { Pencil, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MetaBadge } from '@/components/shared/meta-badge';
import { SUBMITTAL_STATUS } from '@/lib/constants';
import { formatDate, formatDateTime, describeDue, cn } from '@/lib/utils';
import type { SubmittalWithProject, SubmittalHistoryItem } from '@/lib/types';

const dueTone: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-orange-600 dark:text-orange-400',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-foreground',
  none: 'text-muted-foreground',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

export function SubmittalDetailDialog({
  submittal,
  history,
  canEdit,
  onClose,
  onEdit,
}: {
  submittal: SubmittalWithProject | null;
  history: SubmittalHistoryItem[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: (s: SubmittalWithProject) => void;
}) {
  if (!submittal) return null;
  const s = submittal;
  const due = describeDue(s.response_due_date);

  return (
    <Dialog open={!!submittal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8">{s.submission_type}</DialogTitle>
        </DialogHeader>

        <div className="divide-y">
          <Row label="Status"><MetaBadge meta={SUBMITTAL_STATUS[s.status]} /></Row>
          <Row label="Agency">{s.agency || <span className="text-muted-foreground">—</span>}</Row>
          <Row label="Assigned">{s.assigned?.full_name ?? <span className="text-muted-foreground">Unassigned</span>}</Row>
          <Row label="Due Date">
            <span className={cn('font-medium', dueTone[due.tone])}>{due.label}</span>
          </Row>
          <Row label="Date Submitted">{s.submission_date ? formatDate(s.submission_date) : <span className="text-muted-foreground">—</span>}</Row>
          <Row label="Follow-Up Date">{s.follow_up_date ? formatDate(s.follow_up_date) : <span className="text-muted-foreground">—</span>}</Row>
          <Row label="Notes">
            {s.notes ? <p className="whitespace-pre-wrap">{s.notes}</p> : <span className="text-muted-foreground">—</span>}
          </Row>
          <Row label="History">
            {history.length === 0 ? (
              <span className="text-muted-foreground">No status changes recorded yet.</span>
            ) : (
              <ol className="relative ml-1 space-y-3 border-l pl-5">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="flex items-center gap-1.5 text-xs">
                      {h.from_status ? (
                        <>
                          <MetaBadge meta={SUBMITTAL_STATUS[h.from_status]} />
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      ) : (
                        <span className="text-muted-foreground">created</span>
                      )}
                      <MetaBadge meta={SUBMITTAL_STATUS[h.to_status]} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDateTime(h.created_at)} · {h.actor?.full_name ?? 'System'}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Row>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(s); }}>
              <Pencil className="h-4 w-4" /> Edit submittal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
