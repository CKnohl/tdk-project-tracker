'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { submittalSchema, type SubmittalInput } from '@/lib/validators';
import { requireEditor, requireManager, fail, errMessage, type ActionResult } from './_helpers';
import type { SubmittalStatus } from '@/types/database.types';

export async function createSubmittal(input: SubmittalInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = submittalSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('project_submittals')
      .insert({
        project_id: v.project_id,
        submission_type: v.submission_type,
        agency: v.agency ?? null,
        submission_date: v.submission_date ?? null,
        response_due_date: v.response_due_date ?? null,
        follow_up_date: v.follow_up_date ?? null,
        assigned_staff_id: v.assigned_staff_id ?? null,
        status: v.status,
        notes: v.notes ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    revalidatePath(`/projects/${v.project_id}`);
    revalidatePath('/dashboard');
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateSubmittal(id: string, input: SubmittalInput): Promise<ActionResult> {
  try {
    await requireEditor();
    const parsed = submittalSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from('project_submittals')
      .update({
        submission_type: v.submission_type,
        agency: v.agency ?? null,
        submission_date: v.submission_date ?? null,
        response_due_date: v.response_due_date ?? null,
        follow_up_date: v.follow_up_date ?? null,
        assigned_staff_id: v.assigned_staff_id ?? null,
        status: v.status,
        notes: v.notes ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${v.project_id}`);
    revalidatePath('/dashboard');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Quick status change (used by the one-click Complete button). */
export async function setSubmittalStatus(
  id: string,
  projectId: string,
  status: SubmittalStatus,
): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('project_submittals').update({ status }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteSubmittal(id: string, projectId: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase.from('project_submittals').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
