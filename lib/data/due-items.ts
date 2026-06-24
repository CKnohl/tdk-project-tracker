import { addDays, format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import type { TaskPriority } from '@/types/database.types';

// Single source of truth for due-date buckets (tasks + submittals), shared by the
// dashboard Priority Focus cards and the /due "Priority Items" full-list view, so
// the two can never disagree.

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const OPEN_TASK = '(completed,cancelled)';
const CLOSED_SUBMITTAL = '(approved,rejected)';
// NOTE: intentionally does NOT select `recurrence` — these queries must keep
// working regardless of optional columns.
const DUE_TASK_SELECT = 'id,name,priority,status,due_date,project:projects(id,project_number,name)';
const DUE_SUBMITTAL_SELECT = 'id,submission_type,status,response_due_date,project:projects(id,project_number,name)';

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

export interface DueBuckets {
  overdue: DueItem[];
  today: DueItem[];
  week: DueItem[];
}

export async function getDueItems(): Promise<DueBuckets> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = iso(today);
  const in7Str = iso(addDays(today, 7));

  const [tasksRes, submittalsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select(DUE_TASK_SELECT)
      .not('status', 'in', OPEN_TASK)
      .not('due_date', 'is', null)
      .lte('due_date', in7Str)
      .returns<any[]>(),
    supabase
      .from('project_submittals')
      .select(DUE_SUBMITTAL_SELECT)
      .not('status', 'in', CLOSED_SUBMITTAL)
      .not('response_due_date', 'is', null)
      .lte('response_due_date', in7Str)
      .returns<any[]>(),
  ]);

  const taskItems: DueItem[] = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    kind: 'task',
    name: t.name,
    project: t.project ?? null,
    due_date: t.due_date ?? null,
    priority: (t.priority ?? null) as TaskPriority | null,
    status: t.status,
    tab: 'tasks',
  }));
  const submittalItems: DueItem[] = (submittalsRes.data ?? []).map((sb) => ({
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

  return {
    overdue: all.filter((i) => i.due_date && i.due_date < todayStr).sort(byDue),
    today: all.filter((i) => i.due_date === todayStr).sort(byDue),
    week: all.filter((i) => i.due_date && i.due_date > todayStr && i.due_date <= in7Str).sort(byDue),
  };
}
