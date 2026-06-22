import { endOfWeek, format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import type {
  ProjectStatus,
  StaffWorkloadRow,
  TaskPriority,
  TaskStatus,
  WorkflowState,
} from '@/types/database.types';
import type { SubmittalWithProject } from '@/lib/types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const OPEN_TASK = '(completed,cancelled)';

export async function getStaffWithWorkload(): Promise<StaffWorkloadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('v_staff_workload').select('*').order('full_name');
  return data ?? [];
}

export interface StaffMember {
  id: string;
  full_name: string;
  initials: string | null;
  email: string | null;
  user_id: string | null;
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff')
    .select('id, full_name, initials, email, user_id')
    .eq('id', id)
    .maybeSingle();
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
