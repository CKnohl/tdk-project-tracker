import { createClient } from '@/lib/supabase/server';
import type { TaskWithStaff, ActivityItem } from '@/lib/types';

const GENERAL_TASK_SELECT =
  'id,project_id,name,description,priority,status,due_date,completion_pct,notes,recurrence,created_by,completed_at,created_at,updated_at,assignees:task_staff(staff:staff(id,full_name,initials))';

export interface GeneralTasksData {
  tasks: TaskWithStaff[];
  activity: ActivityItem[];
}

/** Standalone office tasks (no project association) + their recent activity. */
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
  return { tasks: tasks.data ?? [], activity: activity.data ?? [] };
}
