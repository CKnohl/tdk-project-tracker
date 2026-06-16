import { Archive } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ArchiveList } from '@/components/projects/archive-list';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getProjects } from '@/lib/data/projects';

export const metadata = { title: 'Archive' };

export default async function ArchivePage() {
  const [user, projects] = await Promise.all([getCurrentUser(), getProjects({ archived: true })]);

  return (
    <div className="space-y-5">
      <PageHeader title="Archive" description={`${projects.length} inactive project${projects.length === 1 ? '' : 's'} — completed, lost bid, cancelled, or fell through.`} />
      {projects.length === 0 ? (
        <EmptyState icon={Archive} title="Archive is empty" description="Inactive projects will appear here." />
      ) : (
        <ArchiveList projects={projects} canEdit={!!user && canEdit(user.role)} />
      )}
    </div>
  );
}
