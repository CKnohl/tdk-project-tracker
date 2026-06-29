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
 * project manager role, project team membership, task assignments, and submittal
 * assignments. Used when someone leaves or hands off their book.
 *
 * Runs in a single SECURITY DEFINER function (transfer_staff_ownership, 0030) so
 * the whole hand-off is atomic — the previous version did four sequential writes
 * with no error checks and could leave a half-transferred book while reporting
 * success. The function authorizes the caller internally (rank >= 30) too.
 */
export async function transferOwnership(fromStaffId: string, toStaffId: string): Promise<ActionResult> {
  try {
    await requireManager();
    if (fromStaffId === toStaffId) return fail('Pick a different staff member to transfer to.');
    const supabase = await createClient();

    const { error } = await supabase.rpc('transfer_staff_ownership', { p_from: fromStaffId, p_to: toStaffId });
    if (error) return fail(`Couldn't transfer ownership: ${error.message}`);

    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    revalidatePath('/projects');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
