import { addDays, endOfWeek, format, subDays } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import type { Database, ProjectStatus, TaskPriority, WorkflowState } from '@/types/database.types';

const OPEN_TASK = '(completed,cancelled)';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const PROJECT_SELECT =
  'id,project_number,name,status,workflow_state,target_completion_date,last_activity_at,company:companies(name),manager:staff!projects_project_manager_id_fkey(full_name)';
const TASK_SELECT =
  'id,name,due_date,priority,project_id,completed_at,project:projects(project_number,name),assignees:task_staff(staff:staff(full_name))';

export interface ReportCounts {
  active: number;
  on_hold: number;
  inactive: number;
  awaiting: number;
}

export interface ReportProjectRow {
  id: string;
  project_number: string;
  name: string;
  company: string | null;
  status: ProjectStatus;
  workflow_state: WorkflowState;
  manager: string | null;
  target_completion_date: string | null;
  last_activity_at: string | null;
  reason: string | null;
}

export interface ReportTaskRow {
  id: string;
  name: string;
  project: string | null;
  project_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  assignees: string[];
  completed_at: string | null;
}

export interface ReportDeadlineRow {
  title: string;
  project: string | null;
  start_at: string | null;
  source: string;
}

export interface ReportWorkloadRow {
  staff_id: string;
  full_name: string;
  open_tasks: number;
  overdue: number;
  due_this_week: number;
  active_projects: number;
}

export interface ReportWorkloadAlert {
  staff_id: string;
  full_name: string;
  kind: 'high_load' | 'overdue';
  detail: string;
}

export interface ReportRiskRow {
  label: string;
  detail: string;
  count: number;
}

export interface ReportSnapshot {
  generated_at: string;
  previous_report_at: string | null;
  counts: ReportCounts;
  previous_counts: ReportCounts | null;
  executive_summary: string;
  immediate: ReportTaskRow[];
  needs_attention: ReportProjectRow[];
  waiting: ReportProjectRow[];
  upcoming: ReportDeadlineRow[];
  workload: ReportWorkloadRow[];
  workload_alerts: ReportWorkloadAlert[];
  completed_since: ReportTaskRow[];
  new_projects: ReportProjectRow[];
  risks: ReportRiskRow[];
}

export interface PreviousReport {
  generated_at: string;
  counts: ReportCounts | null;
}

function mapProject(p: any, reason: string | null = null): ReportProjectRow {
  return {
    id: p.id,
    project_number: p.project_number,
    name: p.name,
    company: p.company?.name ?? null,
    status: p.status,
    workflow_state: p.workflow_state,
    manager: p.manager?.full_name ?? null,
    target_completion_date: p.target_completion_date ?? null,
    last_activity_at: p.last_activity_at ?? null,
    reason,
  };
}

function mapTask(t: any): ReportTaskRow {
  return {
    id: t.id,
    name: t.name,
    project: t.project?.name ?? t.project?.project_number ?? null,
    project_id: t.project_id ?? null,
    due_date: t.due_date ?? null,
    priority: t.priority,
    assignees: (t.assignees ?? []).map((a: any) => a.staff?.full_name).filter(Boolean),
    completed_at: t.completed_at ?? null,
  };
}

/**
 * Compute the full Ready Report payload. `prev` is the most recent prior report
 * run (if any); "since last report" windows and count deltas are measured
 * against it, falling back to the last 7 days when no prior report exists.
 */
export async function gatherReadyReport(
  prev: PreviousReport | null,
  client?: SupabaseClient<Database>,
): Promise<ReportSnapshot> {
  // `client` lets a future daily-digest cron reuse this exact logic with the
  // service-role client (no user session). Defaults to the request-scoped client.
  const supabase = client ?? (await createClient());
  const now = new Date();
  const generatedAt = now.toISOString();
  const todayStr = iso(now);
  const weekEndStr = iso(endOfWeek(now, { weekStartsOn: 1 }));
  const in14Str = iso(addDays(now, 14));
  const sinceISO = prev?.generated_at ?? subDays(now, 7).toISOString();

  const countBy = (status: ProjectStatus) =>
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', status);

  const [
    activeC,
    holdC,
    inactiveC,
    overdueRes,
    dueTodayRes,
    needsRes,
    waitingRes,
    upcomingRes,
    workloadRes,
    completedRes,
    newProjectsRes,
    followUpRes,
    openTasksRes,
  ] = await Promise.all([
    countBy('active'),
    countBy('on_hold'),
    countBy('inactive'),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .lt('due_date', todayStr)
      .not('status', 'in', OPEN_TASK)
      .order('due_date', { ascending: true })
      .returns<any[]>(),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('due_date', todayStr)
      .not('status', 'in', OPEN_TASK)
      .order('priority', { ascending: false })
      .returns<any[]>(),
    // Needs Attention = projects specifically flagged for follow-up.
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .in('workflow_state', ['needs_follow_up', 'urgent_follow_up'])
      .order('last_activity_at', { ascending: true })
      .returns<any[]>(),
    // Waiting on Others = active OR on hold, awaiting an external response.
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .in('status', ['active', 'on_hold'])
      .eq('workflow_state', 'awaiting_response')
      .order('last_activity_at', { ascending: true })
      .returns<any[]>(),
    supabase
      .from('v_calendar_feed')
      .select('title,project_name,start_at,source')
      .gte('start_at', todayStr)
      .lte('start_at', in14Str)
      .order('start_at', { ascending: true })
      .limit(20)
      .returns<any[]>(),
    supabase
      .from('v_staff_workload')
      .select('*')
      .order('open_tasks', { ascending: false })
      .limit(50)
      .returns<{ staff_id: string; full_name: string; open_tasks: number; active_projects: number }[]>(),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('status', 'completed')
      .gte('completed_at', sinceISO)
      .order('completed_at', { ascending: false })
      .limit(100)
      .returns<any[]>(),
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false })
      .returns<any[]>(),
    // Reason buckets feed the risk summary.
    supabase.from('v_follow_up_needed').select('reason').returns<{ reason: string }[]>(),
    // Per-assignee open-task aggregation for the staff workload ranking + alerts.
    supabase
      .from('tasks')
      .select('due_date, assignees:task_staff(staff_id)')
      .not('status', 'in', OPEN_TASK)
      .returns<{ due_date: string | null; assignees: { staff_id: string }[] }[]>(),
  ]);

  const overdue = (overdueRes.data ?? []).map(mapTask);
  const dueToday = (dueTodayRes.data ?? []).map(mapTask);
  const immediate = [...overdue, ...dueToday];

  const needs_attention = (needsRes.data ?? []).map((p) =>
    mapProject(p, p.workflow_state === 'urgent_follow_up' ? 'urgent_follow_up' : 'needs_follow_up'),
  );
  const waiting = (waitingRes.data ?? []).map((p) => mapProject(p));
  const upcoming: ReportDeadlineRow[] = (upcomingRes.data ?? []).map((r) => ({
    title: r.title,
    project: r.project_name ?? null,
    start_at: r.start_at ?? null,
    source: r.source ?? '',
  }));
  // Per-staff open / overdue / due-this-week counts from the task aggregation.
  const agg = new Map<string, { open: number; overdue: number; due: number }>();
  for (const t of openTasksRes.data ?? []) {
    for (const a of t.assignees ?? []) {
      const sid = a.staff_id;
      if (!sid) continue;
      const e = agg.get(sid) ?? { open: 0, overdue: 0, due: 0 };
      e.open += 1;
      if (t.due_date && t.due_date < todayStr) e.overdue += 1;
      else if (t.due_date && t.due_date >= todayStr && t.due_date <= weekEndStr) e.due += 1;
      agg.set(sid, e);
    }
  }

  const workload: ReportWorkloadRow[] = (workloadRes.data ?? [])
    .map((w) => {
      const a = agg.get(w.staff_id);
      return {
        staff_id: w.staff_id,
        full_name: w.full_name,
        open_tasks: a?.open ?? w.open_tasks,
        overdue: a?.overdue ?? 0,
        due_this_week: a?.due ?? 0,
        active_projects: w.active_projects,
      };
    })
    .filter((w) => w.open_tasks > 0 || w.active_projects > 0)
    .sort((x, y) => y.open_tasks - x.open_tasks || y.overdue - x.overdue);

  // Workload alerts: unusually high load (vs. team average) and overdue work.
  const withTasks = workload.filter((w) => w.open_tasks > 0);
  const avgOpen = withTasks.length ? withTasks.reduce((s, w) => s + w.open_tasks, 0) / withTasks.length : 0;
  const highThreshold = Math.max(8, Math.ceil(avgOpen * 1.5));
  const workload_alerts: ReportWorkloadAlert[] = [];
  for (const w of workload) {
    if (w.open_tasks >= highThreshold) {
      workload_alerts.push({
        staff_id: w.staff_id,
        full_name: w.full_name,
        kind: 'high_load',
        detail: `${w.open_tasks} open tasks (team average ${Math.round(avgOpen)})`,
      });
    }
  }
  for (const w of workload) {
    if (w.overdue > 0) {
      workload_alerts.push({
        staff_id: w.staff_id,
        full_name: w.full_name,
        kind: 'overdue',
        detail: `${w.overdue} overdue task${w.overdue === 1 ? '' : 's'}`,
      });
    }
  }

  const completed_since = (completedRes.data ?? []).map(mapTask);
  const new_projects = (newProjectsRes.data ?? []).map((p) => mapProject(p));

  const reasons = followUpRes.data ?? [];
  const reasonCount = (r: string) => reasons.filter((x) => x.reason === r).length;
  const urgentCount = needs_attention.filter((p) => p.workflow_state === 'urgent_follow_up').length;

  const counts: ReportCounts = {
    active: activeC.count ?? 0,
    on_hold: holdC.count ?? 0,
    inactive: inactiveC.count ?? 0,
    awaiting: waiting.length,
  };

  const risks: ReportRiskRow[] = [
    { label: 'Overdue tasks', detail: 'Open tasks past their due date', count: overdue.length },
    { label: 'Urgent attention', detail: 'Projects flagged for urgent follow-up', count: urgentCount },
    { label: 'Waiting 14+ days', detail: 'Awaiting an external response for over two weeks', count: reasonCount('awaiting_over_14d') },
    { label: 'Stalled', detail: 'Active projects with no activity in 14+ days', count: reasonCount('no_activity_14d') },
  ];

  // ── Executive summary (deterministic; AI-generated version is a future step) ─
  const topWorkload = workload[0];
  const mostUrgent = upcoming.find((u) => u.start_at);
  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;
  const parts: string[] = [];
  parts.push(
    `Since the previous report${prev ? ` on ${formatDate(prev.generated_at)}` : ''}, ` +
      `${plural(completed_since.length, 'task')} ${completed_since.length === 1 ? 'was' : 'were'} completed ` +
      `and ${plural(new_projects.length, 'new project')} ${new_projects.length === 1 ? 'was' : 'were'} created.`,
  );
  parts.push(
    `${plural(needs_attention.length, 'project')} ${needs_attention.length === 1 ? 'needs' : 'need'} attention ` +
      `and ${waiting.length} ${waiting.length === 1 ? 'is' : 'are'} waiting on others.`,
  );
  if (overdue.length > 0) {
    parts.push(`There ${overdue.length === 1 ? 'is' : 'are'} ${plural(overdue.length, 'overdue task')}.`);
  }
  if (topWorkload && topWorkload.open_tasks > 0) {
    parts.push(
      `${topWorkload.full_name} currently has the highest workload with ${plural(topWorkload.open_tasks, 'open task')}.`,
    );
  }
  const overdueStaffCount = workload_alerts.filter((a) => a.kind === 'overdue').length;
  if (overdueStaffCount > 0) {
    parts.push(
      `${overdueStaffCount} team member${overdueStaffCount === 1 ? '' : 's'} ${overdueStaffCount === 1 ? 'has' : 'have'} overdue work.`,
    );
  }
  if (mostUrgent?.start_at) {
    parts.push(
      `The most urgent upcoming deadline is ${mostUrgent.title}` +
        `${mostUrgent.project ? ` (${mostUrgent.project})` : ''} on ${formatDate(mostUrgent.start_at)}.`,
    );
  }

  return {
    generated_at: generatedAt,
    previous_report_at: prev?.generated_at ?? null,
    counts,
    previous_counts: prev?.counts ?? null,
    executive_summary: parts.join(' '),
    immediate,
    needs_attention,
    waiting,
    upcoming,
    workload,
    workload_alerts,
    completed_since,
    new_projects,
    risks,
  };
}
