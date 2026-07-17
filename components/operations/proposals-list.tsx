'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, X, MessageSquare, Search, Ban, FolderInput, Quote, Check, Undo2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { updateProposal, rejectProposal, commentOnProposal } from '@/lib/actions/proposals';
import { approveProposal, undoProposalApproval } from '@/lib/actions/proposal-apply';
import { TYPE_LABEL, band, detailOf, destination, canApply, appliedLink } from '@/components/operations/proposal-shared';
import { cn, formatDate } from '@/lib/utils';
import type { IntakeProposalItem } from '@/lib/data/proposals';
import type { ProjectOption } from '@/lib/data/reference';

// V6 Phase 1 — displays the proposals from interpreting a document. These are SUGGESTIONS
// only: editing/rejecting/commenting touch the proposal row alone. NOTHING is ever written
// to a project, task, submittal, note, or the calendar here. Confidence is shown as a band,
// never a number (charter IR-12).

export function ProposalsList({ proposals, projects }: { proposals: IntakeProposalItem[]; projects: ProjectOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<IntakeProposalItem | null>(null);
  const [commenting, setCommenting] = React.useState<string | null>(null);
  const [commentText, setCommentText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Edit dialog fields.
  const [eTitle, setETitle] = React.useState('');
  const [eDetails, setEDetails] = React.useState('');
  const [eDue, setEDue] = React.useState('');
  const [eAssignee, setEAssignee] = React.useState('');
  const [eProjectId, setEProjectId] = React.useState<string | null>(null);
  const [eProjQuery, setEProjQuery] = React.useState('');

  function openEdit(p: IntakeProposalItem) {
    setEditing(p);
    setETitle(p.title);
    setEDetails(detailOf(p.fields));
    setEDue(p.suggested_due_date ?? '');
    setEAssignee(p.suggested_assignee ?? '');
    setEProjectId(p.matched_project_id);
    setEProjQuery('');
  }

  async function saveEdit() {
    if (!editing) return;
    if (!eTitle.trim()) return toast.error('Title is required.');
    setBusy(true);
    const res = await updateProposal(editing.id, {
      title: eTitle, details: eDetails, due_date: eDue || null, assignee: eAssignee || null, project_id: eProjectId,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Proposal updated');
    setEditing(null);
    router.refresh();
  }

  async function reject(p: IntakeProposalItem) {
    const res = await rejectProposal(p.id);
    if (!res.ok) return toast.error(res.error);
    toast.success('Proposal rejected');
    router.refresh();
  }

  async function saveComment(id: string) {
    setBusy(true);
    const res = await commentOnProposal(id, commentText);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setCommenting(null);
    setCommentText('');
    router.refresh();
  }

  async function approve(p: IntakeProposalItem) {
    const chk = canApply(p);
    if (!chk.ok) return toast.error(chk.reason);
    setBusy(true);
    const res = await approveProposal(p.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Applied to the tracker');
    router.refresh();
  }
  async function undo(p: IntakeProposalItem) {
    setBusy(true);
    const res = await undoProposalApproval(p.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Undone — the created item was removed');
    router.refresh();
  }

  const q = eProjQuery.trim().toLowerCase();
  const filteredProjects = (q
    ? projects.filter((p) => p.name.toLowerCase().includes(q) || p.project_number.toLowerCase().includes(q))
    : projects
  ).slice(0, 8);

  if (proposals.length === 0) return null;

  return (
    <div className="space-y-2 border-t bg-muted/30 px-3 py-3">
      <p className="text-xs text-muted-foreground">
        Interpreted — <span className="font-medium text-foreground">nothing has been changed.</span> These are suggestions to review, like a junior engineer&apos;s recommendations.
      </p>

      {proposals.map((p) => {
        const b = band(p.confidence);
        const rejected = p.state === 'rejected';
        const archived = p.state === 'archived';
        const applied = p.state === 'approved';
        const approvable = canApply(p);
        const detail = detailOf(p.fields);
        return (
          <div key={p.id} className={cn('rounded-md border bg-card p-3', (rejected || archived) && 'opacity-55')}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {TYPE_LABEL[p.proposal_type]}
              </span>
              {p.category && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{p.category}</span>}
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', b.cls)}>{b.label}</span>
              {p.state === 'edited' && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">Edited</span>}
              {applied && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Applied</span>}
              {rejected && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Rejected</span>}
              {archived && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Archived</span>}
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <FolderInput className="h-3.5 w-3.5" /> {destination(p)}
              </span>
            </div>

            <div className={cn('mt-1.5 text-sm font-medium', rejected && 'line-through')}>{p.title}</div>
            {detail && <div className="text-xs text-muted-foreground">{detail}</div>}

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {p.suggested_assignee && <span>Assignee: {p.suggested_assignee}</span>}
              {p.suggested_due_date && <span>Due: {formatDate(p.suggested_due_date)}</span>}
            </div>

            {p.reasoning && <div className="mt-1 text-xs text-muted-foreground"><span className="font-medium">Why:</span> {p.reasoning}</div>}
            {p.source_text && (
              <div className="mt-1 flex gap-1.5 rounded border-l-2 border-muted-foreground/30 bg-muted/50 px-2 py-1 text-xs italic text-muted-foreground">
                <Quote className="mt-0.5 h-3 w-3 shrink-0" /> <span className="min-w-0">{p.source_text}</span>
              </div>
            )}
            {p.uncertainties && <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">Uncertain: {p.uncertainties}</div>}
            {p.comment && <div className="mt-1 text-xs"><span className="font-medium">Your note:</span> {p.comment}</div>}

            {applied ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Created a {TYPE_LABEL[p.applied_entity_type ?? p.proposal_type]}.</span>
                <Button asChild variant="outline" size="sm" className="h-7">
                  <Link href={appliedLink(p)}>View created <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                </Button>
                <Button variant="ghost" size="sm" className="h-7" disabled={busy} onClick={() => undo(p)}><Undo2 className="h-3.5 w-3.5" /> Undo</Button>
              </div>
            ) : (!rejected && !archived) ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button size="sm" className="h-7" disabled={busy || !approvable.ok} title={approvable.ok ? undefined : approvable.reason} onClick={() => approve(p)}>
                  <Check className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button variant="outline" size="sm" className="h-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button variant="outline" size="sm" className="h-7" onClick={() => { setCommenting(p.id); setCommentText(p.comment ?? ''); }}>
                  <MessageSquare className="h-3.5 w-3.5" /> Comment
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => reject(p)}><Ban className="h-3.5 w-3.5" /> Reject</Button>
                {!approvable.ok && <span className="text-[11px] text-muted-foreground">{approvable.reason}</span>}
              </div>
            ) : null}

            {commenting === p.id && (
              <div className="mt-2 space-y-1.5">
                <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} placeholder="Add a note for review…" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-7" onClick={() => { setCommenting(null); setCommentText(''); }}>Cancel</Button>
                  <Button size="sm" className="h-7" disabled={busy} onClick={() => saveComment(p.id)}>Save note</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit dialog — edits the proposal only, never a tracker record */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit proposal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={eTitle} onChange={(e) => setETitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Details</label>
              <Textarea value={eDetails} onChange={(e) => setEDetails(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Due date</label>
                <Input type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                <Input value={eAssignee} onChange={(e) => setEAssignee(e.target.value)} placeholder="Name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Destination project</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={eProjQuery} onChange={(e) => setEProjQuery(e.target.value)} placeholder="Search projects…" className="pl-8" />
              </div>
              <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-md border p-1">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEProjectId(p.id)}
                    className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                      eProjectId === p.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                  >
                    <span className={cn('font-mono text-xs', eProjectId === p.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{p.project_number}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}><X className="h-4 w-4" /> Cancel</Button>
              <Button size="sm" disabled={busy} onClick={saveEdit}>{busy ? 'Saving…' : 'Save proposal'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
