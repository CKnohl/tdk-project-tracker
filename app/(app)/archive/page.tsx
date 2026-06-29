import { Archive } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ArchiveList } from '@/components/projects/archive-list';
import { ArchiveToolbar } from '@/components/projects/archive-toolbar';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getProjects, type ProjectFilters } from '@/lib/data/projects';
import { getCompanies } from '@/lib/data/reference';

export const metadata = { title: 'Archive' };

type SP = Record<string, string | undefined>;

export default async function ArchivePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [user, companies] = await Promise.all([getCurrentUser(), getCompanies()]);
  const projects = await getProjects({
    archived: true,
    q: sp.q,
    company: sp.company ? Number(sp.company) : undefined,
    sort: (sp.sort as ProjectFilters['sort']) || 'recent',
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Archive" description={`${projects.length} inactive project${projects.length === 1 ? '' : 's'} — completed, lost bid, cancelled, or fell through.`} />
      <ArchiveToolbar companies={companies} />
      {projects.length === 0 ? (
        <EmptyState icon={Archive} title="No archived projects match" description="Try clearing the search or filters." />
      ) : (
        <ArchiveList projects={projects} canEdit={!!user && canEdit(user.role)} />
      )}
    </div>
  );
}
