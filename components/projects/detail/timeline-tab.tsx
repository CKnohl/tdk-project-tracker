'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { addPhase, renamePhase, deletePhase, reorderPhases, setCurrentPhase, setPhaseSchedule } from '@/lib/actions/phases';
import { computeSchedule } from '@/lib/schedule';
import { ScheduleGantt } from './schedule-gantt';
import type { ProjectListItem, SubmittalWithProject, TaskWithStaff } from '@/lib/types';
import type { ProjectPhaseRow } from '@/types/database.types';

export function TimelineTab({
  project,
  phases,
  submittals,
  tasks,
  canManage,
}: {
  project: ProjectListItem;
  phases: ProjectPhaseRow[];
  submittals: SubmittalWithProject[];
  tasks: TaskWithStaff[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editMode, setEditMode] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [adding, setAdding] = React.useState('');
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  const currentIdx = phases.findIndex((p) => p.is_current);
  const [showGantt, setShowGantt] = React.useState(false);
  const schedule = React.useMemo(
    () => computeSchedule(project, phases, submittals, tasks),
    [project, phases, submittals, tasks],
  );

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

  const saveSchedule = (id: string, patch: { start_date?: string | null; end_date?: string | null; progress?: number }) =>
    act(setPhaseSchedule(id, project.id, patch));

  return (
    <div className="space-y-6">
      {/* ── Phases (the timeline — default) ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Phases</h3>
          {canManage &&
            (editMode ? (
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                <Check className="h-4 w-4" /> Done
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Pencil className="h-4 w-4" /> Edit Timeline
              </Button>
            ))}
        </div>

        {!editMode ? (
          phases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No phases defined.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {phases.map((phase, i) => {
                const done = currentIdx >= 0 && i < currentIdx;
                const active = phase.is_current;
                return (
                  <div
                    key={phase.id}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
                      active && 'border-primary bg-primary text-primary-foreground',
                      done && 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                      !done && !active && 'text-muted-foreground',
                    )}
                  >
                    {done && <Check className="h-3 w-3" />}
                    {phase.name}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Edit mode (PM+ / Lead only) ── */
          <div className="space-y-1.5">
            <p className="mb-2 text-xs text-muted-foreground">Click a phase to mark it current. Set dates and progress to drive the schedule.</p>
            {phases.map((phase, i) => (
              <div key={phase.id} className={cn('rounded-md border px-2.5 py-1.5', phase.is_current && 'border-primary bg-primary/5')}>
                {editId === phase.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && onRename(phase.id)}
                    />
                    <Button size="icon" variant="ghost" aria-label="Save phase name" className="h-8 w-8" disabled={pending} onClick={() => onRename(phase.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Cancel rename" className="h-8 w-8" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => act(setCurrentPhase(project.id, phase.id))}
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
                      <div className="flex shrink-0 items-center">
                        <Button size="icon" variant="ghost" aria-label="Move phase up" className="h-7 w-7" disabled={pending || i === 0} onClick={() => move(i, -1)}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Move phase down" className="h-7 w-7" disabled={pending || i === phases.length - 1} onClick={() => move(i, 1)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Rename phase" className="h-7 w-7" onClick={() => { setEditId(phase.id); setEditName(phase.name); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete phase"
                          className="h-7 w-7 text-destructive"
                          disabled={pending}
                          onClick={() => { if (confirm(`Delete phase "${phase.name}"?`)) act(deletePhase(phase.id, project.id)); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Schedule fields */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 pl-6 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1">
                        Start
                        <Input
                          type="date"
                          defaultValue={phase.start_date ?? ''}
                          className="h-7 w-[140px]"
                          disabled={pending}
                          onBlur={(e) => { if ((e.target.value || '') !== (phase.start_date ?? '')) saveSchedule(phase.id, { start_date: e.target.value || null }); }}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        End
                        <Input
                          type="date"
                          defaultValue={phase.end_date ?? ''}
                          className="h-7 w-[140px]"
                          disabled={pending}
                          onBlur={(e) => { if ((e.target.value || '') !== (phase.end_date ?? '')) saveSchedule(phase.id, { end_date: e.target.value || null }); }}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        Progress
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={phase.progress}
                          className="h-7 w-16"
                          disabled={pending}
                          onBlur={(e) => { if (Number(e.target.value) !== phase.progress) saveSchedule(phase.id, { progress: Number(e.target.value) }); }}
                        />
                        %
                      </label>
                    </div>
                  </>
                )}
              </div>
            ))}
            {phases.length === 0 && <p className="text-sm text-muted-foreground">No phases yet — add the first below.</p>}

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
          </div>
        )}
      </div>

      {/* ── Gantt Chart (optional planning aid) ── */}
      <div>
        {!showGantt ? (
          <Button variant="outline" size="sm" onClick={() => setShowGantt(true)}>
            <BarChart3 className="h-4 w-4" /> Generate Gantt Chart
          </Button>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Gantt Chart</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{schedule.overallProgress}% complete</span>
                <Button variant="ghost" size="sm" onClick={() => setShowGantt(false)}>Hide</Button>
              </div>
            </div>
            <ScheduleGantt schedule={schedule} tasks={tasks} />
          </>
        )}
      </div>
    </div>
  );
}
