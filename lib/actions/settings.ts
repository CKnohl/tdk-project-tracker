'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireAdmin, fail, errMessage, type ActionResult } from './_helpers';
import type { RoleKey } from '@/lib/permissions';

export async function updateProfile(fullName: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('Not signed in');
    const name = fullName.trim();
    if (name.length < 2) return fail('Name is too short');
    const supabase = await createClient();
    const { error } = await supabase.from('users').update({ full_name: name }).eq('id', user.id);
    if (error) return fail(error.message);
    revalidatePath('/settings/profile');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setUserRole(userId: string, roleKey: RoleKey): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { data: role } = await supabase.from('roles').select('id').eq('key', roleKey).single();
    if (!role) return fail('Unknown role');
    const { error } = await supabase.from('users').update({ role_id: role.id }).eq('id', userId);
    if (error) return fail(error.message);
    revalidatePath('/settings/users');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from('users').update({ is_active: active }).eq('id', userId);
    if (error) return fail(error.message);
    revalidatePath('/settings/users');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function linkUserStaff(userId: string, staffId: string | null): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();
    // Clear any existing staff link for this user, then set both sides.
    await supabase.from('staff').update({ user_id: null }).eq('user_id', userId);
    const { error } = await supabase.from('users').update({ staff_id: staffId }).eq('id', userId);
    if (error) return fail(error.message);
    if (staffId) {
      await supabase.from('staff').update({ user_id: userId }).eq('id', staffId);
    }
    revalidatePath('/settings/users');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
