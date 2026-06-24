'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';
import { notifyTaskAssigned, notifyProjectAssigned, notifyGeneralTaskAssigned } from '@/lib/notify';

// Staff workload management. Project Managers + Admins only (requireManager);
// RLS additionally enforces rank >= 30 for project_staff writes. All actions
// reuse the notification helpers so assignment rules stay consistent.

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function taskMeta(supabase: ServerClient, taskId: string) {
  const { data } = await supabase.from('tasks').select('name, project_id').eq('id', taskId).maybeSingle();
  return data;
}

function revalidateStaff(...staffIds: string[]) {
  for (const id of staffIds) revalidatePath(`/staff/${id}`);
  revalidatePath('/staff');
  revalidatePath('/my-work');
  revalidatePath('/dashboard');
}

/** Assign an existing task to a staff member (no-op if already assigned). */
export async function assignTaskToStaff(taskId: string, staffId: string): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('task_staff')
      .select('staff_id')
      .eq('task_id', taskId)
      .eq('staff_id', staffId)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('task_staff').insert({ task_id: taskId, staff_id: staffId });
      if (error) return fail(error.message);
      const meta = await taskMeta(supabase, taskId);
      if (meta) {
        if (meta.project_id) {
          await notifyTaskAssigned({ taskId, taskName: meta.name, projectId: meta.project_id, staffIds: [staffId], actorId: user.id });
        } else {
          await notifyGeneralTaskAssigned({ taskId, taskName: meta.name, staffIds: [staffId], actorId: user.id });
        }
      }
    }
    revalidateStaff(staffId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Remove a staff member's assignment from a task. */
export async function unassignTaskFromStaff(taskId: string, staffId: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase.from('task_staff').delete().eq('task_id', taskId).eq('staff_id', staffId);
    if (error) return fail(error.message);
    revalidateStaff(staffId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/**
 * Move one or more tasks from one staff member to another. Handles both the
 * single-task reassignment and bulk reassignment cases (taskIds length 1 vs N).
 */
export async function reassignTasks(
  taskIds: string[],
  fromStaffId: string,
  toStaffId: string,
): Promise<ActionResult> {
  try {
    const user = await requireManager();
    if (fromStaffId === toStaffId) return fail('Pick a different staff member to reassign to.');
    if (taskIds.length === 0) return fail('Select at least one task.');
    const supabase = await createClient();

    await supabase.from('task_staff').delete().eq('staff_id', fromStaffId).in('task_id', taskIds);
    await supabase
      .from('task_staff')
      .upsert(
        taskIds.map((task_id) => ({ task_id, staff_id: toStaffId })),
        { onConflict: 'task_id,staff_id', ignoreDuplicates: true },
      );

    const { data: tasks } = await supabase.from('tasks').select('id, name, project_id').in('id', taskIds);
    for (const t of tasks ?? []) {
      if (t.project_id) {
        await notifyTaskAssigned({ taskId: t.id, taskName: t.name, projectId: t.project_id, staffIds: [toStaffId], actorId: user.id });
      } else {
        await notifyGeneralTaskAssigned({ taskId: t.id, taskName: t.name, staffIds: [toStaffId], actorId: user.id });
      }
    }

    revalidateStaff(fromStaffId, toStaffId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Add a staff member to a project from their profile (no-op if already on it). */
export async function addStaffToProject(staffId: string, projectId: string): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('project_staff')
      .select('staff_id')
      .eq('project_id', projectId)
      .eq('staff_id', staffId)
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('project_staff').insert({ project_id: projectId, staff_id: staffId });
      if (error) return fail(error.message);
      await notifyProjectAssigned({ projectId, staffIds: [staffId], actorId: user.id });
    }
    revalidateStaff(staffId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Remove a staff member from a project from their profile. */
export async function removeStaffFromProject(staffId: string, projectId: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase
      .from('project_staff')
      .delete()
      .eq('project_id', projectId)
      .eq('staff_id', staffId);
    if (error) return fail(error.message);
    revalidateStaff(staffId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export interface AssignableTask {
  id: string;
  name: string;
  assignees: string[]; // staff ids already assigned
}

/** Open tasks in a project, with their current assignee staff ids, for the assign dialog. */
export async function listProjectOpenTasks(projectId: string): Promise<ActionResult<AssignableTask[]>> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { data } = await supabase
      .from('tasks')
      .select('id, name, assignees:task_staff(staff_id)')
      .eq('project_id', projectId)
      .not('status', 'in', '(completed,cancelled)')
      .order('name')
      .returns<{ id: string; name: string; assignees: { staff_id: string }[] }[]>();
    const tasks: AssignableTask[] = (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      assignees: (t.assignees ?? []).map((a) => a.staff_id).filter(Boolean),
    }));
    return { ok: true, data: tasks };
  } catch (e) {
    return fail(errMessage(e));
  }
}
