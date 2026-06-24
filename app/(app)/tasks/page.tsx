import { PageHeader } from '@/components/shared/page-header';
import { GeneralTasksView } from '@/components/tasks/general-tasks-view';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getGeneralTasks } from '@/lib/data/general-tasks';
import { getStaffDirectory } from '@/lib/data/reference';

export const metadata = { title: 'General Tasks' };

export default async function GeneralTasksPage() {
  const [user, { tasks, activity }, staff] = await Promise.all([
    getCurrentUser(),
    getGeneralTasks(),
    getStaffDirectory(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="General Tasks"
        description="Standalone office tasks — filing, standards, admin work — that aren't tied to a project."
      />
      <GeneralTasksView tasks={tasks} activity={activity} staff={staff} canEdit={canEdit(user?.role)} />
    </div>
  );
}
