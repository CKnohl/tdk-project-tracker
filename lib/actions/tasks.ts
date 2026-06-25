'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { taskSchema, type TaskInput } from '@/lib/validators';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';
import { notifyTaskAssigned, notifyTaskCompleted, notifyDeadlineChanged } from '@/lib/notify';
import { syncTaskStaff, maybeCreateRecurrence } from '@/lib/tasks-shared';
import type { TaskStatus } from '@/types/database.types';

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
        start_date: v.start_date ?? null,
        due_date: v.due_date ?? null,
        completion_pct: v.completion_pct,
        notes: v.notes ?? null,
        recurrence: v.recurrence,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    if (v.staff_ids.length) {
      const { added } = await syncTaskStaff(supabase, data.id, v.staff_ids);
      if (added.length) {
        await notifyTaskAssigned({
          taskId: data.id,
          taskName: v.name,
          projectId: v.project_id,
          staffIds: added,
          actorId: user.id,
        });
      }
    }
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
    const user = await requireEditor();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();

    // Capture prior due date + status so we can detect changes after the update.
    const { data: prev } = await supabase
      .from('tasks')
      .select('due_date, status, created_by')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('tasks')
      .update({
        name: v.name,
        description: v.description ?? null,
        priority: v.priority,
        status: v.status,
        start_date: v.start_date ?? null,
        due_date: v.due_date ?? null,
        completion_pct: v.completion_pct,
        notes: v.notes ?? null,
        recurrence: v.recurrence,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    const { added } = await syncTaskStaff(supabase, id, v.staff_ids);

    if (added.length) {
      await notifyTaskAssigned({ taskId: id, taskName: v.name, projectId: v.project_id, staffIds: added, actorId: user.id });
    }
    const oldDue = prev?.due_date ?? null;
    const newDue = v.due_date ?? null;
    if (oldDue !== newDue) {
      await notifyDeadlineChanged({
        projectId: v.project_id,
        scope: 'task',
        entityId: id,
        label: v.name,
        oldDate: oldDue,
        newDate: newDue,
        staffIds: v.staff_ids,
        actorId: user.id,
      });
    }
    if (v.status === 'completed' && prev?.status !== 'completed') {
      await notifyTaskCompleted({ taskId: id, taskName: v.name, projectId: v.project_id, actorId: user.id, creatorId: prev?.created_by ?? null });
      await maybeCreateRecurrence(supabase, id);
    }

    revalidatePath(`/projects/${v.project_id}`);
    revalidatePath('/my-work');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setTaskStatus(id: string, projectId: string, status: TaskStatus): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const supabase = await createClient();
    const { data: prev } = await supabase.from('tasks').select('name, status, created_by').eq('id', id).maybeSingle();
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) return fail(error.message);
    if (status === 'completed' && prev?.status !== 'completed') {
      await notifyTaskCompleted({ taskId: id, taskName: prev?.name ?? 'Task', projectId, actorId: user.id, creatorId: prev?.created_by ?? null });
      await maybeCreateRecurrence(supabase, id);
    }
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
