import { addDays, format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { rankOf, type RoleKey } from '@/lib/permissions';
import type { TaskWithProject, SubmittalWithProject, ProjectListItem, ProjectRef } from '@/lib/types';
import type { TaskPriority } from '@/types/database.types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const OPEN_TASK = '(completed,cancelled)';
const TASK_SELECT =
  'id,project_id,name,description,priority,status,due_date,completion_pct,notes,created_by,completed_at,created_at,updated_at,task_staff!inner(staff_id),project:projects(id,project_number,name)';
const SUBMITTAL_SELECT =
  'id,project_id,submission_type,agency,submission_date,response_due_date,follow_up_date,assigned_staff_id,status,notes,created_by,created_at,updated_at,project:projects(id,project_number,name),assigned:staff(id,full_name,initials)';
const PROJECT_SELECT =
  'id,project_number,name,company_id,status,phase,current_phase_name,workflow_state,workflow_state_since,target_completion_date,last_activity_at,description,scope,project_manager_id,inactive_reason,created_by,created_at,updated_at,project_staff!inner(staff_id),company:companies(id,key,name,color),manager:staff!projects_project_manager_id_fkey(id,full_name,initials)';

export interface MyWorkData {
  hasStaff: boolean;
  tasks: TaskWithProject[];
  overdue: TaskWithProject[];
  upcoming: TaskWithProject[];
  submittals: SubmittalWithProject[];
  projects: ProjectListItem[];
}

const EMPTY: MyWorkData = {
  hasStaff: false,
  tasks: [],
  overdue: [],
  upcoming: [],
  submittals: [],
  projects: [],
};

export async function getMyWork(staffId: string | null): Promise<MyWorkData> {
  if (!staffId) return EMPTY;

  const supabase = await createClient();
  const today = new Date();
  const todayStr = iso(today);
  const in14Str = iso(addDays(today, 14));

  const [tasks, submittals, projects] = await Promise.all([
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('task_staff.staff_id', staffId)
      .not('status', 'in', OPEN_TASK)
      .order('due_date', { ascending: true, nullsFirst: false })
      .returns<TaskWithProject[]>(),
    supabase
      .from('project_submittals')
      .select(SUBMITTAL_SELECT)
      .eq('assigned_staff_id', staffId)
      .not('status', 'in', '(approved,rejected)')
      .order('follow_up_date', { ascending: true, nullsFirst: false })
      .returns<SubmittalWithProject[]>(),
    supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .eq('project_staff.staff_id', staffId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false })
      .returns<ProjectListItem[]>(),
  ]);

  const allTasks = tasks.data ?? [];
  const overdue = allTasks.filter((t) => t.due_date && t.due_date < todayStr);
  const upcoming = allTasks.filter((t) => t.due_date && t.due_date >= todayStr && t.due_date <= in14Str);

  return {
    hasStaff: true,
    tasks: allTasks,
    overdue,
    upcoming,
    submittals: submittals.data ?? [],
    projects: projects.data ?? [],
  };
}

export interface ReviewQueueItem {
  id: string;
  name: string;
  priority: TaskPriority;
  project_id: string | null;
  project: ProjectRef | null;
  review_requested_at: string | null;
  submitter: string | null;
}

const REVIEW_QUEUE_SELECT =
  'id,name,priority,project_id,review_requested_at,review_requested_by,project:projects(id,project_number,name)';

/**
 * Tasks awaiting review for this user. Admins / PMs (rank ≥ 30) see every pending
 * review; a Project Lead sees only tasks on projects they manage or lead. Empty
 * for everyone else. Oldest-waiting first.
 */
export async function getReviewQueue(user: { role: RoleKey; staff_id: string | null } | null): Promise<ReviewQueueItem[]> {
  if (!user) return [];
  const supabase = await createClient();

  let projectIds: string[] | null = null; // null = all (managers)
  if (rankOf(user.role) < 30) {
    if (!user.staff_id) return [];
    const [pm, leads] = await Promise.all([
      supabase.from('projects').select('id').eq('project_manager_id', user.staff_id),
      supabase.from('project_leads').select('project_id').eq('staff_id', user.staff_id),
    ]);
    projectIds = [...new Set([...(pm.data ?? []).map((p) => p.id), ...(leads.data ?? []).map((l) => l.project_id)])];
    if (projectIds.length === 0) return [];
  }

  let query = supabase
    .from('tasks')
    .select(REVIEW_QUEUE_SELECT)
    .eq('status', 'in_review')
    .order('review_requested_at', { ascending: true });
  if (projectIds) query = query.in('project_id', projectIds);

  const { data } = await query.returns<
    Array<{
      id: string; name: string; priority: TaskPriority; project_id: string | null;
      review_requested_at: string | null; review_requested_by: string | null; project: ProjectRef | null;
    }>
  >();
  const rows = data ?? [];

  const submitterIds = [...new Set(rows.map((r) => r.review_requested_by).filter((x): x is string => Boolean(x)))];
  const nameById = new Map<string, string>();
  if (submitterIds.length) {
    const { data: staff } = await supabase.from('staff').select('id, full_name').in('id', submitterIds);
    for (const s of staff ?? []) nameById.set(s.id, s.full_name);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    priority: r.priority,
    project_id: r.project_id,
    project: r.project,
    review_requested_at: r.review_requested_at,
    submitter: r.review_requested_by ? nameById.get(r.review_requested_by) ?? null : null,
  }));
}
