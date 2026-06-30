import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { FeedRow } from '@/components/dashboard/rows';
import { GenerateReportButton } from '@/components/reports/generate-report-button';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getOfficeOverview, getScheduleHealth } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils';
import type { CalendarFeedRow } from '@/types/database.types';

export const metadata = { title: 'Dashboard' };

// V5 Office Dashboard — the command center. One screen that answers "what does the
// company need today?" Every tile/button links to the single canonical list; the
// dashboard itself never re-renders detail (Rule 0: one owner per fact).

function FocusTile({ label, count, href, tone }: { label: string; count: number; href: string; tone: string }) {
  return (
    <Link href={href}>
      <Card className="card-hover flex flex-col items-center justify-center gap-1 p-4 text-center">
        <span className={cn('text-3xl font-bold tabular-nums', count > 0 ? tone : 'text-muted-foreground')}>{count}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </Card>
    </Link>
  );
}

function StatusButton({ label, count, href, dot }: { label: string; count: number; href: string; dot: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
        count === 0 && 'opacity-60',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">{count}</span>
    </Link>
  );
}

function ScheduleColumn({ title, items, empty }: { title: string; items: CalendarFeedRow[]; empty: string }) {
  return (
    <Card className="p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="-mx-2 divide-y divide-border/50">
          {items.map((i) => (
            <FeedRow key={i.feed_id} item={i} />
          ))}
        </div>
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const [user, overview, health] = await Promise.all([
    getCurrentUser(),
    getOfficeOverview(),
    getScheduleHealth(),
  ]);
  const canReport = canManageProjects(user?.role);

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description="The office command center — what the company needs today.">
        {canReport && <GenerateReportButton />}
      </PageHeader>

      {/* Priority Focus */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority Focus</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FocusTile label="Overdue" count={overview.due.overdue} href="/due?filter=overdue" tone="text-red-600 dark:text-red-400" />
          <FocusTile label="Due Today" count={overview.due.today} href="/due?filter=today" tone="text-orange-600 dark:text-orange-400" />
          <FocusTile label="Due This Week" count={overview.due.week} href="/due?filter=week" tone="text-amber-600 dark:text-amber-400" />
          <FocusTile label="High Priority" count={overview.due.high} href="/due?filter=high" tone="text-rose-600 dark:text-rose-400" />
        </div>
      </section>

      {/* Project health + attention — buttons into the canonical filtered lists */}
      <div className="flex flex-wrap gap-2">
        <StatusButton label="Behind" count={health.behind} href="/projects?health=behind" dot="bg-red-500" />
        <StatusButton label="Slipping" count={health.slipping} href="/projects?health=slipping" dot="bg-amber-500" />
        <StatusButton label="Needs Attention" count={overview.needsAttention} href="/projects?workflow=needs_follow_up" dot="bg-orange-500" />
        <StatusButton label="Waiting" count={overview.counts.awaiting} href="/projects?workflow=awaiting_response" dot="bg-sky-500" />
      </div>

      {/* Schedule */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ScheduleColumn title="Today's Schedule" items={overview.todaySchedule} empty="Nothing scheduled today." />
        <ScheduleColumn title="Upcoming Meetings" items={overview.upcomingMeetings} empty="No upcoming meetings." />
      </div>

      {/* Office Summary */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border bg-card px-4 py-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Office Summary</span>
        <Link href="/projects?status=active" className="hover:underline">
          <span className="font-semibold tabular-nums">{overview.counts.active}</span> Active
        </Link>
        <Link href="/projects?status=on_hold" className="hover:underline">
          <span className="font-semibold tabular-nums">{overview.counts.on_hold}</span> On Hold
        </Link>
        <Link href="/archive" className="hover:underline">
          <span className="font-semibold tabular-nums">{overview.counts.inactive}</span> Archive
        </Link>
      </div>
    </div>
  );
}
