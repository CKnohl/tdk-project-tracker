import { endOfWeek, format, subDays } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  ProjectStatus,
  SubmittalStatus,
  TaskPriority,
  TaskStatus,
  WorkflowState,
} from '@/types/database.types';

// Per-person "Self Report" payload. Mirrors the Ready Report pipeline (gather →
// render → store one report_runs row) but scoped to a single staff member. Used by
// runSelfReport in lib/reports/run.ts.

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const OPEN_TASK = '(completed,cancelled)';

const TASK_SELECT =
  'id,name,due_date,priority,status,completed_at,project_id,project:projects(project_number,name),task_staff!inner(staff_id)';
const SUBMITTAL_SELECT =
  'id,submission_type,agency,status,response_due_date,follow_up_date,project:projects(project_number,name)';
const PROJECT_SELECT =
  'id,project_number,name,status,workflow_state,target_completion_date,last_activity_at,project_staff!inner(staff_id)';

export interface SelfReportTaskRow {
  id: string;
  name: string;
  project: string | null;
  project_id: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
}

export interface SelfReportSubmittalRow {
  id: string;
  project: string | null;
  submission_type: string;
  agency: string | null;
  status: SubmittalStatus;
  response_due_date: string | null;
  follow_up_date: string | null;
}

export interface SelfReportProjectRow {
  id: string;
  project_number: string;
  name: string;
  status: ProjectStatus;
  workflow_state: WorkflowState;
  target_completion_date: string | null;
}

export interface SelfReportSnapshot {
  kind: 'self_report';
  generated_at: string;
  subject: { staff_id: string; full_name: string };
  counts: {
    open_tasks: number;
    overdue: number;
    due_this_week: number;
    submittals: number;
    active_projects: number;
  };
  executive_summary: string;
  overdue: SelfReportTaskRow[];
  due_this_week: SelfReportTaskRow[];
  upcoming: SelfReportTaskRow[];
  submittals: SelfReportSubmittalRow[];
  projects: SelfReportProjectRow[];
  completed_recently: SelfReportTaskRow[];
}

function mapTask(t: any): SelfReportTaskRow {
  return {
    id: t.id,
    name: t.name,
    project: t.project?.name ?? t.project?.project_number ?? null,
    project_id: t.project_id ?? null,
    due_date: t.due_date ?? null,
    priority: t.priority,
    status: t.status,
    completed_at: t.completed_at ?? null,
  };
}

/**
 * Compute one staff member's personal report snapshot. `client` lets callers pass
 * a request- or service-scoped client (the cron/admin path can reuse this);
 * defaults to the request-scoped client.
 */
export async function gatherSelfReport(
  staffId: string,
  client?: SupabaseClient<Database>,
): Promise<SelfReportSnapshot> {
  const supabase = client ?? (await createClient());
  const now = new Date();
  const todayStr = iso(now);
  const weekEndStr = iso(endOfWeek(now, { weekStartsOn: 1 }));
  const sinceISO = subDays(now, 7).toISOString();

  const [nameRes, openRes, completedRes, submittalsRes, projectsRes] = await Promise.all([
    supabase.from('staff').select('full_name').eq('id', staffId).maybeSingle(),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('task_staff.staff_id', staffId)
      .not('status', 'in', OPEN_TASK)
      .order('due_date', { ascending: true, nullsFirst: false })
      .returns<any[]>(),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('task_staff.staff_id', staffId)
      .eq('status', 'completed')
      .gte('completed_at', sinceISO)
      .order('completed_at', { ascending: false })
      .returns<any[]>(),
    supabase
      .from('project_submittals')
      .select(SUBMITTAL_SELECT)
      .eq('assigned_staff_id', staffId)
      .not('status', 'in', '(approved,rejected)')
      .order('follow_up_date', { ascending: true, nullsFirst: false })
      .returns<any[]>(),
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('project_staff.staff_id', staffId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false })
      .returns<any[]>(),
  ]);

  const open = (openRes.data ?? []).map(mapTask);
  const isOverdue = (t: SelfReportTaskRow) => !!t.due_date && t.due_date < todayStr;
  const isDueThisWeek = (t: SelfReportTaskRow) =>
    !!t.due_date && t.due_date >= todayStr && t.due_date <= weekEndStr;

  const overdue = open.filter(isOverdue);
  const due_this_week = open.filter(isDueThisWeek);
  const upcoming = open.filter((t) => !isOverdue(t) && !isDueThisWeek(t));

  const completed_recently = (completedRes.data ?? []).map(mapTask);

  const submittals: SelfReportSubmittalRow[] = (submittalsRes.data ?? []).map((s: any) => ({
    id: s.id,
    project: s.project?.name ?? s.project?.project_number ?? null,
    submission_type: s.submission_type,
    agency: s.agency ?? null,
    status: s.status,
    response_due_date: s.response_due_date ?? null,
    follow_up_date: s.follow_up_date ?? null,
  }));

  const projects: SelfReportProjectRow[] = (projectsRes.data ?? []).map((p: any) => ({
    id: p.id,
    project_number: p.project_number,
    name: p.name,
    status: p.status,
    workflow_state: p.workflow_state,
    target_completion_date: p.target_completion_date ?? null,
  }));

  const fullName = nameRes.data?.full_name ?? 'This staff member';
  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;
  const executive_summary =
    `${fullName} has ${plural(open.length, 'open task')} ` +
    `(${overdue.length} overdue, ${due_this_week.length} due this week) across ` +
    `${plural(projects.length, 'active project')}, with ${plural(submittals.length, 'submittal')} in flight. ` +
    (completed_recently.length > 0
      ? `${plural(completed_recently.length, 'task')} completed in the last 7 days.`
      : 'No tasks completed in the last 7 days.');

  return {
    kind: 'self_report',
    generated_at: now.toISOString(),
    subject: { staff_id: staffId, full_name: fullName },
    counts: {
      open_tasks: open.length,
      overdue: overdue.length,
      due_this_week: due_this_week.length,
      submittals: submittals.length,
      active_projects: projects.length,
    },
    executive_summary,
    overdue,
    due_this_week,
    upcoming,
    submittals,
    projects,
    completed_recently,
  };
}
