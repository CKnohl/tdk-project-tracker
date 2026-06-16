import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, AlertTriangle, CalendarClock, ListChecks, FileWarning, FolderKanban } from 'lucide-react';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { TaskRow, SubmittalRowItem, ProjectRowItem, WidgetList } from '@/components/dashboard/rows';
import { getStaffMember } from '@/lib/data/staff';
import { getMyWork } from '@/lib/data/my-work';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getStaffMember(id);
  return { title: member ? member.full_name : 'Staff' };
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getStaffMember(id);
  if (!member) notFound();
  const work = await getMyWork(id);

  return (
    <div className="space-y-5">
      <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Staff
      </Link>

      <div className="flex items-center gap-3">
        <StaffAvatar name={member.full_name} initials={member.initials} className="h-12 w-12" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{member.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {member.email ?? 'No email on file'} · {work.tasks.length} open tasks · {work.projects.length} active projects
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WidgetCard title="Overdue" icon={AlertTriangle} count={work.overdue.length}>
          <WidgetList items={work.overdue} emptyTitle="Nothing overdue" emptyIcon={AlertTriangle} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
        <WidgetCard title="Upcoming (≤14d)" icon={CalendarClock} count={work.upcoming.length}>
          <WidgetList items={work.upcoming} emptyTitle="Nothing due soon" emptyIcon={CalendarClock} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
      </div>

      <WidgetCard title="All assigned tasks" icon={ListChecks} count={work.tasks.length}>
        <WidgetList items={work.tasks} emptyTitle="No assigned tasks" emptyIcon={ListChecks} render={(t) => <TaskRow key={t.id} task={t} />} />
      </WidgetCard>

      <div className="grid gap-4 md:grid-cols-2">
        <WidgetCard title="Assigned submittals" icon={FileWarning} count={work.submittals.length}>
          <WidgetList items={work.submittals} emptyTitle="No submittals" emptyIcon={FileWarning} render={(s) => <SubmittalRowItem key={s.id} submittal={s} />} />
        </WidgetCard>
        <WidgetCard title="Active projects" icon={FolderKanban} count={work.projects.length}>
          <WidgetList items={work.projects} emptyTitle="No active projects" emptyIcon={FolderKanban} render={(p) => <ProjectRowItem key={p.id} project={p} />} />
        </WidgetCard>
      </div>
    </div>
  );
}
