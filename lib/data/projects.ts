import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type {
  ProjectListItem,
  TaskWithStaff,
  SubmittalWithProject,
  SubmittalHistoryItem,
  ContactItem,
  NoteItem,
  FileItem,
  ActivityItem,
  ProjectStaffMember,
  StaffRef,
  ReviewItem,
} from '@/lib/types';
import type { ScheduleMilestone } from '@/lib/schedule';
import type { ProjectStatsRow, ProjectStatus, ProjectPhase, WorkflowState, ProjectPhaseRow } from '@/types/database.types';

const PROJECT_SELECT =
  'id,project_number,name,company_id,status,phase,current_phase_name,workflow_state,workflow_state_since,description,scope,project_manager_id,target_completion_date,inactive_reason,last_activity_at,created_by,created_at,updated_at,company:companies(id,key,name,color),manager:staff!projects_project_manager_id_fkey(id,full_name,initials)';

export interface ProjectFilters {
  q?: string;
  status?: ProjectStatus | 'all';
  company?: number;
  phase?: ProjectPhase;
  workflow?: WorkflowState;
  sort?:
    | 'recent' | 'oldest' | 'name' | 'number' | 'number_desc' | 'target'
    | 'next_due' | 'most_overdue' | 'most_tasks' | 'most_submittals';
  archived?: boolean;
}

export type ProjectCard = ProjectListItem & { stats: ProjectStatsRow | null };

export async function getProjects(filters: ProjectFilters = {}): Promise<ProjectCard[]> {
  const supabase = await createClient();
  let query = supabase.from('projects').select(PROJECT_SELECT);

  if (filters.archived) {
    query = query.eq('status', 'inactive');
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else {
    query = query.in('status', ['active', 'on_hold']);
  }

  if (filters.company) query = query.eq('company_id', filters.company);
  if (filters.phase) query = query.eq('phase', filters.phase);
  if (filters.workflow) query = query.eq('workflow_state', filters.workflow);
  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, '');
    query = query.or(`name.ilike.%${term}%,project_number.ilike.%${term}%,description.ilike.%${term}%`);
  }

  switch (filters.sort) {
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    case 'number':
      query = query.order('project_number', { ascending: true });
      break;
    case 'number_desc':
      query = query.order('project_number', { ascending: false });
      break;
    case 'oldest':
      query = query.order('last_activity_at', { ascending: true });
      break;
    case 'target':
      query = query.order('target_completion_date', { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order('last_activity_at', { ascending: false });
  }

  const { data, error } = await query.returns<ProjectListItem[]>();
  if (error || !data) return [];

  const ids = data.map((p) => p.id);
  const statsMap = new Map<string, ProjectStatsRow>();
  if (ids.length) {
    const { data: stats } = await supabase.from('v_project_stats').select('*').in('project_id', ids);
    (stats ?? []).forEach((s) => statsMap.set(s.project_id, s));
  }

  const result = data.map((p) => ({ ...p, stats: statsMap.get(p.id) ?? null }));

  // Stats-based sorts run in memory because v_project_stats is fetched
  // separately. The DB query already applied the column sorts above.
  const n = (v: number | null | undefined) => v ?? 0;
  switch (filters.sort) {
    case 'next_due':
      result.sort((a, b) => {
        const ad = a.stats?.next_due_date ?? null;
        const bd = b.stats?.next_due_date ?? null;
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad < bd ? -1 : ad > bd ? 1 : 0;
      });
      break;
    case 'most_overdue':
      result.sort((a, b) => n(b.stats?.overdue_tasks) - n(a.stats?.overdue_tasks));
      break;
    case 'most_tasks':
      result.sort((a, b) => n(b.stats?.open_tasks) - n(a.stats?.open_tasks));
      break;
    case 'most_submittals':
      result.sort((a, b) => n(b.stats?.awaiting_submittals) - n(a.stats?.awaiting_submittals));
      break;
  }
  return result;
}

export interface ProjectDetail {
  project: ProjectListItem;
  staff: ProjectStaffMember[];
  tasks: TaskWithStaff[];
  submittals: SubmittalWithProject[];
  submittalHistory: Record<string, SubmittalHistoryItem[]>;
  contacts: ContactItem[];
  notes: NoteItem[];
  files: FileItem[];
  activity: ActivityItem[];
  stats: ProjectStatsRow | null;
  phases: ProjectPhaseRow[];
  leads: StaffRef[];
  taskReviews: Record<string, ReviewItem[]>;
  milestones: ScheduleMilestone[];
}

// Wrapped in React cache() so the detail route's generateMetadata + page body
// share one fetch per request instead of querying everything twice.
export const getProjectDetail = cache(async (id: string): Promise<ProjectDetail | null> => {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .returns<ProjectListItem[]>()
    .maybeSingle();
  if (!project) return null;

  const [staff, tasks, submittals, contacts, notes, files, activity, stats, phases, leads, milestones] = await Promise.all([
    supabase
      .from('project_staff')
      .select('role_on_project, staff:staff(id,full_name,initials)')
      .eq('project_id', id)
      .returns<ProjectStaffMember[]>(),
    supabase
      .from('tasks')
      .select(
        'id,project_id,name,description,priority,status,start_date,due_date,completion_pct,notes,recurrence,created_by,completed_at,created_at,updated_at,assignees:task_staff(staff:staff(id,full_name,initials))',
      )
      .eq('project_id', id)
      .order('status', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .returns<TaskWithStaff[]>(),
    supabase
      .from('project_submittals')
      .select(
        'id,project_id,submission_type,agency,submission_date,response_due_date,follow_up_date,assigned_staff_id,status,notes,created_by,created_at,updated_at,assigned:staff(id,full_name,initials)',
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .returns<SubmittalWithProject[]>(),
    supabase.from('project_contacts').select('*').eq('project_id', id).order('name').returns<ContactItem[]>(),
    supabase
      .from('project_notes')
      .select('id,project_id,body,author_id,created_at,updated_at,author:users(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .returns<NoteItem[]>(),
    supabase
      .from('project_files')
      .select('id,project_id,storage_path,file_name,mime_type,size_bytes,uploaded_by,created_at,uploader:users(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .returns<FileItem[]>(),
    supabase
      .from('activity_logs')
      .select('id,actor_id,action,entity_type,entity_id,project_id,summary,metadata,created_at,actor:users(id,full_name),project:projects(id,project_number,name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<ActivityItem[]>(),
    supabase.from('v_project_stats').select('*').eq('project_id', id).maybeSingle(),
    supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', id)
      .order('position', { ascending: true })
      .returns<ProjectPhaseRow[]>(),
    supabase
      .from('project_leads')
      .select('staff:staff(id,full_name,initials)')
      .eq('project_id', id)
      .returns<{ staff: StaffRef | null }[]>(),
    supabase
      .from('calendar_events')
      .select('id, title, start_at')
      .eq('project_id', id)
      .eq('event_type', 'milestone')
      .order('start_at', { ascending: true })
      .returns<ScheduleMilestone[]>(),
  ]);

  // Surface query failures instead of silently rendering an empty tab. A task
  // that belongs to this project must never be invisible here; if this logs,
  // a required migration (e.g. the tasks.recurrence column from 0021) is missing.
  if (tasks.error) console.error('[getProjectDetail] tasks query failed:', tasks.error.message);
  if (submittals.error) console.error('[getProjectDetail] submittals query failed:', submittals.error.message);

  // Submittal status history (every change, with the responsible user).
  const submittalIds = (submittals.data ?? []).map((s) => s.id);
  const submittalHistory: Record<string, SubmittalHistoryItem[]> = {};
  if (submittalIds.length) {
    const { data: history } = await supabase
      .from('submittal_history')
      .select('id,submittal_id,from_status,to_status,note,changed_by,created_at,actor:users(full_name)')
      .in('submittal_id', submittalIds)
      .order('created_at', { ascending: true })
      .returns<SubmittalHistoryItem[]>();
    for (const h of history ?? []) (submittalHistory[h.submittal_id] ??= []).push(h);
  }

  // Review history (V3.2 Phase B), newest-first, grouped by task.
  const taskIds = (tasks.data ?? []).map((t) => t.id);
  const taskReviews: Record<string, ReviewItem[]> = {};
  if (taskIds.length) {
    const { data: reviews } = await supabase
      .from('task_reviews')
      .select('id,task_id,action,actor_id,comment,prior_status,created_at,actor:staff(id,full_name,initials)')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .returns<ReviewItem[]>();
    for (const r of reviews ?? []) (taskReviews[r.task_id] ??= []).push(r);
  }

  return {
    project,
    staff: staff.data ?? [],
    tasks: tasks.data ?? [],
    submittals: submittals.data ?? [],
    submittalHistory,
    contacts: contacts.data ?? [],
    notes: notes.data ?? [],
    files: files.data ?? [],
    activity: activity.data ?? [],
    stats: stats.data ?? null,
    phases: phases.data ?? [],
    leads: (leads.data ?? []).map((l) => l.staff).filter(Boolean) as StaffRef[],
    taskReviews,
    milestones: milestones.data ?? [],
  };
});
