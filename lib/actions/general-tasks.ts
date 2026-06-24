'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generalTaskSchema, type GeneralTaskInput } from '@/lib/validators';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';
import { notifyGeneralTaskAssigned, notifyGeneralTaskCompleted } from '@/lib/notify';
import { syncTaskStaff, maybeCreateRecurrence } from '@/lib/tasks-shared';

function revalidate() {
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  revalidatePath('/my-work');
}

export async function createGeneralTask(input: GeneralTaskInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = generalTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: null,
        name: v.name,
        description: v.description ?? null,
        priority: v.priority,
        status: v.status,
        due_date: v.due_date ?? null,
        completion_pct: 0,
        recurrence: v.recurrence,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    if (v.staff_ids.length) {
      const { added } = await syncTaskStaff(supabase, data.id, v.staff_ids);
      if (added.length) {
        await notifyGeneralTaskAssigned({ taskId: data.id, taskName: v.name, staffIds: added, actorId: user.id });
      }
    }
    revalidate();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateGeneralTask(id: string, input: GeneralTaskInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = generalTaskSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data: prev } = await supabase.from('tasks').select('status, created_by').eq('id', id).maybeSingle();

    const { error } = await supabase
      .from('tasks')
      .update({
        name: v.name,
        description: v.description ?? null,
        priority: v.priority,
        status: v.status,
        due_date: v.due_date ?? null,
        recurrence: v.recurrence,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    const { added } = await syncTaskStaff(supabase, id, v.staff_ids);
    if (added.length) {
      await notifyGeneralTaskAssigned({ taskId: id, taskName: v.name, staffIds: added, actorId: user.id });
    }
    if (v.status === 'completed' && prev?.status !== 'completed') {
      await notifyGeneralTaskCompleted({ taskId: id, taskName: v.name, actorId: user.id, creatorId: prev?.created_by ?? null });
      await maybeCreateRecurrence(supabase, id);
    }
    revalidate();
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setGeneralTaskStatus(id: string, status: GeneralTaskInput['status']): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const supabase = await createClient();
    const { data: prev } = await supabase.from('tasks').select('name, status, created_by').eq('id', id).maybeSingle();
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) return fail(error.message);
    if (status === 'completed' && prev?.status !== 'completed') {
      await notifyGeneralTaskCompleted({ taskId: id, taskName: prev?.name ?? 'Task', actorId: user.id, creatorId: prev?.created_by ?? null });
      await maybeCreateRecurrence(supabase, id);
    }
    revalidate();
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteGeneralTask(id: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidate();
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
