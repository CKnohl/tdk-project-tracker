import { Clock, BellRing, CircleCheckBig } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCards } from '@/components/dashboard/stat-cards';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { PriorityCard } from '@/components/dashboard/priority-card';
import {
  DueItemRow,
  ProjectRowItem,
  FollowUpRow,
  CompletedTaskRow,
  WidgetList,
} from '@/components/dashboard/rows';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getDashboardData } from '@/lib/data/dashboard';
import { GenerateReportButton } from '@/components/reports/generate-report-button';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const data = await getDashboardData();

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const canReport = canManageProjects(user?.role);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${firstName}`} description="What needs attention today across TDK & M&P.">
        {canReport && <GenerateReportButton />}
      </PageHeader>

      {/* Top KPI row */}
      <StatCards counts={data.counts} />

      {/* Priority focus — the centerpiece. Cards stay calm until there's work. */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority focus</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <PriorityCard variant="overdue" title="Overdue" count={data.overdue.length} href="/due?filter=overdue" emptyLabel="Nothing overdue">
            <WidgetList items={data.overdue} max={7} emptyTitle="Nothing overdue" render={(i) => <DueItemRow key={`${i.kind}-${i.id}`} item={i} />} />
          </PriorityCard>
          <PriorityCard variant="today" title="Due Today" count={data.dueToday.length} href="/due?filter=today" emptyLabel="Nothing due today">
            <WidgetList items={data.dueToday} max={7} emptyTitle="Nothing due today" render={(i) => <DueItemRow key={`${i.kind}-${i.id}`} item={i} />} />
          </PriorityCard>
          <PriorityCard variant="week" title="Due This Week" count={data.dueThisWeek.length} href="/due?filter=week" emptyLabel="Nothing due this week">
            <WidgetList items={data.dueThisWeek} max={7} emptyTitle="Nothing due this week" render={(i) => <DueItemRow key={`${i.kind}-${i.id}`} item={i} />} />
          </PriorityCard>
        </div>
      </section>

      {/* Secondary — where projects stand */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetCard title="Needs Attention" icon={BellRing} accent="yellow" count={data.followUp.length} href="/projects?workflow=needs_follow_up">
          <WidgetList items={data.followUp} max={8} emptyTitle="Nothing needs attention" emptyIcon={BellRing} render={(p) => <FollowUpRow key={p.id} project={p} />} />
        </WidgetCard>
        <WidgetCard title="Waiting on Others" icon={Clock} accent="blue" count={data.counts.awaiting} href="/projects?workflow=awaiting_response">
          <WidgetList items={data.awaitingProjects} max={8} emptyTitle="Not waiting on anyone" emptyIcon={Clock} render={(p) => <ProjectRowItem key={p.id} project={p} />} />
        </WidgetCard>
      </div>

      {/* Bottom — operational record */}
      <WidgetCard title="Recently Completed Tasks" icon={CircleCheckBig} count={data.recentlyCompleted.length}>
        <WidgetList items={data.recentlyCompleted} max={10} emptyTitle="No completed tasks yet" emptyIcon={CircleCheckBig} render={(t) => <CompletedTaskRow key={t.id} task={t} />} />
      </WidgetCard>
    </div>
  );
}
