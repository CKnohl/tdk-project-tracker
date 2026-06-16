import {
  AlertTriangle,
  CalendarClock,
  Clock,
  ListChecks,
  CalendarDays,
  FolderClock,
  Users,
  Activity,
  BellRing,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StatCards } from '@/components/dashboard/stat-cards';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { MyWorkWidget } from '@/components/dashboard/my-work-widget';
import { CalendarView } from '@/components/calendar/calendar-view';
import {
  TaskRow,
  ProjectRowItem,
  FollowUpRow,
  FeedRow,
  ActivityRow,
  WidgetList,
} from '@/components/dashboard/rows';
import { StaffWorkloadList } from '@/components/dashboard/workload-list';
import { getCurrentUser } from '@/lib/auth';
import { getDashboardData } from '@/lib/data/dashboard';
import { getMyWork } from '@/lib/data/my-work';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [data, myWork] = await Promise.all([getDashboardData(), getMyWork(user?.staff_id ?? null)]);

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${firstName}`} description="Executive overview across TDK & M&P projects." />

      <StatCards counts={data.counts} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MyWorkWidget data={myWork} />
        </div>
        <WidgetCard title="Follow-Up Needed" icon={BellRing} count={data.followUp.length} href="/projects?workflow=needs_follow_up">
          <WidgetList items={data.followUp} max={6} emptyTitle="Nothing needs follow-up" emptyIcon={BellRing} render={(p) => <FollowUpRow key={p.id} project={p} />} />
        </WidgetCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <WidgetCard title="Overdue Tasks" icon={AlertTriangle} count={data.overdue.length} href="/projects">
          <WidgetList items={data.overdue} max={6} emptyTitle="No overdue tasks" emptyIcon={AlertTriangle} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
        <WidgetCard title="Due Today" icon={Clock} count={data.dueToday.length}>
          <WidgetList items={data.dueToday} max={6} emptyTitle="Nothing due today" emptyIcon={Clock} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
        <WidgetCard title="Due This Week" icon={ListChecks} count={data.dueThisWeek.length}>
          <WidgetList items={data.dueThisWeek} max={6} emptyTitle="Nothing due this week" emptyIcon={ListChecks} render={(t) => <TaskRow key={t.id} task={t} />} />
        </WidgetCard>
        <WidgetCard title="Awaiting Response" icon={Clock} count={data.counts.awaiting} href="/projects?workflow=awaiting_response">
          <WidgetList items={data.awaitingProjects} max={6} emptyTitle="No projects awaiting response" emptyIcon={Clock} render={(p) => <ProjectRowItem key={p.id} project={p} />} />
        </WidgetCard>
        <WidgetCard title="Upcoming Deadlines" icon={CalendarClock} href="/calendar">
          <WidgetList items={data.upcoming} max={6} emptyTitle="No upcoming deadlines" emptyIcon={CalendarClock} render={(e) => <FeedRow key={e.feed_id} item={e} />} />
        </WidgetCard>
        <WidgetCard title="Recently Updated" icon={FolderClock} href="/projects">
          <WidgetList items={data.recentProjects} max={6} emptyTitle="No recent activity" emptyIcon={FolderClock} render={(p) => <ProjectRowItem key={p.id} project={p} />} />
        </WidgetCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WidgetCard title="Staff Workload" icon={Users} href="/staff" className="lg:col-span-1">
          <StaffWorkloadList rows={data.workload} />
        </WidgetCard>
        <WidgetCard title="Recent Activity" icon={Activity} className="lg:col-span-2">
          <WidgetList items={data.activity} max={10} emptyTitle="No activity yet" emptyIcon={Activity} render={(a) => <ActivityRow key={a.id} item={a} />} />
        </WidgetCard>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 p-4 pb-0">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <CalendarView defaultView="month" compact />
        </CardContent>
      </Card>
    </div>
  );
}
