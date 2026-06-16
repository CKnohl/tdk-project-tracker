import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectForm } from '@/components/projects/project-form';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getCompanies, getStaffDirectory } from '@/lib/data/reference';

export const metadata = { title: 'New Project' };

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user || !canEdit(user.role)) redirect('/projects');

  const [companies, staff] = await Promise.all([getCompanies(), getStaffDirectory()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New Project" description="Create a project for TDK or M&P." />
      <Card>
        <CardContent className="pt-6">
          <ProjectForm companies={companies} staff={staff} />
        </CardContent>
      </Card>
    </div>
  );
}
