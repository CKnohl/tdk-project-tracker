'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Upload, FileText, FileImage, File as FileIcon, FolderInput, Archive, ExternalLink, Search, X,
  ListChecks, StickyNote, Inbox, MoreHorizontal, PlayCircle, RotateCcw, FileSearch, ChevronRight, ChevronDown,
  CheckSquare, Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { ProposalsList } from '@/components/operations/proposals-list';
import {
  createIntakeDocument, createIntakeSignedUrl, markIntakeFiled, setIntakeStatus, bulkSetIntakeStatus,
} from '@/lib/actions/intake';
import { interpretIntakeDocument } from '@/lib/actions/proposals';
import { createNote } from '@/lib/actions/notes';
import { createTask } from '@/lib/actions/tasks';
import { cn, formatDateTime, humanize } from '@/lib/utils';
import type { IntakeDocumentItem } from '@/lib/data/intake';
import type { IntakeProposalItem } from '@/lib/data/proposals';
import type { IntakeStatus } from '@/types/database.types';
import type { ProjectOption } from '@/lib/data/reference';

// V6 Phase 0 queue + Phase 1 interpretation. A PM processes documents as an Outlook/Gmail
// queue (status tabs, keyboard nav, multi-file + drag-drop) and can "Interpret" a document
// into PROPOSALS for review. Filing reuses createNote / createTask; interpretation stores
// proposals only. NOTHING is ever written to a project automatically.

type FileMode = 'note' | 'task';

const TABS: { key: IntakeStatus; label: string }[] = [
  { key: 'received', label: 'Needs Filing' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'filed', label: 'Filed' },
  { key: 'archived', label: 'Archived' },
];

const stripExt = (name: string) => name.replace(/\.[^.]+$/, '');
function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes; let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${i > 0 && n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}
function iconFor(mime: string | null) {
  if (mime?.startsWith('image/')) return FileImage;
  if (mime === 'application/pdf') return FileText;
  return FileIcon;
}

export function IntakePanel({
  documents, projects, proposalsByDoc,
}: {
  documents: IntakeDocumentItem[];
  projects: ProjectOption[];
  proposalsByDoc: Record<string, IntakeProposalItem[]>;
}) {
  const router = useRouter();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = React.useTransition();
  const [dragging, setDragging] = React.useState(false);

  const [tab, setTab] = React.useState<IntakeStatus>('received');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [interpretingId, setInterpretingId] = React.useState<string | null>(null);

  // Filing dialog.
  const [filing, setFiling] = React.useState<IntakeDocumentItem | null>(null);
  const [mode, setMode] = React.useState<FileMode>('note');
  const [projQuery, setProjQuery] = React.useState('');
  const [projHi, setProjHi] = React.useState(0);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [body, setBody] = React.useState('');
  const [taskName, setTaskName] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  // Paste-text dialog (for scans with no machine-readable text — OCR is Phase 2).
  const [pasting, setPasting] = React.useState<IntakeDocumentItem | null>(null);
  const [pasteText, setPasteText] = React.useState('');

  const [docSelected, setDocSelected] = React.useState<Set<string>>(new Set());

  const groups = React.useMemo(() => {
    const g: Record<IntakeStatus, IntakeDocumentItem[]> = { received: [], in_progress: [], filed: [], archived: [] };
    for (const d of documents) g[d.status].push(d);
    return g;
  }, [documents]);
  const list = groups[tab];

  React.useEffect(() => {
    if (list.length === 0) { setSelectedId(null); return; }
    setSelectedId((cur) => (cur && list.some((d) => d.id === cur) ? cur : list[0].id));
  }, [list]);

  const activeCount = (id: string) => (proposalsByDoc[id] ?? []).filter((p) => p.state !== 'rejected').length;
  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Duplicate detection — same filename + size (no AI, no server call).
  const dupIds = React.useMemo(() => {
    const seen = new Map<string, string>();
    const dups = new Set<string>();
    for (const d of documents) {
      const key = `${d.file_name}|${d.size_bytes ?? ''}`;
      const first = seen.get(key);
      if (first) { dups.add(d.id); dups.add(first); } else seen.set(key, d.id);
    }
    return dups;
  }, [documents]);

  // Document multi-select — bulk lifecycle only (Start / Reopen / Archive); never bulk filing.
  const toggleDoc = (id: string) => setDocSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearDocs = () => setDocSelected(new Set());
  const allTabSelected = list.length > 0 && list.every((d) => docSelected.has(d.id));
  const selectAllTab = () => setDocSelected((s) => {
    const n = new Set(s);
    if (allTabSelected) list.forEach((d) => n.delete(d.id));
    else list.forEach((d) => n.add(d.id));
    return n;
  });
  async function bulkDocStatus(status: 'received' | 'in_progress' | 'archived', label: string) {
    const ids = [...docSelected];
    if (!ids.length) return;
    const res = await bulkSetIntakeStatus(ids, status);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${label} ${res.data.count}`);
    clearDocs();
    router.refresh();
  }

  // ── Uploads ─────────────────────────────────────────────────────────────────
  function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    startUpload(async () => {
      const results = await Promise.allSettled(
        files.map((f) => { const fd = new FormData(); fd.append('file', f); return createIntakeDocument(fd); }),
      );
      const ok = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
      if (ok) toast.success(`Uploaded ${ok} document${ok === 1 ? '' : 's'}`);
      if (ok < files.length) toast.error(`${files.length - ok} failed to upload`);
      router.refresh();
    });
  }

  async function view(doc: IntakeDocumentItem) {
    const res = await createIntakeSignedUrl(doc.storage_path);
    if (!res.ok) return toast.error(res.error);
    window.open(res.data, '_blank', 'noopener,noreferrer');
  }
  async function setStatus(doc: IntakeDocumentItem, status: 'received' | 'in_progress' | 'archived', label: string) {
    const res = await setIntakeStatus(doc.id, status);
    if (!res.ok) return toast.error(res.error);
    toast.success(label);
    router.refresh();
  }

  // ── Interpret (Phase 1) ──────────────────────────────────────────────────────
  async function interpret(doc: IntakeDocumentItem, providedText?: string) {
    setInterpretingId(doc.id);
    const res = await interpretIntakeDocument(doc.id, providedText);
    setInterpretingId(null);
    if (!res.ok) return toast.error(res.error);
    const d = res.data;
    if (d.interpreted) {
      toast.success(`${d.count} proposal${d.count === 1 ? '' : 's'} to review`);
      setExpanded((s) => new Set(s).add(doc.id));
      setPasting(null); setPasteText('');
      router.refresh();
    } else if (d.reason === 'no_text') {
      setPasting(doc); setPasteText('');
    } else {
      toast('Interpretation is turned off pending data-governance sign-off.');
    }
  }

  // ── Filing dialog ────────────────────────────────────────────────────────────
  function openFiling(doc: IntakeDocumentItem) {
    setFiling(doc); setMode('note'); setProjQuery(''); setProjHi(0); setProjectId(null); setBody(''); setTaskName(stripExt(doc.file_name));
  }
  function closeFiling() { setFiling(null); setBusy(false); }
  async function submitFiling() {
    if (!filing || !projectId || busy) return;
    if (mode === 'note' && !body.trim()) return toast.error('Note cannot be empty.');
    if (mode === 'task' && !taskName.trim()) return toast.error('Task name is required.');
    setBusy(true);
    const res =
      mode === 'note'
        ? await createNote({ project_id: projectId, body: body.trim() })
        : await createTask({
            project_id: projectId, name: taskName.trim(), description: body.trim() || undefined,
            priority: 'medium', status: 'not_started', start_date: undefined, due_date: undefined,
            completion_pct: 0, notes: undefined, recurrence: 'none', staff_ids: [],
          });
    if (!res.ok) { setBusy(false); return toast.error(res.error); }
    const filed = await markIntakeFiled(filing.id, projectId);
    setBusy(false);
    if (!filed.ok) return toast.error(filed.error);
    toast.success(mode === 'note' ? 'Filed as a note' : 'Filed as a task');
    closeFiling();
    router.refresh();
  }

  // ── List keyboard navigation ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (filing || pasting) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.closest('[role="dialog"]'))) return;
      if (list.length === 0) return;
      const idx = Math.max(0, list.findIndex((d) => d.id === selectedId));
      const doc = list[idx];
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setSelectedId(list[Math.min(idx + 1, list.length - 1)].id); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setSelectedId(list[Math.max(idx - 1, 0)].id); }
      else if (doc && (e.key === 'Enter' || e.key === 'f')) { e.preventDefault(); openFiling(doc); }
      else if (doc && e.key === 'i') { e.preventDefault(); void interpret(doc); }
      else if (doc && e.key === 'e' && doc.status !== 'archived') { e.preventDefault(); void setStatus(doc, 'archived', 'Archived'); }
      else if (doc && e.key === 'o') { e.preventDefault(); void view(doc); }
      else if (doc && e.key === 'x') { e.preventDefault(); toggleDoc(doc.id); }
      else if (e.key === 'Escape' && docSelected.size > 0) { e.preventDefault(); clearDocs(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filing, pasting, list, selectedId, docSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = projQuery.trim().toLowerCase();
  const filteredProjects = (q
    ? projects.filter((p) => p.name.toLowerCase().includes(q) || p.project_number.toLowerCase().includes(q))
    : projects
  ).slice(0, 8);

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles(Array.from(e.dataTransfer.files)); }}
      className={cn('space-y-3 rounded-lg', dragging && 'outline-dashed outline-2 outline-offset-4 outline-primary')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Intake</h2>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ''; uploadFiles(f); }} />
        <Button size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
          <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload documents'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((t) => {
          const count = groups[t.key].length;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')}>
              {t.label}
              {count > 0 && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', active ? 'bg-background' : 'bg-muted')}>{count > 99 ? '99+' : count}</span>}
            </button>
          );
        })}
        {list.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={selectAllTab}>
            {allTabSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />} Select all
          </Button>
        )}
      </div>

      {docSelected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{docSelected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="h-8" onClick={() => bulkDocStatus('in_progress', 'Marked in progress')}><PlayCircle className="h-4 w-4" /> Start</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => bulkDocStatus('received', 'Moved to Needs Filing')}><RotateCcw className="h-4 w-4" /> Reopen</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => bulkDocStatus('archived', 'Archived')}><Archive className="h-4 w-4" /> Archive</Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={clearDocs}><X className="h-4 w-4" /> Clear</Button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState icon={Inbox} title="No documents yet"
          description="Upload or drag documents here — permit letters, emails, meeting notes — then file them to a project. Nothing changes a project until you file it." />
      ) : list.length === 0 ? (
        <p className="rounded-lg border py-10 text-center text-sm text-muted-foreground">Nothing in “{TABS.find((t) => t.key === tab)?.label}”.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {list.map((doc) => {
            const Icon = iconFor(doc.mime_type);
            const selected = doc.id === selectedId;
            const count = activeCount(doc.id);
            const open = expanded.has(doc.id);
            const busyInterpret = interpretingId === doc.id;
            return (
              <div key={doc.id} className={cn(selected && 'bg-accent/40')}>
                <div onClick={() => setSelectedId(doc.id)} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <input type="checkbox" checked={docSelected.has(doc.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleDoc(doc.id)} className="h-4 w-4 shrink-0 accent-primary" aria-label="Select document" />
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{doc.file_name}</span>
                        {dupIds.has(doc.id) && <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">possible duplicate</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {humanize(doc.source_type)} · {doc.uploader?.full_name ?? 'Unknown'} · {formatDateTime(doc.created_at)}
                        {doc.size_bytes ? ` · ${fmtSize(doc.size_bytes)}` : ''}
                        {doc.status === 'filed' && doc.filed_project && (
                          <> · <span className="text-emerald-600 dark:text-emerald-400">
                            Filed to {doc.filed_project.project_number}
                            {doc.filed_at ? ` · ${formatDateTime(doc.filed_at)}` : ''}
                            {doc.filer?.full_name ? ` · by ${doc.filer.full_name}` : ''}
                          </span></>
                        )}
                      </div>
                      {count > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(doc.id); }} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} {count} proposal{count === 1 ? '' : 's'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View (o)" aria-label="View document" onClick={() => view(doc)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={busyInterpret} onClick={() => interpret(doc)} title="Interpret (i)">
                      <FileSearch className="h-4 w-4" /> {busyInterpret ? 'Interpreting…' : count > 0 ? 'Re-interpret' : 'Interpret'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openFiling(doc)}>
                      <FolderInput className="h-4 w-4" /> {doc.status === 'filed' ? 'File again' : 'File'}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {doc.status === 'received' && <DropdownMenuItem onSelect={() => setStatus(doc, 'in_progress', 'Marked in progress')}><PlayCircle className="h-4 w-4" /> Start</DropdownMenuItem>}
                        {doc.status === 'in_progress' && <DropdownMenuItem onSelect={() => setStatus(doc, 'received', 'Moved to New')}><RotateCcw className="h-4 w-4" /> Move to New</DropdownMenuItem>}
                        {(doc.status === 'filed' || doc.status === 'archived') && <DropdownMenuItem onSelect={() => setStatus(doc, 'received', 'Reopened')}><RotateCcw className="h-4 w-4" /> Reopen</DropdownMenuItem>}
                        {doc.status !== 'archived' && <DropdownMenuItem onSelect={() => setStatus(doc, 'archived', 'Archived')}><Archive className="h-4 w-4" /> Archive</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {open && count > 0 && <ProposalsList proposals={proposalsByDoc[doc.id] ?? []} projects={projects} />}
              </div>
            );
          })}
        </div>
      )}

      {list.length > 0 && (
        <p className="px-1 text-[11px] text-muted-foreground">
          <kbd className="rounded border bg-muted px-1">↑</kbd><kbd className="rounded border bg-muted px-1">↓</kbd> move ·
          <kbd className="ml-1 rounded border bg-muted px-1">i</kbd> interpret ·
          <kbd className="ml-1 rounded border bg-muted px-1">f</kbd> file ·
          <kbd className="ml-1 rounded border bg-muted px-1">o</kbd> open ·
          <kbd className="ml-1 rounded border bg-muted px-1">x</kbd> select ·
          <kbd className="ml-1 rounded border bg-muted px-1">e</kbd> archive
        </p>
      )}

      {/* Filing dialog */}
      <Dialog open={!!filing} onOpenChange={(o) => { if (!o) closeFiling(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="truncate">File “{filing?.file_name}” to a project</DialogTitle></DialogHeader>
          <div className="space-y-4" onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitFiling(); } }}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus value={projQuery} onChange={(e) => { setProjQuery(e.target.value); setProjHi(0); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setProjHi((h) => Math.min(h + 1, filteredProjects.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setProjHi((h) => Math.max(h - 1, 0)); }
                    else if (e.key === 'Enter') { e.preventDefault(); const p = filteredProjects[projHi]; if (p) setProjectId(p.id); }
                  }}
                  placeholder="Search projects…" className="pl-8" />
              </div>
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-1">
                {filteredProjects.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching projects.</p>
                ) : filteredProjects.map((p, i) => (
                  <button key={p.id} onClick={() => setProjectId(p.id)} onMouseEnter={() => setProjHi(i)}
                    className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                      projectId === p.id ? 'bg-primary text-primary-foreground' : i === projHi ? 'bg-accent' : 'hover:bg-accent')}>
                    <span className={cn('font-mono text-xs', projectId === p.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{p.project_number}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={mode === 'note' ? 'default' : 'outline'} size="sm" onClick={() => setMode('note')}><StickyNote className="h-4 w-4" /> As note</Button>
              <Button variant={mode === 'task' ? 'default' : 'outline'} size="sm" onClick={() => setMode('task')}><ListChecks className="h-4 w-4" /> As task</Button>
            </div>
            {mode === 'task' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Task name</label>
                <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task name" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{mode === 'note' ? 'Note' : 'Details (optional)'}</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={mode === 'note' ? 'What does this document say / need?' : 'Optional details'} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Pick a project, then <kbd className="rounded border bg-muted px-1">⌘/Ctrl</kbd>+<kbd className="rounded border bg-muted px-1">↵</kbd> to file</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={closeFiling}><X className="h-4 w-4" /> Cancel</Button>
                <Button size="sm" disabled={busy || !projectId} onClick={submitFiling}><FolderInput className="h-4 w-4" /> {busy ? 'Filing…' : 'File to project'}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste-text dialog — no machine-readable text (scan); OCR arrives in Phase 2 */}
      <Dialog open={!!pasting} onOpenChange={(o) => { if (!o) { setPasting(null); setPasteText(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="truncate">Interpret “{pasting?.file_name}”</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              This file has no machine-readable text yet (automatic text extraction / OCR arrives in a later phase).
              Paste the document&apos;s text below to interpret it now. Nothing is written to any project.
            </p>
            <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={8} placeholder="Paste the document text…" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setPasting(null); setPasteText(''); }}><X className="h-4 w-4" /> Cancel</Button>
              <Button size="sm" disabled={!pasteText.trim() || interpretingId === pasting?.id} onClick={() => pasting && interpret(pasting, pasteText)}>
                <FileSearch className="h-4 w-4" /> {interpretingId === pasting?.id ? 'Interpreting…' : 'Interpret'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
