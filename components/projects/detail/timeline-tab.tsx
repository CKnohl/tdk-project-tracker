'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CalendarClock, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';
import { addPhase, renamePhase, deletePhase, reorderPhases, setCurrentPhase } from '@/lib/actions/phases';
import type { ProjectListItem, SubmittalWithProject, TaskWithStaff } from '@/lib/types';
import type { ProjectPhaseRow } from '@/types/database.types';

export function TimelineTab({
  project,
  phases,
  submittals,
  tasks,
  canEdit,
}: {
  project: ProjectListItem;
  phases: ProjectPhaseRow[];
  submittals: SubmittalWithProject[];
  tasks: TaskWithStaff[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [adding, setAdding] = React.useState('');
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  async function act(p: Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    const res = await p;
    setPending(false);
    if (!res.ok) return toast.error(res.error ?? 'Something went wrong');
    router.refresh();
  }

  function move(index: number, dir: -1 | 1) {
    const ids = phases.map((p) => p.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    act(reorderPhases(project.id, ids));
  }

  async function onAdd() {
    if (adding.trim().length < 2) return;
    await act(addPhase(project.id, adding));
    setAdding('');
  }

  async function onRename(id: string) {
    await act(renamePhase(id, project.id, editName));
    setEditId(null);
  }

  const milestones = [
    { label: 'Project created', date: project.created_at, kind: 'created' },
    ...submittals
      .filter((s) => s.response_due_date)
      .map((s) => ({ label: `${s.submission_type} response due`, date: s.response_due_date!, kind: 'submittal' })),
    ...tasks
      .filter((t) => t.due_date && t.status !== 'completed' && t.status !== 'cancelled')
      .map((t) => ({ label: t.name, date: t.due_date!, kind: 'task' })),
    ...(project.target_completion_date
      ? [{ label: 'Target completion', date: project.target_completion_date, kind: 'target' }]
      : []),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Phases</h3>
          {canEdit && <span className="text-xs text-muted-foreground">Click a phase to mark it current</span>}
        </div>

        <div className="space-y-1.5">
          {phases.map((phase, i) => (
            <div
              key={phase.id}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-1.5',
                phase.is_current && 'border-primary bg-primary/5',
              )}
            >
              {editId === phase.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && onRename(phase.id)}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={pending} onClick={() => onRename(phase.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!canEdit || pending}
                    onClick={() => canEdit && act(setCurrentPhase(project.id, phase.id))}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        phase.is_current ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                      )}
                    >
                      {phase.is_current && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className={cn('truncate text-sm', phase.is_current && 'font-medium')}>{phase.name}</span>
                  </button>
                  {canEdit && (
                    <div className="flex shrink-0 items-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={pending || i === 0} onClick={() => move(i, -1)}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={pending || i === phases.length - 1} onClick={() => move(i, 1)}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(phase.id); setEditName(phase.name); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        disabled={pending}
                        onClick={() => { if (confirm(`Delete phase "${phase.name}"?`)) act(deletePhase(phase.id, project.id)); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {phases.length === 0 && <p className="text-sm text-muted-foreground">No phases defined.</p>}
        </div>

        {canEdit && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Add a phase…"
              className="h-8"
              onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
            <Button size="sm" variant="outline" disabled={pending || adding.trim().length < 2} onClick={onAdd}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Key dates</h3>
        <ol className="relative ml-2 space-y-3 border-l pl-6">
          {milestones.map((m, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[27px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-muted-foreground" />
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatDate(m.date)}</span>
                <span className="text-muted-foreground">{m.label}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
