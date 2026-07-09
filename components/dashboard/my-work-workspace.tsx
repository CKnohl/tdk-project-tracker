'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { isToday, isYesterday, isThisWeek, parseISO, format, addDays, endOfWeek } from 'date-fns';
import {
  ListChecks, Inbox, CalendarClock, ClipboardCheck, FolderKanban, FileText, FileWarning, Search, X, Bell,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TaskRow, SubmittalRowItem, ProjectRowItem, WidgetList } from '@/components/dashboard/rows';
import { NotificationsList } from '@/components/notifications/notifications-list';
import { ReviewQueue } from '@/components/dashboard/review-queue';
import { RecentlyViewed } from '@/components/dashboard/recently-viewed';
import { SelfReportButton } from '@/components/reports/self-report-button';
import { EmptyState } from '@/components/shared/empty-state';
import { MetaBadge } from '@/components/shared/meta-badge';
import { WORKFLOW_STATE } from '@/lib/constants';
import { cn, formatDate, formatDateTime, formatRelative } from '@/lib/utils';
import type { MyWorkData, ReviewQueueItem, MyReportRow, ProjectWithStats } from '@/lib/data/my-work';
import type { NotificationItem } from '@/lib/types';

// My Work — the place an engineer opens every morning. Pinned Summary / Recently /
// Search + a folder rail; the page grows naturally (no viewport lock) and only long
// lists scroll internally, so it's resilient on any monitor. The rail is sticky and
// the active folder lives in the URL (?tab=) so Back restores it. Summary is
// CONTEXTUAL — its numbers change with the selected folder.

const FOLDERS = ['todo', 'inbox', 'reviews', 'schedule', 'projects', 'reports'] as const;
type Folder = (typeof FOLDERS)[number];

const REPORT_TYPE_LABEL: Record<string, string> = {
  self_report: 'Self Report',
  ready_report: 'Ready Report',
  daily_digest: 'Daily Digest',
};

const REPORT_BUCKETS = ['Today', 'Yesterday', 'This Week', 'Older'] as const;
function reportBucket(iso: string): (typeof REPORT_BUCKETS)[number] {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'This Week';
  return 'Older';
}

// Long lists scroll inside themselves instead of stretching the page.
const SCROLL = 'max-h-[70vh] overflow-y-auto';

interface Ctx { label: string; value: number; tone?: string }

function ContextStat({ label, value, tone }: Ctx) {
  return (
    <Card className="min-w-[110px] flex-1 p-3">
      <div className={cn('text-2xl font-bold tabular-nums', value > 0 ? tone : 'text-muted-foreground')}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

const RED = 'text-red-600 dark:text-red-400';
const AMBER = 'text-amber-600 dark:text-amber-400';
const ORANGE = 'text-orange-600 dark:text-orange-400';
const VIOLET = 'text-violet-600 dark:text-violet-400';
const SKY = 'text-sky-600 dark:text-sky-400';
const PRIMARY = 'text-primary';

export function MyWorkWorkspace({
  data,
  notifications,
  reviewQueue,
  reports,
  canGenerateReport,
  defaultFolder = 'todo',
}: {
  data: MyWorkData;
  notifications: NotificationItem[];
  reviewQueue: ReviewQueueItem[];
  reports: MyReportRow[];
  canGenerateReport: boolean;
  defaultFolder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState('');

  const raw = searchParams.get('tab') ?? defaultFolder;
  const folder: Folder = (FOLDERS as readonly string[]).includes(raw) ? (raw as Folder) : 'todo';
  const setFolder = (f: Folder) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', f);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const unread = notifications.filter((n) => !n.is_read).length;
  const deadlines = [...data.overdue, ...data.upcoming];
  const highPriority = data.tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
  const assignments = notifications.filter((n) => n.type === 'task_assigned' && !n.is_read).length;
  const waiting = data.projects.filter((p) => p.workflow_state === 'awaiting_response').length;
  const attention = data.projects.filter((p) => p.workflow_state === 'needs_follow_up' || p.workflow_state === 'urgent_follow_up').length;
  const urgentReviews = reviewQueue.filter((r) => r.priority === 'high' || r.priority === 'urgent').length;
  const reportsThisWeek = reports.filter((r) => reportBucket(r.generated_at) !== 'Older').length;

  // Date buckets for To Do / Schedule summaries ("each folder answers one question").
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const dueToday = data.tasks.filter((t) => t.due_date === todayStr).length;
  const dueTomorrow = data.tasks.filter((t) => t.due_date === tomorrowStr).length;
  const dueThisWeek = data.tasks.filter((t) => t.due_date && t.due_date >= todayStr && t.due_date <= weekEndStr).length;
  const reviewRequests = notifications.filter((n) => n.type === 'review_requested' && !n.is_read).length;

  // Contextual Summary — changes with the selected folder.
  const summary: Ctx[] = {
    todo: [
      { label: 'Open', value: data.tasks.length, tone: PRIMARY },
      { label: 'Overdue', value: data.overdue.length, tone: RED },
      { label: 'Due today', value: dueToday, tone: ORANGE },
      { label: 'High priority', value: highPriority, tone: AMBER },
    ],
    inbox: [
      { label: 'Unread', value: unread, tone: PRIMARY },
      { label: 'Assignments', value: assignments, tone: ORANGE },
      { label: 'Review requests', value: reviewRequests, tone: VIOLET },
    ],
    reviews: [
      { label: 'Pending', value: reviewQueue.length, tone: VIOLET },
      { label: 'Urgent', value: urgentReviews, tone: RED },
      { label: 'My overdue', value: data.overdue.length, tone: RED },
      { label: 'My open tasks', value: data.tasks.length, tone: PRIMARY },
    ],
    schedule: [
      { label: 'Today', value: dueToday, tone: ORANGE },
      { label: 'Tomorrow', value: dueTomorrow, tone: AMBER },
      { label: 'This week', value: dueThisWeek, tone: SKY },
    ],
    projects: [
      { label: 'Assigned', value: data.projects.length, tone: PRIMARY },
      { label: 'Waiting', value: waiting, tone: SKY },
      { label: 'Needs attention', value: attention, tone: ORANGE },
    ],
    reports: [
      { label: 'Total', value: reports.length, tone: PRIMARY },
      { label: 'This week', value: reportsThisWeek, tone: SKY },
    ],
  }[folder];

  const rail: { key: Folder; label: string; icon: typeof ListChecks; count: number }[] = [
    { key: 'todo', label: 'To Do', icon: ListChecks, count: data.tasks.length },
    { key: 'inbox', label: 'Inbox', icon: Inbox, count: unread },
    { key: 'reviews', label: 'Review', icon: ClipboardCheck, count: reviewQueue.length },
    { key: 'schedule', label: 'Schedule', icon: CalendarClock, count: deadlines.length },
    { key: 'projects', label: 'Projects', icon: FolderKanban, count: data.projects.length },
    { key: 'reports', label: 'Reports', icon: FileText, count: reports.length },
  ];

  const term = q.trim().toLowerCase();
  const searching = term.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Pinned chrome ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Work</h1>
          <p className="text-sm text-muted-foreground">Your personal workspace — what you need today.</p>
        </div>
        {canGenerateReport && <SelfReportButton />}
      </div>

      {!data.hasStaff && (
        <EmptyState
          icon={FolderKanban}
          title="No staff link"
          description="Your account isn't linked to a staff directory entry yet, so personal assignments won't appear. An admin can link it from Settings → Staff. Your Inbox still works below."
        />
      )}

      {/* Contextual Summary */}
      {data.hasStaff && (
        <div className="flex flex-wrap gap-3">
          {summary.map((s) => (
            <ContextStat key={s.label} {...s} />
          ))}
        </div>
      )}

      <RecentlyViewed />

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search My Work — tasks, inbox, reviews, schedule, projects, reports…"
          className="pl-8 pr-8"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {searching ? (
        <WorkspaceSearch term={term} data={data} notifications={notifications} reviewQueue={reviewQueue} reports={reports} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[190px_1fr]">
          <nav className="flex gap-1 overflow-x-auto pb-1 md:sticky md:top-20 md:flex-col md:self-start md:overflow-visible md:pb-0">
            {rail.map((it) => {
              const Icon = it.icon;
              const active = folder === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => setFolder(it.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:w-full',
                    active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="md:flex-1 md:text-left">{it.label}</span>
                  {it.count > 0 && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', active ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground')}>
                      {it.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            {folder === 'todo' && (
              <div className={cn('rounded-lg border p-2', SCROLL)}>
                <WidgetList items={data.tasks} emptyTitle="No assigned tasks" emptyIcon={ListChecks} render={(t) => <TaskRow key={t.id} task={t} />} />
              </div>
            )}

            {folder === 'inbox' && (
              <div className={SCROLL}>
                <NotificationsList items={notifications} />
              </div>
            )}

            {folder === 'reviews' &&
              (reviewQueue.length > 0 ? (
                <div className={SCROLL}>
                  <ReviewQueue items={reviewQueue} />
                </div>
              ) : (
                <EmptyState icon={ClipboardCheck} title="Nothing to review" description="Tasks submitted for your approval will appear here." />
              ))}

            {folder === 'schedule' && (
              <div className={cn('space-y-4', SCROLL)}>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deadlines</h3>
                  <div className="rounded-lg border p-2">
                    <WidgetList items={deadlines} emptyTitle="No upcoming deadlines" emptyIcon={CalendarClock} render={(t) => <TaskRow key={t.id} task={t} />} />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submittals</h3>
                  <div className="rounded-lg border p-2">
                    <WidgetList items={data.submittals} emptyTitle="No submittals assigned to you" emptyIcon={FileWarning} render={(s) => <SubmittalRowItem key={s.id} submittal={s} />} />
                  </div>
                </div>
              </div>
            )}

            {folder === 'projects' && (
              <div className={cn('rounded-lg border p-2', SCROLL)}>
                <WidgetList items={data.projects} emptyTitle="You're not assigned to any active projects" emptyIcon={FolderKanban} render={(p) => <ProjectInboxRow key={p.id} project={p} />} />
              </div>
            )}

            {folder === 'reports' && <ReportsFolder reports={reports} canGenerate={canGenerateReport} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports folder — a documents area, not another task list ──────────────────
function ReportsFolder({ reports, canGenerate }: { reports: MyReportRow[]; canGenerate: boolean }) {
  const grouped = REPORT_BUCKETS.map((b) => ({ bucket: b, rows: reports.filter((r) => reportBucket(r.generated_at) === b) })).filter(
    (g) => g.rows.length > 0,
  );

  return (
    <div className="space-y-4">
      {canGenerate && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
          <div>
            <div className="text-sm font-medium">Generate a report</div>
            <div className="text-xs text-muted-foreground">Snapshot your workload as a PDF. (Weekly / Monthly coming later.)</div>
          </div>
          <SelfReportButton />
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" description="Generate a Self Report to snapshot your workload." />
      ) : (
        <div className={cn('space-y-4', SCROLL)}>
          {grouped.map(({ bucket, rows }) => (
            <div key={bucket}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{bucket}</h3>
              <div className="divide-y rounded-lg border">
                {rows.map((r) => (
                  <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-accent">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}</div>
                        {r.summary && <div className="truncate text-xs text-muted-foreground">{r.summary}</div>}
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.generated_at)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Workspace search — the command center: across every folder ────────────────
function WorkspaceSearch({
  term,
  data,
  notifications,
  reviewQueue,
  reports,
}: {
  term: string;
  data: MyWorkData;
  notifications: NotificationItem[];
  reviewQueue: ReviewQueueItem[];
  reports: MyReportRow[];
}) {
  const tasks = data.tasks.filter((t) => t.name.toLowerCase().includes(term));
  const inbox = notifications.filter((n) => n.title.toLowerCase().includes(term) || (n.body ?? '').toLowerCase().includes(term));
  const reviews = reviewQueue.filter((r) => r.name.toLowerCase().includes(term));
  const scheduleTasks = [...data.overdue, ...data.upcoming].filter((t) => t.name.toLowerCase().includes(term));
  const submittals = data.submittals.filter((s) => s.submission_type.toLowerCase().includes(term));
  const projects = data.projects.filter((p) => p.name.toLowerCase().includes(term) || p.project_number.toLowerCase().includes(term));
  const reps = reports.filter((r) => (REPORT_TYPE_LABEL[r.report_type] ?? r.report_type).toLowerCase().includes(term) || (r.summary ?? '').toLowerCase().includes(term));

  const total = tasks.length + inbox.length + reviews.length + scheduleTasks.length + submittals.length + projects.length + reps.length;
  if (total === 0) {
    return <EmptyState icon={Search} title="No matches" description="Nothing in your workspace matches that search." />;
  }

  return (
    <div className="space-y-4">
      {tasks.length > 0 && (
        <Section title={`Tasks (${tasks.length})`}>
          <div className="rounded-lg border p-2">{tasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>
        </Section>
      )}
      {inbox.length > 0 && (
        <Section title={`Inbox (${inbox.length})`}>
          <div className="divide-y rounded-lg border">
            {inbox.map((n) => (
              <Link key={n.id} href={n.project ? `/projects/${n.project.id}` : '/my-work?tab=inbox'} className="flex items-start gap-2 px-3 py-2 hover:bg-accent">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  {n.body && <div className="truncate text-xs text-muted-foreground">{n.body}</div>}
                  <div className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
      {reviews.length > 0 && (
        <Section title={`Needs Review (${reviews.length})`}>
          <div className="divide-y rounded-lg border">
            {reviews.map((r) => (
              <Link key={r.id} href={r.project ? `/projects/${r.project.id}?tab=tasks` : '/my-work?tab=reviews'} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-accent">
                <span className="truncate text-sm font-medium">{r.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.project?.project_number ?? ''}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
      {(scheduleTasks.length > 0 || submittals.length > 0) && (
        <Section title={`Schedule (${scheduleTasks.length + submittals.length})`}>
          <div className="rounded-lg border p-2">
            {scheduleTasks.map((t) => <TaskRow key={t.id} task={t} />)}
            {submittals.map((s) => <SubmittalRowItem key={s.id} submittal={s} />)}
          </div>
        </Section>
      )}
      {projects.length > 0 && (
        <Section title={`Projects (${projects.length})`}>
          <div className="rounded-lg border p-2">{projects.map((p) => <ProjectRowItem key={p.id} project={p} />)}</div>
        </Section>
      )}
      {reps.length > 0 && (
        <Section title={`Reports (${reps.length})`}>
          <div className="divide-y rounded-lg border">
            {reps.map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-accent">
                <span className="truncate text-sm font-medium">{REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(r.generated_at)}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

// ── Project-inbox row — an at-a-glance summary line, like an Outlook email ─────
function ProjectInboxRow({ project }: { project: ProjectWithStats }) {
  const s = project.stats;
  const signals: React.ReactNode[] = [];
  if (s) {
    if (s.open_tasks > 0) signals.push(`${s.open_tasks} task${s.open_tasks === 1 ? '' : 's'}`);
    if (s.overdue_tasks > 0) signals.push(<span className="font-medium text-red-600 dark:text-red-400">{s.overdue_tasks} overdue</span>);
    if (s.awaiting_submittals > 0) signals.push(`${s.awaiting_submittals} submittal${s.awaiting_submittals === 1 ? '' : 's'}`);
    if (s.next_due_date) signals.push(`next ${formatDate(s.next_due_date)}`);
  }
  return (
    <Link href={`/projects/${project.id}`} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{project.name}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-mono">{project.project_number}</span>
          {signals.map((sig, i) => (
            <React.Fragment key={i}>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              {sig}
            </React.Fragment>
          ))}
        </div>
      </div>
      {project.workflow_state !== 'normal' && <MetaBadge meta={WORKFLOW_STATE[project.workflow_state]} />}
    </Link>
  );
}
