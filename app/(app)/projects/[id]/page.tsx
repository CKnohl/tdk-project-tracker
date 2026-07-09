import { notFound } from 'next/navigation';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { ProjectCommandCenter } from '@/components/projects/detail/command-center';
import { ProjectTabs } from '@/components/projects/detail/project-tabs';
import { getCurrentUser } from '@/lib/auth';
import { canEdit, canManageProjects } from '@/lib/permissions';
import { canReviewProject } from '@/lib/project-permissions';
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
  const canReview = canReviewProject(user, {
    projectManagerId: detail.project.project_manager_id,
    leadStaffIds: detail.leads.map((l) => l.id),
  });
  const assignedStaffIds = detail.staff.map((m) => m.staff?.id).filter(Boolean) as string[];
  const assignedLeadIds = detail.leads.map((l) => l.id);

  return (
    <div className="space-y-5">
      <ProjectHeader
        project={detail.project}
        phases={detail.phases}
        assignedStaffIds={assignedStaffIds}
        assignedLeadIds={assignedLeadIds}
        companies={companies}
        staff={staff}
        canEdit={editor}
        canManage={manager}
      />
      <ProjectCommandCenter detail={detail} canEdit={editor} canManage={manager} />
      <ProjectTabs detail={detail} staff={staff} canEdit={editor} canManage={manager} canReview={canReview} />
    </div>
  );
}
