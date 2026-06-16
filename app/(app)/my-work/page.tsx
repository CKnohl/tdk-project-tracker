import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  ListChecks,
  FileWarning,
  FolderKanban,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { TaskRow, SubmittalRowItem, ProjectRowItem, WidgetList } from '@/components/dashboard/rows';
import { EmptyState } from '@/components/shared/empty-state';
import { getCurrentUser } from '@/lib/auth';
import { getMyWork } from '@/lib/data/my-work';

export const metadata = { title: 'My Work' };

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  const data = await getMyWork(user?.staff_id ?? null);

  if (!data.hasStaff) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Work" description="Your personal task center." />
        <EmptyState
          icon={FolderKanban}
          title="No staff link"
          description="Your account isn't linked to a staff directory entry yet, so we can't show your personal assignments. An admin can link it from Settings → Staff."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Work"
        description={`${data.tasks.length} open tasks · ${data.overdue.length} overdue · ${data.submittals.length} submittals · ${data.projects.length} projects`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <WidgetCard title="Overdue" icon={AlertTriangle} count={data.overdue.length}>
          <WidgetList items={data.overdue} emptyTitle="Nothing overdue 🎉" emptyIcon={AlertTriangle} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
        <WidgetCard title="Upcoming (≤14 days)" icon={CalendarClock} count={data.upcoming.length}>
          <WidgetList items={data.upcoming} emptyTitle="Nothing due soon" emptyIcon={CalendarClock} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
      </div>

      <WidgetCard title="All My Tasks" icon={ListChecks} count={data.tasks.length}>
        <WidgetList items={data.tasks} emptyTitle="No assigned tasks" emptyIcon={ListChecks} render={(t) => <TaskRow key={t.id} task={t} />} />
      </WidgetCard>

      <div className="grid gap-4 md:grid-cols-2">
        <WidgetCard title="Submittals Awaiting My Follow-Up" icon={FileWarning} count={data.submittals.length}>
          <WidgetList items={data.submittals} emptyTitle="No submittals assigned to you" emptyIcon={FileWarning} render={(s) => <SubmittalRowItem key={s.id} submittal={s} />} />
        </WidgetCard>
        <WidgetCard title="My Projects" icon={FolderKanban} count={data.projects.length} href="/projects">
          <WidgetList items={data.projects} emptyTitle="You're not assigned to any active projects" emptyIcon={FolderKanban} render={(p) => <ProjectRowItem key={p.id} project={p} />} />
        </WidgetCard>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Looking for something specific? <Link href="/projects" className="underline">Browse all projects</Link>.
      </p>
    </div>
  );
}
