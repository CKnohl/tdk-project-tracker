import { createClient } from '@/lib/supabase/server';
import type { TaskWithStaff, ActivityItem, ReviewItem } from '@/lib/types';

const GENERAL_TASK_SELECT =
  'id,project_id,name,description,priority,status,start_date,due_date,completion_pct,notes,recurrence,created_by,completed_at,created_at,updated_at,assignees:task_staff(staff:staff(id,full_name,initials,is_active))';

export interface GeneralTasksData {
  tasks: TaskWithStaff[];
  activity: ActivityItem[];
  reviews: Record<string, ReviewItem[]>;
}

/** Standalone office tasks (no project association) + their recent activity and timeline. */
export async function getGeneralTasks(): Promise<GeneralTasksData> {
  const supabase = await createClient();
  const [tasks, activity] = await Promise.all([
    supabase
      .from('tasks')
      .select(GENERAL_TASK_SELECT)
      .is('project_id', null)
      .order('status', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .returns<TaskWithStaff[]>(),
    supabase
      .from('activity_logs')
      .select(
        'id,actor_id,action,entity_type,entity_id,project_id,summary,metadata,created_at,actor:users(id,full_name),project:projects(id,project_number,name)',
      )
      .eq('entity_type', 'task')
      .is('project_id', null)
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<ActivityItem[]>(),
  ]);

  // Task timeline (written updates + any review events), grouped per task —
  // mirrors getProjectDetail's taskReviews so the shared detail dialog works here.
  const taskIds = (tasks.data ?? []).map((t) => t.id);
  const reviews: Record<string, ReviewItem[]> = {};
  if (taskIds.length) {
    const { data } = await supabase
      .from('task_reviews')
      .select('id,task_id,action,actor_id,comment,prior_status,created_at,actor:staff(id,full_name,initials)')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .returns<ReviewItem[]>();
    for (const r of data ?? []) (reviews[r.task_id] ??= []).push(r);
  }
  return { tasks: tasks.data ?? [], activity: activity.data ?? [], reviews };
}
