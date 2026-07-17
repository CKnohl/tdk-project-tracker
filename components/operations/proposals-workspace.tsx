'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check, Ban, Archive, Trash2, X, ArrowUpRight, CheckSquare, Square, ChevronDown, FolderInput, Layers,
  Search, RotateCcw, ArrowDownUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { approveProposal, bulkApproveProposals } from '@/lib/actions/proposal-apply';
import { rejectProposal, restoreProposal, bulkRejectProposals, bulkArchiveProposals, bulkDeleteProposals } from '@/lib/actions/proposals';
import { TYPE_LABEL, STATE_LABEL, band, destination, canApply, appliedLink } from '@/components/operations/proposal-shared';
import { cn, formatDate } from '@/lib/utils';
import type { IntakeProposalItem } from '@/lib/data/proposals';
import type { ProposalType, ProposalState } from '@/types/database.types';

// V6 Phase 1.2 — PM review workspace. Filter / group / multi-select / bulk over ALL proposals.
// It does NOT change interpretation or the Apply Engine — bulk approve simply loops the same
// approveProposal (one write path); reject/archive/delete touch only the proposal store.

type FilterKey =
  | 'all' | 'needs_review' | 'high' | 'task' | 'submittal' | 'note' | 'calendar' | 'unknown'
  | 'applied' | 'rejected' | 'archived';
type GroupKey = 'document' | 'project' | 'type' | 'confidence' | 'status';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'needs_review', label: 'Needs review' }, { key: 'high', label: 'High confidence' },
  { key: 'task', label: 'Tasks' }, { key: 'submittal', label: 'Submittals' }, { key: 'note', label: 'Notes' },
  { key: 'calendar', label: 'Calendar' }, { key: 'unknown', label: 'Unknown' }, { key: 'applied', label: 'Applied' },
  { key: 'rejected', label: 'Rejected' }, { key: 'archived', label: 'Archived' },
];
const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'document', label: 'Document' }, { key: 'project', label: 'Project' }, { key: 'type', label: 'Type' },
  { key: 'confidence', label: 'Confidence' }, { key: 'status', label: 'Status' },
];

function matchesFilter(p: IntakeProposalItem, f: FilterKey): boolean {
  switch (f) {
    case 'all': return true;
    case 'needs_review': return p.state === 'proposed' || p.state === 'edited';
    case 'high': return p.confidence >= 80;
    case 'task': return p.proposal_type === 'task' || p.proposal_type === 'general_task';
    case 'submittal': return p.proposal_type === 'submittal';
    case 'note': return p.proposal_type === 'note';
    case 'calendar': return p.proposal_type === 'calendar_event';
    case 'unknown': return !p.matched_project_id;
    case 'applied': return p.state === 'approved';
    case 'rejected': return p.state === 'rejected';
    case 'archived': return p.state === 'archived';
  }
}
function groupOf(p: IntakeProposalItem, g: GroupKey): string {
  switch (g) {
    case 'document': return p.document?.file_name ?? 'Unknown document';
    case 'project': return p.matched_project ? `${p.matched_project.project_number} · ${p.matched_project.name}` : 'Unassigned';
    case 'type': return TYPE_LABEL[p.proposal_type];
    case 'confidence': return band(p.confidence).label;
    case 'status': return STATE_LABEL[p.state];
  }
}
const isActive = (s: ProposalState) => s === 'proposed' || s === 'edited';

type SortKey = 'recent' | 'confidence' | 'due';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Newest' }, { key: 'confidence', label: 'Confidence' }, { key: 'due', label: 'Due date' },
];
function matchesSearch(p: IntakeProposalItem, term: string): boolean {
  return [p.title, destination(p), p.suggested_assignee, p.reasoning, p.category, p.document?.file_name]
    .some((v) => !!v && v.toLowerCase().includes(term));
}

type ConfirmKind = 'approve' | 'reject' | 'archive' | 'delete';

export function ProposalsWorkspace({ proposals }: { proposals: IntakeProposalItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<FilterKey>('needs_review');
  const [group, setGroup] = React.useState<GroupKey>('document');
  const [sort, setSort] = React.useState<SortKey>('recent');
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirm, setConfirm] = React.useState<ConfirmKind | null>(null);
  const [results, setResults] = React.useState<{ applied: number; failed: number; failures: { id: string; error: string }[] } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const term = q.trim().toLowerCase();
  const filtered = React.useMemo(
    () => proposals.filter((p) => matchesFilter(p, filter) && (!term || matchesSearch(p, term))),
    [proposals, filter, term],
  );
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) =>
      sort === 'confidence' ? b.confidence - a.confidence
      : sort === 'due' ? (a.suggested_due_date ?? '9999-99-99').localeCompare(b.suggested_due_date ?? '9999-99-99')
      : b.created_at.localeCompare(a.created_at));
    return arr;
  }, [filtered, sort]);

  // Groups (insertion order preserved from the sorted list).
  const groups = React.useMemo(() => {
    const m = new Map<string, IntakeProposalItem[]>();
    for (const p of sorted) (m.get(groupOf(p, group)) ?? m.set(groupOf(p, group), []).get(groupOf(p, group))!).push(p);
    return [...m.entries()];
  }, [sorted, group]);

  const titleById = React.useMemo(() => new Map(proposals.map((p) => [p.id, p.title])), [proposals]);
  const selectedList = React.useMemo(() => proposals.filter((p) => selected.has(p.id)), [proposals, selected]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clear = () => setSelected(new Set());
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const selectAllFiltered = () => setSelected((s) => {
    const n = new Set(s);
    if (allFilteredSelected) filtered.forEach((p) => n.delete(p.id));
    else filtered.forEach((p) => n.add(p.id));
    return n;
  });

  // Keyboard: 'a' select-all filtered, Esc clear. Ignored while typing / a dialog is open.
  React.useEffect(() => {
    if (confirm || results) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.closest('[role="dialog"]'))) return;
      if (e.key === 'a') { e.preventDefault(); selectAllFiltered(); }
      else if (e.key === 'Escape') { e.preventDefault(); clear(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, results, filtered, allFilteredSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Approve summary (only approvable selected proposals actually get created).
  const approvable = selectedList.filter((p) => isActive(p.state) && canApply(p).ok);
  const approveSummary = React.useMemo(() => {
    const c: Record<ProposalType, number> = { task: 0, general_task: 0, note: 0, submittal: 0, calendar_event: 0 };
    approvable.forEach((p) => { c[p.proposal_type]++; });
    return (Object.keys(c) as ProposalType[]).filter((k) => c[k] > 0).map((k) => `${c[k]} ${TYPE_LABEL[k]}${c[k] === 1 ? '' : 's'}`);
  }, [approvable]);

  async function runApprove() {
    setBusy(true);
    const res = await bulkApproveProposals(approvable.map((p) => p.id));
    setBusy(false);
    setConfirm(null);
    if (!res.ok) return toast.error(res.error);
    setResults(res.data);
    if (res.data.failed === 0) toast.success(`${res.data.applied} applied`);
    clear();
    router.refresh();
  }
  async function runBulk(kind: 'reject' | 'archive' | 'delete') {
    setBusy(true);
    const ids = selectedList.map((p) => p.id);
    const res = kind === 'reject' ? await bulkRejectProposals(ids) : kind === 'archive' ? await bulkArchiveProposals(ids) : await bulkDeleteProposals(ids);
    setBusy(false);
    setConfirm(null);
    if (!res.ok) return toast.error(res.error);
    const verb = kind === 'reject' ? 'Rejected' : kind === 'archive' ? 'Archived' : 'Deleted';
    toast.success(`${verb} ${res.data.count}${res.data.skipped ? ` · ${res.data.skipped} skipped (already applied)` : ''}`);
    clear();
    router.refresh();
  }

  async function singleApprove(p: IntakeProposalItem) {
    const c = canApply(p);
    if (!c.ok) return toast.error(c.reason);
    setBusy(true); const r = await approveProposal(p.id); setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success('Applied'); router.refresh();
  }
  async function singleReject(p: IntakeProposalItem) {
    const r = await rejectProposal(p.id);
    if (!r.ok) return toast.error(r.error);
    toast.success('Rejected'); router.refresh();
  }
  async function restore(p: IntakeProposalItem) {
    const r = await restoreProposal(p.id);
    if (!r.ok) return toast.error(r.error);
    toast.success('Restored'); router.refresh();
  }

  return (
    <section className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              filter === f.key ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + select + sort + group */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search proposals…" className="h-8 pl-8" />
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={selectAllFiltered}>
          {allFilteredSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Select all
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8"><ArrowDownUp className="h-4 w-4" /> {SORTS.find((s) => s.key === sort)?.label} <ChevronDown className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORTS.map((s) => <DropdownMenuItem key={s.key} onSelect={() => setSort(s.key)}>{s.label}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8"><Layers className="h-4 w-4" /> {GROUPS.find((g) => g.key === group)?.label} <ChevronDown className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {GROUPS.map((g) => <DropdownMenuItem key={g.key} onSelect={() => setGroup(g.key)}>{g.label}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" className="h-8" disabled={busy} onClick={() => setConfirm('approve')}><Check className="h-4 w-4" /> Approve</Button>
            <Button variant="outline" size="sm" className="h-8" disabled={busy} onClick={() => setConfirm('reject')}><Ban className="h-4 w-4" /> Reject</Button>
            <Button variant="outline" size="sm" className="h-8" disabled={busy} onClick={() => setConfirm('archive')}><Archive className="h-4 w-4" /> Archive</Button>
            <Button variant="outline" size="sm" className="h-8 text-destructive" disabled={busy} onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4" /> Delete</Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={clear}><X className="h-4 w-4" /> Clear</Button>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
          {term || filter !== 'all'
            ? 'No proposals match your search / filter.'
            : 'No proposals yet — open the Intake Queue and Interpret a document to see suggestions here.'}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([name, items]) => (
            <div key={name}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{name} <span className="font-normal">· {items.length}</span></h3>
              <div className="space-y-1.5">
                {items.map((p) => {
                  const b = band(p.confidence);
                  const sel = selected.has(p.id);
                  const applied = p.state === 'approved';
                  const rejected = p.state === 'rejected';
                  const archived = p.state === 'archived';
                  const c = canApply(p);
                  return (
                    <div key={p.id} className={cn('flex gap-2.5 rounded-md border bg-card p-2.5', (rejected || archived) && 'opacity-60', sel && 'ring-1 ring-primary')}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(p.id)} className="mt-1 h-4 w-4 shrink-0 accent-primary" aria-label="Select proposal" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{TYPE_LABEL[p.proposal_type]}</span>
                          {p.category && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{p.category}</span>}
                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', b.cls)}>{b.label}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{STATE_LABEL[p.state]}</span>
                          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><FolderInput className="h-3.5 w-3.5" /> {destination(p)}</span>
                        </div>
                        <div className={cn('mt-1 text-sm font-medium', rejected && 'line-through')}>{p.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {p.suggested_assignee && <span>Assignee: {p.suggested_assignee}</span>}
                          {p.suggested_due_date && <span>Due: {formatDate(p.suggested_due_date)}</span>}
                          {p.document?.file_name && <span>Source: {p.document.file_name}</span>}
                        </div>
                        {p.reasoning && <div className="mt-0.5 truncate text-xs text-muted-foreground"><span className="font-medium">Why:</span> {p.reasoning}</div>}

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {applied ? (
                            <Button asChild variant="outline" size="sm" className="h-7"><Link href={appliedLink(p)}>View created <ArrowUpRight className="h-3.5 w-3.5" /></Link></Button>
                          ) : !rejected && !archived ? (
                            <>
                              <Button size="sm" className="h-7" disabled={busy || !c.ok} title={c.ok ? undefined : c.reason} onClick={() => singleApprove(p)}><Check className="h-3.5 w-3.5" /> Approve</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => singleReject(p)}><Ban className="h-3.5 w-3.5" /> Reject</Button>
                              {!c.ok && <span className="text-[11px] text-muted-foreground">{c.reason}</span>}
                            </>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7" onClick={() => restore(p)}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>
            {confirm === 'approve' ? 'Apply these proposals?' : confirm === 'reject' ? 'Reject proposals?' : confirm === 'archive' ? 'Archive proposals?' : 'Delete proposals?'}
          </DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            {confirm === 'approve' ? (
              approveSummary.length === 0 ? (
                <p className="text-muted-foreground">None of the selected proposals can be applied yet — set a project or date first (Edit).</p>
              ) : (
                <>
                  <p>You are about to create:</p>
                  <ul className="list-inside list-disc text-muted-foreground">{approveSummary.map((l) => <li key={l}>{l}</li>)}</ul>
                  {selectedList.length > approvable.length && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{selectedList.length - approvable.length} selected can’t be applied yet and will be skipped.</p>
                  )}
                </>
              )
            ) : (
              <p className="text-muted-foreground">
                {selected.size} proposal{selected.size === 1 ? '' : 's'} selected.
                {confirm === 'delete' && ' This removes the suggestions only — never any created records.'}
                {' Already-applied proposals are left untouched.'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
              {confirm === 'approve' ? (
                <Button size="sm" disabled={busy || approvable.length === 0} onClick={runApprove}>{busy ? 'Applying…' : `Apply ${approvable.length}`}</Button>
              ) : (
                <Button size="sm" className={confirm === 'delete' ? 'bg-red-600 text-white hover:bg-red-700' : undefined} disabled={busy} onClick={() => runBulk(confirm as 'reject' | 'archive' | 'delete')}>
                  {busy ? 'Working…' : (confirm === 'reject' ? 'Reject' : confirm === 'archive' ? 'Archive' : 'Delete')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch results */}
      <Dialog open={!!results} onOpenChange={(o) => { if (!o) setResults(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply results</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-emerald-600 dark:text-emerald-400">{results?.applied ?? 0} applied successfully.</span>{' '}
              <span className={results?.failed ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'}>{results?.failed ?? 0} failed.</span></p>
            {!!results?.failures.length && (
              <details className="rounded-md border p-2">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Error details</summary>
                <ul className="mt-2 space-y-1">
                  {results.failures.map((f) => (
                    <li key={f.id} className="text-xs"><span className="font-medium">{titleById.get(f.id) ?? f.id}:</span> <span className="text-red-600 dark:text-red-400">{f.error}</span></li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex justify-end"><Button size="sm" onClick={() => setResults(null)}>Done</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
