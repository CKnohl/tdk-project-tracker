import { notFound } from 'next/navigation';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { ProjectTabs } from '@/components/projects/detail/project-tabs';
import { getCurrentUser } from '@/lib/auth';
import { canEdit, canManageProjects } from '@/lib/permissions';
import { getProjectDetail } from '@/lib/data/projects';
import { getCompanies, getStaffDirectory } from '@/lib/data/reference';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  return { title: detail ? `${detail.project.project_number} · ${detail.project.name}` : 'Project' };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, user, companies, staff] = await Promise.all([
    getProjectDetail(id),
    getCurrentUser(),
    getCompanies(),
    getStaffDirectory(),
  ]);

  if (!detail) notFound();

  const editor = !!user && canEdit(user.role);
  const manager = !!user && canManageProjects(user.role);
  const assignedStaffIds = detail.staff.map((m) => m.staff?.id).filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <ProjectHeader
        project={detail.project}
        phases={detail.phases}
        assignedStaffIds={assignedStaffIds}
        companies={companies}
        staff={staff}
        canEdit={editor}
        canManage={manager}
      />
      <ProjectTabs detail={detail} staff={staff} canEdit={editor} canManage={manager} />
    </div>
  );
}
