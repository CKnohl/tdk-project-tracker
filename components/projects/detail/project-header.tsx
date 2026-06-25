'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, MoreHorizontal, Pencil, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MetaBadge } from '@/components/shared/meta-badge';
import { ProjectStatusBadge } from '@/components/shared/status-indicator';
import { ProjectForm } from '@/components/projects/project-form';
import { PROJECTS_QUERY_KEY } from '@/components/projects/projects-toolbar';
import { WORKFLOW_STATE } from '@/lib/constants';
import {
  setWorkflowState,
  setProjectStatus,
  deleteProject,
} from '@/lib/actions/projects';
import { setCurrentPhase } from '@/lib/actions/phases';
import type { CompanyOption, StaffOption } from '@/lib/data/reference';
import type { ProjectListItem } from '@/lib/types';
import type { InactiveReason, ProjectPhaseRow } from '@/types/database.types';

const ARCHIVE_REASONS: { value: InactiveReason; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'lost_bid', label: 'Lost Bid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'fell_through', label: 'Fell Through' },
];

export function ProjectHeader({
  project,
  phases,
  assignedStaffIds,
  assignedLeadIds,
  companies,
  staff,
  canEdit,
  canManage,
}: {
  project: ProjectListItem;
  phases: ProjectPhaseRow[];
  assignedStaffIds: string[];
  assignedLeadIds: string[];
  companies: CompanyOption[];
  staff: StaffOption[];
  canEdit: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  // Restore the user's last /projects filter/search so Back returns them to the
  // list exactly as they left it. Falls back to bare /projects (e.g. arrived
  // here from search or a notification).
  const [backHref, setBackHref] = React.useState('/projects');
  React.useEffect(() => {
    try {
      const q = sessionStorage.getItem(PROJECTS_QUERY_KEY);
      if (q) setBackHref(`/projects${q}`);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);
  const currentPhase = phases.find((p) => p.is_current) ?? null;
  const currentPhaseLabel = currentPhase?.name ?? project.current_phase_name ?? null;

  const run = async (p: Promise<{ ok: boolean; error?: string }>, ok?: string) => {
    const res = await p;
    if (!res.ok) toast.error(res.error ?? 'Failed');
    else { if (ok) toast.success(ok); router.refresh(); }
  };

  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={backHref} className="inline-flex items-center gap-1 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Projects
        </Link>
        <span aria-hidden className="text-muted-foreground/40">/</span>
        <span className="font-mono text-foreground/80">{project.project_number}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{project.project_number}</span>
            {project.company && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: project.company.color ?? '#475569' }}>
                {project.company.name}
              </span>
            )}
          </div>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ProjectStatusBadge status={project.status} />
            {project.workflow_state !== 'normal' && <MetaBadge meta={WORKFLOW_STATE[project.workflow_state]} />}
            {currentPhaseLabel && <MetaBadge meta={{ label: currentPhaseLabel, tone: 'slate' }} />}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {phases.length > 0 && (
              <Select value={currentPhase?.id ?? ''} onValueChange={(v) => run(setCurrentPhase(project.id, v), 'Phase updated')}>
                <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Set phase" /></SelectTrigger>
                <SelectContent>
                  {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={project.workflow_state} onValueChange={(v) => run(setWorkflowState(project.id, v as never), 'Workflow updated')}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(WORKFLOW_STATE).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More project actions" className="h-9 w-9"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                {project.status !== 'active' && (
                  <DropdownMenuItem onSelect={() => run(setProjectStatus(project.id, 'active'), 'Restored to active')}>
                    <RotateCcw className="h-4 w-4" /> Set Active
                  </DropdownMenuItem>
                )}
                {project.status !== 'on_hold' && (
                  <DropdownMenuItem onSelect={() => run(setProjectStatus(project.id, 'on_hold'), 'Set on hold')}>
                    Set On Hold
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Archive as…</DropdownMenuLabel>
                {ARCHIVE_REASONS.map((r) => (
                  <DropdownMenuItem key={r.value} onSelect={() => run(setProjectStatus(project.id, 'inactive', r.value), 'Archived')}>
                    <Archive className="h-4 w-4" /> {r.label}
                  </DropdownMenuItem>
                ))}
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => {
                        if (confirm('Permanently delete this project and all its data?'))
                          run(deleteProject(project.id).then((r) => { if (r.ok) router.push('/projects'); return r; }), 'Project deleted');
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Edit project</DialogTitle></DialogHeader>
          <ProjectForm
            companies={companies}
            staff={staff}
            project={project}
            assignedStaffIds={assignedStaffIds}
            assignedLeadIds={assignedLeadIds}
            onSuccess={() => { setEditing(false); router.refresh(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
