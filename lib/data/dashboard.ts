import { startOfDay, endOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { getDueItems, type DueItem } from '@/lib/data/due-items';
import { suggestProjectLead } from '@/lib/data/staff';
import { computeSchedule, type ScheduleSubmittal, type ScheduleTask } from '@/lib/schedule';
import type { ProjectListItem, CompletedTaskItem, StaffRef } from '@/lib/types';
import type { CalendarFeedRow, FollowUpNeededRow, ProjectPhaseRow, ProjectStatus, WorkflowState, InactiveReason, TaskStatus, TaskPriority } from '@/types/database.types';

const PROJECT_SELECT =
  // NOTE: also used against v_awaiting_response_projects, a `select p.*` view
  // created before current_phase_name existed — so it does NOT expose that
  // column. Don't add it here; it's enriched from the base table below.
  'id,project_number,name,company_id,status,phase,workflow_state,workflow_state_since,target_completion_date,last_activity_at,description,scope,project_manager_id,inactive_reason,created_by,created_at,updated_at,company:companies(id,key,name,color),manager:staff!projects_project_manager_id_fkey(id,full_name,initials)';
const COMPLETED_SELECT =
  'id,project_id,name,description,priority,status,due_date,completion_pct,notes,created_by,completed_at,created_at,updated_at,project:projects(id,project_number,name),assignees:task_staff(staff:staff(id,full_name,initials))';

export interface DashboardData {
  counts: { active: number; on_hold: number; inactive: number; awaiting: number };
  dueToday: DueItem[];
  dueThisWeek: DueItem[];
  overdue: DueItem[];
  awaitingProjects: ProjectListItem[];
  followUp: FollowUpNeededRow[];
  recentlyCompleted: CompletedTaskItem[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const countBy = (status: 'active' | 'on_hold' | 'inactive') =>
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', status);

  const [activeC, holdC, inactiveC, awaitingC, due, awaitingProjects, followUp, recentlyCompleted] =
    await Promise.all([
      countBy('active'),
      countBy('on_hold'),
      countBy('inactive'),
      supabase.from('v_awaiting_response_projects').select('*', { count: 'exact', head: true }),
      getDueItems(),
      supabase
        .from('v_awaiting_response_projects')
        .select(PROJECT_SELECT)
        .order('workflow_state_since', { ascending: true, nullsFirst: true })
        .limit(8)
        .returns<ProjectListItem[]>(),
      supabase
        .from('v_follow_up_needed')
        .select('*')
        .eq('reason', 'needs_follow_up')
        .order('last_activity_at', { ascending: true })
        .limit(10)
        .returns<FollowUpNeededRow[]>(),
      supabase
        .from('tasks')
        .select(COMPLETED_SELECT)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(8)
        .returns<CompletedTaskItem[]>(),
    ]);

  // P2: the awaiting view predates current_phase_name, so backfill it from the
  // base table — the "Waiting on Others" widget shows the Timeline phase, not
  // the legacy enum. One small keyed lookup; skipped when the widget is empty.
  const awaiting = awaitingProjects.data ?? [];
  if (awaiting.length > 0) {
    const { data: phaseRows } = await supabase
      .from('projects')
      .select('id,current_phase_name')
      .in('id', awaiting.map((p) => p.id));
    const phaseById = new Map((phaseRows ?? []).map((r) => [r.id, r.current_phase_name]));
    for (const p of awaiting) p.current_phase_name = phaseById.get(p.id) ?? null;
  }

  return {
    counts: {
      active: activeC.count ?? 0,
      on_hold: holdC.count ?? 0,
      inactive: inactiveC.count ?? 0,
      awaiting: awaitingC.count ?? 0,
    },
    dueToday: due.today,
    dueThisWeek: due.week,
    overdue: due.overdue,
    awaitingProjects: awaiting,
    followUp: followUp.data ?? [],
    recentlyCompleted: recentlyCompleted.data ?? [],
  };
}

export interface ScheduleHealthSummary {
  onSchedule: number;
  slipping: number;
  behind: number;
  slippingProjects: { id: string; project_number: string; name: string; reason: string }[];
  behindProjects: { id: string; project_number: string; name: string; reason: string }[];
}

const EMPTY_SCHEDULE_HEALTH: ScheduleHealthSummary = {
  onSchedule: 0, slipping: 0, behind: 0, slippingProjects: [], behindProjects: [],
};

/**
 * V4.0 dashboard "Project Schedule Health" — runs the schedule engine across all
 * active projects. A few set-based reads aggregated in memory (no per-project
 * fan-out), reusing lib/schedule so the verdict matches the project pages.
 */
export async function getScheduleHealth(): Promise<ScheduleHealthSummary> {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_number, name, created_at, target_completion_date, status, workflow_state, current_phase_name, inactive_reason')
    .in('status', ['active', 'on_hold'])
    .returns<Array<{
      id: string; project_number: string; name: string; created_at: string;
      target_completion_date: string | null; status: ProjectStatus; workflow_state: WorkflowState;
      current_phase_name: string | null; inactive_reason: InactiveReason | null;
    }>>();
  const projs = projects ?? [];
  if (projs.length === 0) return EMPTY_SCHEDULE_HEALTH;
  const ids = projs.map((p) => p.id);

  const [phasesRes, subsRes, tasksRes] = await Promise.all([
    supabase.from('project_phases').select('id, project_id, name, position, is_current, start_date, end_date, progress, created_at')
      .in('project_id', ids).order('position', { ascending: true }).returns<ProjectPhaseRow[]>(),
    supabase.from('project_submittals').select('id, project_id, status, response_due_date, submission_type')
      .in('project_id', ids).returns<Array<ScheduleSubmittal & { project_id: string }>>(),
    supabase.from('tasks').select('project_id, status, due_date, priority')
      .in('project_id', ids).returns<Array<ScheduleTask & { project_id: string }>>(),
  ]);

  const group = <T extends { project_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const r of rows ?? []) {
      let arr = map.get(r.project_id);
      if (!arr) { arr = []; map.set(r.project_id, arr); }
      arr.push(r);
    }
    return map;
  };
  const phasesBy = group(phasesRes.data);
  const subsBy = group(subsRes.data);
  const tasksBy = group(tasksRes.data);

  const out: ScheduleHealthSummary = { ...EMPTY_SCHEDULE_HEALTH, slippingProjects: [], behindProjects: [] };
  for (const proj of projs) {
    const sched = computeSchedule(proj, phasesBy.get(proj.id) ?? [], subsBy.get(proj.id) ?? [], tasksBy.get(proj.id) ?? []);
    const entry = { id: proj.id, project_number: proj.project_number, name: proj.name, reason: sched.healthReasons[0] ?? '' };
    if (sched.health === 'behind') {
      out.behind++;
      if (out.behindProjects.length < 6) out.behindProjects.push({ ...entry, reason: entry.reason || 'behind schedule' });
    } else if (sched.health === 'slipping') {
      out.slipping++;
      if (out.slippingProjects.length < 6) out.slippingProjects.push({ ...entry, reason: entry.reason || 'at risk' });
    } else {
      out.onSchedule++;
    }
  }
  return out;
}

// ── V5 Office Dashboard ──────────────────────────────────────────────────────
// Lean overview for the compact "command center" — counts + due buckets + today's
// agenda, all from existing single sources (getDueItems, the project counts,
// v_calendar_feed). Every tile/button links out to the one canonical filtered
// list, so the dashboard never re-renders detail.

export interface OfficeOverview {
  counts: { active: number; on_hold: number; inactive: number; awaiting: number };
  due: { overdue: number; today: number; week: number; high: number };
  needsAttention: number;
  todaySchedule: CalendarFeedRow[];
}

export async function getOfficeOverview(): Promise<OfficeOverview> {
  const supabase = await createClient();
  const now = new Date();
  const dayStart = startOfDay(now).toISOString();
  const dayEnd = endOfDay(now).toISOString();

  const countBy = (status: 'active' | 'on_hold' | 'inactive') =>
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', status);

  const [activeC, holdC, inactiveC, awaitingC, needsC, due, todayRes] = await Promise.all([
    countBy('active'),
    countBy('on_hold'),
    countBy('inactive'),
    supabase.from('v_awaiting_response_projects').select('*', { count: 'exact', head: true }),
    supabase.from('v_follow_up_needed').select('*', { count: 'exact', head: true }).eq('reason', 'needs_follow_up'),
    getDueItems(),
    supabase
      .from('v_calendar_feed')
      .select('*')
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .order('start_at', { ascending: true })
      .limit(12)
      .returns<CalendarFeedRow[]>(),
  ]);

  return {
    counts: {
      active: activeC.count ?? 0,
      on_hold: holdC.count ?? 0,
      inactive: inactiveC.count ?? 0,
      awaiting: awaitingC.count ?? 0,
    },
    due: { overdue: due.overdue.length, today: due.today.length, week: due.week.length, high: due.high.length },
    needsAttention: needsC.count ?? 0,
    todaySchedule: todayRes.data ?? [],
  };
}

/**
 * Active/on-hold projects with no ACTIVE manager (none assigned, or the assigned
 * manager was deactivated). Feeds the admin/PM dashboard alert box, which only
 * appears when this list is non-empty. Each entry carries a SUGGESTED new
 * manager (active staff with the most open tasks on the project) that a human
 * confirms with one click.
 */
export interface LeaderlessProject {
  id: string;
  project_number: string;
  name: string;
  former_manager: string | null; // deactivated manager name, null if none was set
  suggested: StaffRef | null;
}

export async function getLeaderlessProjects(): Promise<LeaderlessProject[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('id, project_number, name, manager:staff!projects_project_manager_id_fkey(id, full_name, is_active)')
    .in('status', ['active', 'on_hold'])
    .order('project_number')
    .returns<{ id: string; project_number: string; name: string; manager: { id: string; full_name: string; is_active: boolean } | null }[]>();

  const leaderless = (data ?? []).filter((p) => !p.manager || !p.manager.is_active);
  return Promise.all(
    leaderless.map(async (p) => ({
      id: p.id,
      project_number: p.project_number,
      name: p.name,
      former_manager: p.manager && !p.manager.is_active ? p.manager.full_name : null,
      suggested: await suggestProjectLead(supabase, p.id, p.manager?.id),
    })),
  );
}
