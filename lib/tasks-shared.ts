// Shared task helpers used by both project-task and general-task server actions.
// Plain server-side functions (NOT a 'use server' module) so they can be imported
// freely without becoming server-action endpoints.

import { addDays, addWeeks, addMonths, addYears, parseISO, format } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type DB = SupabaseClient<Database>;

/** Reconcile a task's assignees; returns which staff ids were added/removed. */
export async function syncTaskStaff(
  client: DB,
  taskId: string,
  staffIds: string[],
): Promise<{ added: string[]; removed: string[] }> {
  const { data: existing } = await client.from('task_staff').select('staff_id').eq('task_id', taskId);
  const current = new Set((existing ?? []).map((r) => r.staff_id));
  const next = new Set(staffIds);
  const toAdd = staffIds.filter((s) => !current.has(s));
  const toRemove = [...current].filter((s) => !next.has(s));
  if (toAdd.length) await client.from('task_staff').insert(toAdd.map((staff_id) => ({ task_id: taskId, staff_id })));
  if (toRemove.length) await client.from('task_staff').delete().eq('task_id', taskId).in('staff_id', toRemove);
  return { added: toAdd, removed: toRemove };
}

/**
 * If a just-completed task is recurring and has a due date, create its next
 * occurrence (status reset, due date advanced by the interval, assignees copied).
 * Best-effort: never throws. Returns the new task id, if any.
 */
export async function maybeCreateRecurrence(client: DB, taskId: string): Promise<string | null> {
  try {
    const { data: t } = await client.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (!t || t.recurrence === 'none' || !t.due_date) return null;

    const base = parseISO(t.due_date);
    const next =
      t.recurrence === 'daily' ? addDays(base, 1)
      : t.recurrence === 'weekly' ? addWeeks(base, 1)
      : t.recurrence === 'monthly' ? addMonths(base, 1)
      : addYears(base, 1);

    const { data: created, error } = await client
      .from('tasks')
      .insert({
        project_id: t.project_id,
        name: t.name,
        description: t.description,
        priority: t.priority,
        status: 'not_started',
        due_date: format(next, 'yyyy-MM-dd'),
        completion_pct: 0,
        notes: t.notes,
        recurrence: t.recurrence,
        created_by: t.created_by,
      })
      .select('id')
      .single();
    if (error || !created) return null;

    const { data: assignees } = await client.from('task_staff').select('staff_id').eq('task_id', taskId);
    const ids = (assignees ?? []).map((a) => a.staff_id);
    if (ids.length) {
      await client.from('task_staff').insert(ids.map((staff_id) => ({ task_id: created.id, staff_id })));
    }
    return created.id;
  } catch {
    return null;
  }
}
