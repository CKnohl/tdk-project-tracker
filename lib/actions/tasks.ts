'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { taskSchema, type TaskInput } from '@/lib/validators';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';
import type { TaskStatus } from '@/types/database.types';

async function syncTaskStaff(taskId: string, staffIds: string[]) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('task_staff').select('staff_id').eq('task_id', taskId);
  const current = new Set((existing ?? []).map((r) => r.staff_id));
  const next = new Set(staffIds);
  const toAdd = staffIds.filter((s) => !current.has(s));
  const toRemove = [...current].filter((s) => !next.has(s));
  if (toAdd.length) await supabase.from('task_staff').insert(toAdd.map((staff_id) => ({ task_id: taskId, staff_id })));
  if (toRemove.length) await supabase.from('task_staff').delete().eq('task_id', taskId).in('staff_id', toRemove);
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: v.project_id,
        name: v.name,
        description: v.description ?? null,
        priority: v.priority,
        status: v.status,
        due_date: v.due_date ?? null,
        completion_pct: v.completion_pct,
        notes: v.notes ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    if (v.staff_ids.length) await syncTaskStaff(data.id, v.staff_ids);
    revalidatePath(`/projects/${v.project_id}`);
    revalidatePath('/dashboard');
    revalidatePath('/my-work');
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  try {
    await requireEditor();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from('tasks')
      .update({
        name: v.name,
        description: v.description ?? null,
        priority: v.priority,
        status: v.status,
        due_date: v.due_date ?? null,
        completion_pct: v.completion_pct,
        notes: v.notes ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    await syncTaskStaff(id, v.staff_ids);
    revalidatePath(`/projects/${v.project_id}`);
    revalidatePath('/my-work');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setTaskStatus(id: string, projectId: string, status: TaskStatus): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/my-work');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteTask(id: string, projectId: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/my-work');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
