'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { staffSchema, type StaffInput } from '@/lib/validators';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';

function deriveInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export async function createStaff(input: StaffInput): Promise<ActionResult> {
  try {
    await requireManager();
    const parsed = staffSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .insert({
        full_name: v.full_name,
        email: v.email ?? null,
        initials: v.initials || deriveInitials(v.full_name),
        company_id: v.company_id ?? null,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateStaff(id: string, input: StaffInput): Promise<ActionResult> {
  try {
    await requireManager();
    const parsed = staffSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from('staff')
      .update({
        full_name: v.full_name,
        email: v.email ?? null,
        initials: v.initials || deriveInitials(v.full_name),
        company_id: v.company_id ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase.from('staff').update({ is_active: active }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/**
 * Move a staff member's project responsibilities to another staff member:
 * project manager role, project team membership, task assignments, and
 * submittal assignments. Used when someone leaves or hands off their book.
 */
export async function transferOwnership(fromStaffId: string, toStaffId: string): Promise<ActionResult> {
  try {
    await requireManager();
    if (fromStaffId === toStaffId) return fail('Pick a different staff member to transfer to.');
    const supabase = await createClient();

    // 1) Project manager role
    await supabase.from('projects').update({ project_manager_id: toStaffId }).eq('project_manager_id', fromStaffId);

    // 2) Project team membership
    const { data: ps } = await supabase.from('project_staff').select('project_id').eq('staff_id', fromStaffId);
    if (ps && ps.length) {
      await supabase
        .from('project_staff')
        .upsert(ps.map((r) => ({ project_id: r.project_id, staff_id: toStaffId })), {
          onConflict: 'project_id,staff_id',
          ignoreDuplicates: true,
        });
      await supabase.from('project_staff').delete().eq('staff_id', fromStaffId);
    }

    // 3) Task assignments
    const { data: tsk } = await supabase.from('task_staff').select('task_id').eq('staff_id', fromStaffId);
    if (tsk && tsk.length) {
      await supabase
        .from('task_staff')
        .upsert(tsk.map((r) => ({ task_id: r.task_id, staff_id: toStaffId })), {
          onConflict: 'task_id,staff_id',
          ignoreDuplicates: true,
        });
      await supabase.from('task_staff').delete().eq('staff_id', fromStaffId);
    }

    // 4) Submittal assignments
    await supabase.from('project_submittals').update({ assigned_staff_id: toStaffId }).eq('assigned_staff_id', fromStaffId);

    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    revalidatePath('/projects');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
