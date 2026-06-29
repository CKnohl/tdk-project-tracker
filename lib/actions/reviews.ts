'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditor, requireProjectManager, fail, errMessage, type ActionResult } from './_helpers';
import { notifyReviewRequested, notifyTaskApproved, notifyTaskRejected } from '@/lib/notify';
import { maybeCreateRecurrence } from '@/lib/tasks-shared';

// V3.2 Phase B — task approval workflow.
//   Active → (Send for Review) → in_review → (Approve) → completed
//                                          → (Reject)  → prior active status
// completed_at / completion_pct are managed by the set_task_completion() trigger,
// so these actions never touch them directly.

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function assigneeStaffIds(supabase: ServerClient, taskId: string): Promise<string[]> {
  const { data } = await supabase.from('task_staff').select('staff_id').eq('task_id', taskId);
  return (data ?? []).map((r) => r.staff_id);
}

function revalidateTask(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/my-work');
  revalidatePath('/dashboard');
}

/** Staff submits finished work for review: → in_review, snapshot prior status, notify PM + Leads only. */
export async function sendTaskForReview(taskId: string, projectId: string): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const supabase = await createClient();
    const { data: task } = await supabase.from('tasks').select('name, status').eq('id', taskId).maybeSingle();
    if (!task) return fail('Task not found.');
    if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'in_review') {
      return fail('This task is not in an active state.');
    }
    // Concurrency-safe: only transition if the row is STILL in the status we read,
    // so two people can't both submit / can't submit a task that was just acted on.
    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: 'in_review',
        prior_status: task.status,
        review_requested_at: new Date().toISOString(),
        review_requested_by: user.staff_id,
      })
      .eq('id', taskId)
      .eq('status', task.status)
      .select('id');
    if (error) return fail(error.message);
    if (!updated || updated.length === 0) return fail('This task was just changed by someone else. Refresh and try again.');
    await supabase.from('task_reviews').insert({ task_id: taskId, action: 'submitted', actor_id: user.staff_id, prior_status: task.status });
    await notifyReviewRequested({ taskId, taskName: task.name, projectId, actorId: user.id });
    revalidateTask(projectId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Reviewer approves: → completed (+ recurrence), logs the review, notifies assignees. */
export async function approveTask(taskId: string, projectId: string): Promise<ActionResult> {
  try {
    const user = await requireProjectManager(projectId);
    const supabase = await createClient();
    const { data: task } = await supabase.from('tasks').select('name, status').eq('id', taskId).maybeSingle();
    if (!task) return fail('Task not found.');
    if (task.status !== 'in_review') return fail('This task is no longer awaiting review.');
    const assignees = await assigneeStaffIds(supabase, taskId);
    // Guard on in_review so concurrent approve/approve or approve-after-reject can't
    // both win: the loser updates 0 rows and gets a friendly message.
    const { data: updated, error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId)
      .eq('status', 'in_review')
      .select('id');
    if (error) return fail(error.message);
    if (!updated || updated.length === 0) return fail('This task was already reviewed by someone else.');
    await supabase.from('task_reviews').insert({ task_id: taskId, action: 'approved', actor_id: user.staff_id, prior_status: task.status });
    await maybeCreateRecurrence(supabase, taskId);
    await notifyTaskApproved({ taskId, taskName: task.name, projectId, assigneeStaffIds: assignees, actorId: user.id });
    revalidateTask(projectId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Reviewer rejects (comment required): → prior active status, logs the comment, notifies assignees. */
export async function rejectTask(taskId: string, projectId: string, comment: string): Promise<ActionResult> {
  try {
    const user = await requireProjectManager(projectId);
    const trimmed = (comment ?? '').trim();
    if (trimmed.length < 3) return fail('Please enter a reason for the changes requested.');
    const supabase = await createClient();
    const { data: task } = await supabase.from('tasks').select('name, status, prior_status').eq('id', taskId).maybeSingle();
    if (!task) return fail('Task not found.');
    if (task.status !== 'in_review') return fail('This task is no longer awaiting review.');
    const restore = task.prior_status ?? 'in_progress';
    const assignees = await assigneeStaffIds(supabase, taskId);
    // Guard on in_review so reject can't race with approve (or a second reject).
    const { data: updated, error } = await supabase
      .from('tasks')
      .update({ status: restore })
      .eq('id', taskId)
      .eq('status', 'in_review')
      .select('id');
    if (error) return fail(error.message);
    if (!updated || updated.length === 0) return fail('This task was already reviewed by someone else.');
    await supabase.from('task_reviews').insert({ task_id: taskId, action: 'rejected', actor_id: user.staff_id, comment: trimmed, prior_status: task.status });
    await notifyTaskRejected({ taskId, taskName: task.name, projectId, assigneeStaffIds: assignees, comment: trimmed, actorId: user.id });
    revalidateTask(projectId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Undo Complete: restore the snapshotted prior active status (completed_at cleared by trigger). */
export async function undoComplete(taskId: string, projectId: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { data: task } = await supabase.from('tasks').select('status, prior_status').eq('id', taskId).maybeSingle();
    if (!task) return fail('Task not found.');
    if (task.status !== 'completed') return fail('Only completed tasks can be reopened.');
    const restore = task.prior_status ?? 'in_progress';
    // Guard on completed so two concurrent "Undo" clicks don't both restore.
    const { data: updated, error } = await supabase
      .from('tasks')
      .update({ status: restore })
      .eq('id', taskId)
      .eq('status', 'completed')
      .select('id');
    if (error) return fail(error.message);
    if (!updated || updated.length === 0) return fail('This task was already reopened.');
    revalidateTask(projectId);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
