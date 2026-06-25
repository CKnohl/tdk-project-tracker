'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ClipboardCheck, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { formatDate } from '@/lib/utils';
import { approveTask, rejectTask } from '@/lib/actions/reviews';
import { celebrate } from '@/lib/confetti';
import type { ReviewQueueItem } from '@/lib/data/my-work';

/** Tasks awaiting the current user's review (PM / Project Lead), with inline approve/reject. */
export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  const router = useRouter();
  const [rejecting, setRejecting] = React.useState<ReviewQueueItem | null>(null);
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function approve(t: ReviewQueueItem) {
    if (!t.project_id) return;
    setBusy(true);
    const res = await approveTask(t.id, t.project_id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    celebrate();
    toast.success('Task approved');
    router.refresh();
  }

  async function submitReject() {
    if (!rejecting?.project_id) return;
    setBusy(true);
    const res = await rejectTask(rejecting.id, rejecting.project_id, comment);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Changes requested');
    setRejecting(null);
    setComment('');
    router.refresh();
  }

  return (
    <Card className="border-l-4 border-l-violet-500 p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        Awaiting your review
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {items.length}
        </span>
      </h2>
      <div className="-mx-2 divide-y divide-border/50">
        {items.map((t) => {
          const days = t.review_requested_at
            ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(t.review_requested_at)))
            : null;
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent/50">
              <Link
                href={t.project_id ? `/projects/${t.project_id}?tab=tasks` : '/tasks'}
                className="min-w-0 flex-1 rounded transition-opacity hover:opacity-70"
              >
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.project ? `${t.project.project_number} · ${t.project.name}` : '—'}
                  {t.submitter ? ` · ${t.submitter}` : ''}
                  {t.review_requested_at ? ` · ${formatDate(t.review_requested_at)}` : ''}
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <PriorityBadge priority={t.priority} />
                {days !== null && (
                  <span className="whitespace-nowrap" title="Days waiting">{days === 0 ? 'today' : `${days}d`}</span>
                )}
                {t.project_id && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950"
                      disabled={busy}
                      title="Approve"
                      aria-label="Approve task"
                      onClick={() => approve(t)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      disabled={busy}
                      title="Request changes"
                      aria-label="Request changes"
                      onClick={() => setRejecting(t)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) { setRejecting(null); setComment(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request changes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Explain what needs to change before this can be approved. Required, added to the task&rsquo;s review history, and the assignee is notified.
            </p>
            <Textarea autoFocus value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="What needs revision?" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRejecting(null); setComment(''); }}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={busy || comment.trim().length < 3}
                onClick={submitReject}
              >
                Send back for changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
