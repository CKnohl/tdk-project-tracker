'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, X, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboOption } from '@/components/shared/combobox';
import { MetaBadge } from '@/components/shared/meta-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { addStaffToProject, removeStaffFromProject } from '@/lib/actions/workload';
import { PROJECT_STATUS, WORKFLOW_STATE } from '@/lib/constants';
import type { StaffProjectRow } from '@/lib/data/staff';
import type { ProjectOption } from '@/lib/data/reference';

export function StaffProjectsCard({
  staffId,
  projects,
  allProjects,
  canManage,
}: {
  staffId: string;
  projects: StaffProjectRow[];
  allProjects: ProjectOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [addId, setAddId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const assigned = new Set(projects.map((p) => p.project_id));
  const options: ComboOption[] = allProjects
    .filter((p) => !assigned.has(p.id))
    .map((p) => ({ value: p.id, label: `${p.project_number} · ${p.name}` }));

  async function add() {
    if (!addId) return;
    setPending(true);
    const res = await addStaffToProject(staffId, addId);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Added to project');
    setAddId(null);
    router.refresh();
  }

  async function remove(projectId: string) {
    const res = await removeStaffFromProject(staffId, projectId);
    if (!res.ok) return toast.error(res.error);
    toast.success('Removed from project');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Combobox options={options} value={addId} onChange={setAddId} placeholder="Add a project…" emptyText="No more projects" />
          </div>
          <Button onClick={add} disabled={!addId || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No assigned projects" />
      ) : (
        <div className="divide-y rounded-lg border">
          {projects.map((p) => (
            <div key={p.project_id} className="flex items-center gap-3 p-2.5">
              <div className="min-w-0 flex-1">
                <Link href={`/projects/${p.project_id}`} className="truncate text-sm font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="truncate text-xs text-muted-foreground">
                  {p.project_number}
                  {p.role_on_project ? ` · ${p.role_on_project}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {p.workflow_state !== 'normal' && <MetaBadge meta={WORKFLOW_STATE[p.workflow_state]} />}
                <MetaBadge meta={PROJECT_STATUS[p.status]} />
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => remove(p.project_id)}
                    title="Remove from project"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
