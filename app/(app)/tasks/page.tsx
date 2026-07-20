import { PageHeader } from '@/components/shared/page-header';
import { GeneralTasksView } from '@/components/tasks/general-tasks-view';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getGeneralTasks } from '@/lib/data/general-tasks';
import { getStaffDirectory } from '@/lib/data/reference';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';

export const metadata = { title: 'General Tasks' };

export default async function GeneralTasksPage() {
  const [user, { tasks, activity, reviews }, staff] = await Promise.all([
    getCurrentUser(),
    getGeneralTasks(),
    getStaffDirectory(),
  ]);

  return (
    <div className="space-y-5">
      <ScrollRestoration storageKey="tdk-tasks-scroll" />
      <PageHeader
        title="General Tasks"
        description="Standalone office tasks — filing, standards, admin work — that aren't tied to a project."
      />
      <GeneralTasksView tasks={tasks} activity={activity} staff={staff} canEdit={canEdit(user?.role)} reviews={reviews} />
    </div>
  );
}
