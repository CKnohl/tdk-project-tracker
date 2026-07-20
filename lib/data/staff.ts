import { endOfWeek, format } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkflowState,
} from '@/types/database.types';
import type { StaffRef, SubmittalWithProject } from '@/lib/types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const OPEN_TASK = '(completed,cancelled)';

/**
 * The ACTIVE staff member with the most open tasks on a project — the natural
 * candidate when a project is left without a manager. A SUGGESTION only: a human
 * always confirms the assignment (leaderless-project alert / dashboard box).
 */
export async function suggestProjectLead(
  supabase: SupabaseClient<Database>,
  projectId: string,
  excludeStaffId?: string | null,
): Promise<StaffRef | null> {
  const { data } = await supabase
    .from('task_staff')
    .select('staff:staff(id,full_name,initials,is_active), task:tasks!inner(project_id,status)')
    .eq('task.project_id', projectId)
    .not('task.status', 'in', OPEN_TASK)
    .returns<{ staff: (StaffRef & { is_active: boolean }) | null; task: { project_id: string; status: TaskStatus } | null }[]>();

  const counts = new Map<string, { staff: StaffRef; count: number }>();
  for (const row of data ?? []) {
    const s = row.staff;
    if (!s || !s.is_active || s.id === excludeStaffId) continue;
    const agg = counts.get(s.id) ?? { staff: { id: s.id, full_name: s.full_name, initials: s.initials }, count: 0 };
    agg.count++;
    counts.set(s.id, agg);
  }
  let best: { staff: StaffRef; count: number } | null = null;
  for (const c of counts.values()) if (!best || c.count > best.count) best = c;
  return best?.staff ?? null;
}

export interface StaffDashboardCard {
  id: string;
  full_name: string;
  initials: string | null;
  activeProjects: number;
  generalTasks: number;
  reviewQueue: number; // in_review tasks on projects they PM or lead
  openTasks: number; // workload
  overdueTasks: number;
  dueThisWeek: number;
  completionRate: number; // 0–100 of non-cancelled assigned tasks
  pmCount: number; // active projects they manage
  leadCount: number; // projects they lead
}

/**
 * Management-dashboard metrics for every active staff member. A handful of
 * set-based reads aggregated in memory — no per-staff fan-out, no new view.
 */
export async function getStaffDashboard(): Promise<StaffDashboardCard[]> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = iso(today);
  const weekEndStr = iso(endOfWeek(today, { weekStartsOn: 1 }));

  const [staffRes, taskRes, projStaffRes, projectsRes, leadRes, reviewRes] = await Promise.all([
    supabase.from('staff').select('id, full_name, initials').eq('is_active', true).order('full_name')
      .returns<{ id: string; full_name: string; initials: string | null }[]>(),
    supabase.from('task_staff').select('staff_id, task:tasks(status, due_date, project_id)')
      .returns<{ staff_id: string; task: { status: TaskStatus; due_date: string | null; project_id: string | null } | null }[]>(),
    supabase.from('project_staff').select('staff_id, project:projects(status)')
      .returns<{ staff_id: string; project: { status: ProjectStatus } | null }[]>(),
    supabase.from('projects').select('id, project_manager_id, status')
      .returns<{ id: string; project_manager_id: string | null; status: ProjectStatus }[]>(),
    supabase.from('project_leads').select('staff_id, project_id')
      .returns<{ staff_id: string; project_id: string }[]>(),
    supabase.from('tasks').select('id, project_id').eq('status', 'in_review')
      .returns<{ id: string; project_id: string | null }[]>(),
  ]);

  const cards = new Map<string, StaffDashboardCard>();
  for (const s of staffRes.data ?? []) {
    cards.set(s.id, {
      id: s.id, full_name: s.full_name, initials: s.initials,
      activeProjects: 0, generalTasks: 0, reviewQueue: 0, openTasks: 0,
      overdueTasks: 0, dueThisWeek: 0, completionRate: 0, pmCount: 0, leadCount: 0,
    });
  }

  // Tasks → workload / overdue / due-week / general / completion rate.
  const tally = new Map<string, { done: number; countable: number }>();
  for (const row of taskRes.data ?? []) {
    const c = cards.get(row.staff_id);
    const t = row.task;
    if (!c || !t || t.status === 'cancelled') continue;
    const agg = tally.get(row.staff_id) ?? { done: 0, countable: 0 };
    agg.countable++;
    if (t.status === 'completed') {
      agg.done++;
    } else {
      c.openTasks++;
      if (t.project_id === null) c.generalTasks++;
      if (t.due_date && t.due_date < todayStr) c.overdueTasks++;
      else if (t.due_date && t.due_date >= todayStr && t.due_date <= weekEndStr) c.dueThisWeek++;
    }
    tally.set(row.staff_id, agg);
  }
  for (const [sid, agg] of tally) {
    const c = cards.get(sid);
    if (c) c.completionRate = agg.countable ? Math.round((agg.done / agg.countable) * 100) : 0;
  }

  // Active project membership.
  for (const row of projStaffRes.data ?? []) {
    const c = cards.get(row.staff_id);
    if (c && row.project?.status === 'active') c.activeProjects++;
  }

  // PM mapping (+ count of active projects managed).
  const pmByProject = new Map<string, string | null>();
  for (const p of projectsRes.data ?? []) {
    pmByProject.set(p.id, p.project_manager_id);
    if (p.project_manager_id && p.status === 'active') {
      const c = cards.get(p.project_manager_id);
      if (c) c.pmCount++;
    }
  }

  // Lead mapping (+ count).
  const leadProjects = new Map<string, Set<string>>();
  for (const row of leadRes.data ?? []) {
    const c = cards.get(row.staff_id);
    if (c) c.leadCount++;
    let set = leadProjects.get(row.staff_id);
    if (!set) { set = new Set(); leadProjects.set(row.staff_id, set); }
    set.add(row.project_id);
  }

  // Review queue: in_review tasks on projects each person manages or leads.
  const inReview = reviewRes.data ?? [];
  for (const c of cards.values()) {
    const leads = leadProjects.get(c.id);
    let count = 0;
    for (const t of inReview) {
      if (!t.project_id) continue;
      if (pmByProject.get(t.project_id) === c.id || leads?.has(t.project_id)) count++;
    }
    c.reviewQueue = count;
  }

  return [...cards.values()];
}

export interface StaffMember {
  id: string;
  full_name: string;
  initials: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('staff')
    .select('id, full_name, initials, email, phone, user_id')
    .eq('id', id)
    .maybeSingle();
  // A query failure must not masquerade as "staff not found" (→ silent 404). If this
  // logs "column ... schema cache", reload the Data API schema cache in Supabase.
  if (error) console.error('[getStaffMember] query failed:', error.message);
  return data;
}

export interface StaffProjectRow {
  project_id: string;
  project_number: string;
  name: string;
  status: ProjectStatus;
  workflow_state: WorkflowState;
  role_on_project: string | null;
}

export interface StaffTaskRow {
  id: string;
  name: string;
  project_id: string;
  project_number: string | null;
  project_name: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface StaffWorkloadSummary {
  openTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
  assignedProjects: number;
  awaitingProjects: number;
  attentionProjects: number;
}

export interface StaffWorkloadDetail {
  member: StaffMember;
  summary: StaffWorkloadSummary;
  projects: StaffProjectRow[];
  tasks: StaffTaskRow[];
  submittals: SubmittalWithProject[];
}

const SUBMITTAL_SELECT =
  'id,project_id,submission_type,agency,submission_date,response_due_date,follow_up_date,assigned_staff_id,status,notes,created_by,created_at,updated_at,project:projects(id,project_number,name),assigned:staff(id,full_name,initials)';

/**
 * Everything the staff workload center needs for one person: a workload summary,
 * their assigned projects (with role + state), their open tasks, and open
 * submittals. Read-only — mutations live in lib/actions/workload.ts.
 */
export async function getStaffWorkloadDetail(staffId: string): Promise<StaffWorkloadDetail | null> {
  const member = await getStaffMember(staffId);
  if (!member) return null;

  const supabase = await createClient();
  const today = new Date();
  const todayStr = iso(today);
  const weekEndStr = iso(endOfWeek(today, { weekStartsOn: 1 }));

  const [projectsRes, tasksRes, submittalsRes] = await Promise.all([
    supabase
      .from('project_staff')
      .select('role_on_project, project:projects(id,project_number,name,status,workflow_state)')
      .eq('staff_id', staffId)
      .returns<{ role_on_project: string | null; project: { id: string; project_number: string; name: string; status: ProjectStatus; workflow_state: WorkflowState } | null }[]>(),
    supabase
      .from('tasks')
      .select('id,name,project_id,due_date,priority,status,task_staff!inner(staff_id),project:projects(project_number,name)')
      .eq('task_staff.staff_id', staffId)
      .not('status', 'in', OPEN_TASK)
      .order('due_date', { ascending: true, nullsFirst: false })
      .returns<{ id: string; name: string; project_id: string; due_date: string | null; priority: TaskPriority; status: TaskStatus; project: { project_number: string; name: string } | null }[]>(),
    supabase
      .from('project_submittals')
      .select(SUBMITTAL_SELECT)
      .eq('assigned_staff_id', staffId)
      .not('status', 'in', '(approved,rejected)')
      .order('follow_up_date', { ascending: true, nullsFirst: false })
      .returns<SubmittalWithProject[]>(),
  ]);

  const projects: StaffProjectRow[] = (projectsRes.data ?? [])
    .filter((r) => r.project)
    .map((r) => ({
      project_id: r.project!.id,
      project_number: r.project!.project_number,
      name: r.project!.name,
      status: r.project!.status,
      workflow_state: r.project!.workflow_state,
      role_on_project: r.role_on_project,
    }))
    .sort((a, b) => a.project_number.localeCompare(b.project_number));

  const tasks: StaffTaskRow[] = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    project_id: t.project_id,
    project_number: t.project?.project_number ?? null,
    project_name: t.project?.name ?? null,
    due_date: t.due_date,
    priority: t.priority,
    status: t.status,
  }));

  const isActiveProject = (p: StaffProjectRow) => p.status === 'active' || p.status === 'on_hold';

  const summary: StaffWorkloadSummary = {
    openTasks: tasks.length,
    overdueTasks: tasks.filter((t) => t.due_date && t.due_date < todayStr).length,
    dueThisWeek: tasks.filter((t) => t.due_date && t.due_date >= todayStr && t.due_date <= weekEndStr).length,
    assignedProjects: projects.length,
    // "Waiting on Others" rule: active OR on hold.
    awaitingProjects: projects.filter((p) => p.workflow_state === 'awaiting_response' && isActiveProject(p)).length,
    attentionProjects: projects.filter(
      (p) => p.workflow_state === 'needs_follow_up' || p.workflow_state === 'urgent_follow_up',
    ).length,
  };

  return { member, summary, projects, tasks, submittals: submittalsRes.data ?? [] };
}
