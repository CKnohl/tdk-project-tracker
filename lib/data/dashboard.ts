import { addDays, format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import type {
  ProjectListItem,
  ActivityItem,
  CompletedTaskItem,
} from '@/lib/types';
import type {
  StaffWorkloadRow,
  CalendarFeedRow,
  FollowUpNeededRow,
  TaskPriority,
} from '@/types/database.types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const OPEN_TASK = '(completed,cancelled)';
const CLOSED_SUBMITTAL = '(approved,rejected)';
const PROJECT_SELECT =
  'id,project_number,name,company_id,status,phase,workflow_state,workflow_state_since,target_completion_date,last_activity_at,description,scope,project_manager_id,inactive_reason,created_by,created_at,updated_at,company:companies(id,key,name,color),manager:staff!projects_project_manager_id_fkey(id,full_name,initials)';
const DUE_TASK_SELECT =
  'id,name,priority,status,due_date,project:projects(id,project_number,name)';
const DUE_SUBMITTAL_SELECT =
  'id,submission_type,status,response_due_date,project:projects(id,project_number,name)';
const COMPLETED_SELECT =
  'id,project_id,name,description,priority,status,due_date,completion_pct,notes,created_by,completed_at,created_at,updated_at,project:projects(id,project_number,name),assignees:task_staff(staff:staff(id,full_name,initials))';

/** A task or submittal surfaced by a due-date dashboard filter. */
export interface DueItem {
  id: string;
  kind: 'task' | 'submittal';
  name: string;
  project: { id: string; project_number: string; name: string } | null;
  due_date: string | null;
  priority: TaskPriority | null;
  status: string;
  tab: 'tasks' | 'submittals';
}

export interface DashboardData {
  counts: { active: number; on_hold: number; inactive: number; awaiting: number };
  dueToday: DueItem[];
  dueThisWeek: DueItem[];
  overdue: DueItem[];
  awaitingProjects: ProjectListItem[];
  followUp: FollowUpNeededRow[];
  recentProjects: ProjectListItem[];
  workload: StaffWorkloadRow[];
  activity: ActivityItem[];
  upcoming: CalendarFeedRow[];
  recentlyCompleted: CompletedTaskItem[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = iso(today);
  const in7Str = iso(addDays(today, 7));
  const in14Str = iso(addDays(today, 14));

  const countBy = (status: 'active' | 'on_hold' | 'inactive') =>
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', status);

  const [
    activeC,
    holdC,
    inactiveC,
    awaitingC,
    dueTasksRes,
    dueSubmittalsRes,
    awaitingProjects,
    followUp,
    recentProjects,
    workload,
    activity,
    upcoming,
    recentlyCompleted,
  ] = await Promise.all([
    countBy('active'),
    countBy('on_hold'),
    countBy('inactive'),
    supabase.from('v_awaiting_response_projects').select('*', { count: 'exact', head: true }),
    // Open tasks with a due date on/before today+7 (covers overdue, today, and this week).
    supabase
      .from('tasks')
      .select(DUE_TASK_SELECT)
      .not('status', 'in', OPEN_TASK)
      .not('due_date', 'is', null)
      .lte('due_date', in7Str)
      .returns<any[]>(),
    // Non-terminal submittals whose response (due) date is on/before today+7.
    supabase
      .from('project_submittals')
      .select(DUE_SUBMITTAL_SELECT)
      .not('status', 'in', CLOSED_SUBMITTAL)
      .not('response_due_date', 'is', null)
      .lte('response_due_date', in7Str)
      .returns<any[]>(),
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
      .from('projects')
      .select(PROJECT_SELECT)
      .order('last_activity_at', { ascending: false })
      .limit(6)
      .returns<ProjectListItem[]>(),
    supabase
      .from('v_staff_workload')
      .select('*')
      .order('open_tasks', { ascending: false })
      .limit(8)
      .returns<StaffWorkloadRow[]>(),
    supabase
      .from('activity_logs')
      .select(
        'id,actor_id,action,entity_type,entity_id,project_id,summary,metadata,created_at,actor:users(id,full_name),project:projects(id,project_number,name)',
      )
      .order('created_at', { ascending: false })
      .limit(12)
      .returns<ActivityItem[]>(),
    supabase
      .from('v_calendar_feed')
      .select('*')
      .gte('start_at', todayStr)
      .lte('start_at', in14Str)
      .order('start_at', { ascending: true })
      .limit(10)
      .returns<CalendarFeedRow[]>(),
    supabase
      .from('tasks')
      .select(COMPLETED_SELECT)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(8)
      .returns<CompletedTaskItem[]>(),
  ]);

  const taskItems: DueItem[] = (dueTasksRes.data ?? []).map((t) => ({
    id: t.id,
    kind: 'task',
    name: t.name,
    project: t.project ?? null,
    due_date: t.due_date ?? null,
    priority: (t.priority ?? null) as TaskPriority | null,
    status: t.status,
    tab: 'tasks',
  }));
  const submittalItems: DueItem[] = (dueSubmittalsRes.data ?? []).map((sb) => ({
    id: sb.id,
    kind: 'submittal',
    name: sb.submission_type,
    project: sb.project ?? null,
    due_date: sb.response_due_date ?? null,
    priority: null,
    status: sb.status,
    tab: 'submittals',
  }));

  const all = [...taskItems, ...submittalItems];
  const byDue = (a: DueItem, b: DueItem) => ((a.due_date ?? '') < (b.due_date ?? '') ? -1 : 1);

  const overdue = all.filter((i) => i.due_date && i.due_date < todayStr).sort(byDue);
  const dueToday = all.filter((i) => i.due_date === todayStr).sort(byDue);
  const dueThisWeek = all.filter((i) => i.due_date && i.due_date > todayStr && i.due_date <= in7Str).sort(byDue);

  return {
    counts: {
      active: activeC.count ?? 0,
      on_hold: holdC.count ?? 0,
      inactive: inactiveC.count ?? 0,
      awaiting: awaitingC.count ?? 0,
    },
    dueToday,
    dueThisWeek,
    overdue,
    awaitingProjects: awaitingProjects.data ?? [],
    followUp: followUp.data ?? [],
    recentProjects: recentProjects.data ?? [],
    workload: workload.data ?? [],
    activity: activity.data ?? [],
    upcoming: upcoming.data ?? [],
    recentlyCompleted: recentlyCompleted.data ?? [],
  };
}
