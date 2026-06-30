'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { fail, errMessage, type ActionResult } from './_helpers';

export async function markNotificationRead(id: string, read = true): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: read, read_at: read ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/my-work');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('Not signed in');
    const supabase = await createClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) return fail(error.message);
    revalidatePath('/my-work');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/my-work');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
