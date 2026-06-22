import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  ListChecks,
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  Clock,
  BellRing,
  FileWarning,
  type LucideIcon,
} from 'lucide-react';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { SubmittalRowItem, WidgetList } from '@/components/dashboard/rows';
import { StaffProjectsCard } from '@/components/staff/staff-projects-card';
import { StaffTasksCard } from '@/components/staff/staff-tasks-card';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getStaffMember, getStaffWorkloadDetail } from '@/lib/data/staff';
import { getProjectDirectory, getStaffDirectory } from '@/lib/data/reference';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getStaffMember(id);
  return { title: member ? member.full_name : 'Staff' };
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, user, staffDir, projectDir] = await Promise.all([
    getStaffWorkloadDetail(id),
    getCurrentUser(),
    getStaffDirectory(),
    getProjectDirectory(),
  ]);
  if (!detail) notFound();

  const canManage = canManageProjects(user?.role);
  const { member, summary, projects, tasks, submittals } = detail;

  return (
    <div className="space-y-5">
      <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Staff
      </Link>

      <div className="flex items-center gap-3">
        <StaffAvatar name={member.full_name} initials={member.initials} className="h-12 w-12" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{member.full_name}</h1>
          <p className="text-sm text-muted-foreground">{member.email ?? 'No email on file'}</p>
        </div>
      </div>

      {/* Workload summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Open Tasks" value={summary.openTasks} icon={ListChecks} />
        <Stat label="Overdue" value={summary.overdueTasks} icon={AlertTriangle} tone="red" />
        <Stat label="Due This Week" value={summary.dueThisWeek} icon={CalendarClock} tone="orange" />
        <Stat label="Projects" value={summary.assignedProjects} icon={FolderKanban} />
        <Stat label="Waiting" value={summary.awaitingProjects} icon={Clock} />
        <Stat label="Needs Attention" value={summary.attentionProjects} icon={BellRing} tone="orange" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FolderKanban className="h-4 w-4" /> Assigned Projects
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{projects.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffProjectsCard staffId={member.id} projects={projects} allProjects={projectDir} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4" /> Assigned Tasks
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{tasks.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTasksCard staffId={member.id} tasks={tasks} staffOptions={staffDir} projects={projectDir} canManage={canManage} />
        </CardContent>
      </Card>

      <WidgetCard title="Assigned submittals" icon={FileWarning} count={submittals.length}>
        <WidgetList
          items={submittals}
          emptyTitle="No submittals"
          emptyIcon={FileWarning}
          render={(s) => <SubmittalRowItem key={s.id} submittal={s} />}
        />
      </WidgetCard>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = 'none',
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'none' | 'red' | 'orange';
}) {
  const active = value > 0;
  const valueClass =
    tone === 'red' && active
      ? 'text-red-600 dark:text-red-400'
      : tone === 'orange' && active
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-foreground';
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={cn('mt-1 text-2xl font-bold', valueClass)}>{value}</div>
    </Card>
  );
}
