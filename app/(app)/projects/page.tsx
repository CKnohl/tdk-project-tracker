import Link from 'next/link';
import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectsToolbar } from '@/components/projects/projects-toolbar';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getProjects, type ProjectCard as PCard, type ProjectFilters } from '@/lib/data/projects';
import { getCompanies } from '@/lib/data/reference';
import { PROJECT_STATUS, PROJECT_PHASE, WORKFLOW_STATE } from '@/lib/constants';
import type { ProjectStatus, ProjectPhase, WorkflowState } from '@/types/database.types';

export const metadata = { title: 'Active Projects' };

type SP = Record<string, string | undefined>;

function groupProjects(projects: PCard[], group?: string): { key: string; label: string; items: PCard[] }[] {
  if (!group || group === 'none') return [{ key: 'all', label: '', items: projects }];
  const map = new Map<string, { label: string; items: PCard[] }>();
  for (const p of projects) {
    let key = 'other';
    let label = 'Other';
    if (group === 'status') { key = p.status; label = PROJECT_STATUS[p.status].label; }
    else if (group === 'phase') { key = p.phase; label = PROJECT_PHASE[p.phase].label; }
    else if (group === 'workflow') { key = p.workflow_state; label = WORKFLOW_STATE[p.workflow_state].label; }
    else if (group === 'company') { key = String(p.company_id); label = p.company?.name ?? 'Unknown'; }
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key)!.items.push(p);
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v }));
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [user, companies] = await Promise.all([getCurrentUser(), getCompanies()]);

  const filters: ProjectFilters = {
    q: sp.q,
    status: (sp.status as ProjectStatus) || undefined,
    company: sp.company ? Number(sp.company) : undefined,
    phase: (sp.phase as ProjectPhase) || undefined,
    workflow: (sp.workflow as WorkflowState) || undefined,
    sort: (sp.sort as ProjectFilters['sort']) || 'recent',
  };

  const projects = await getProjects(filters);
  const groups = groupProjects(projects, sp.group);

  return (
    <div className="space-y-5">
      <PageHeader title="Active Projects" description={`${projects.length} project${projects.length === 1 ? '' : 's'}`}>
        {user && canEdit(user.role) && (
          <Button asChild>
            <Link href="/projects/new"><Plus className="h-4 w-4" /> New Project</Link>
          </Button>
        )}
      </PageHeader>

      <ProjectsToolbar companies={companies} />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects match your filters"
          description="Try clearing filters or create a new project."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              {g.label && (
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {g.label} <span className="font-normal">· {g.items.length}</span>
                </h2>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
