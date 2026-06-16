'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calendarEventSchema, type CalendarEventInput } from '@/lib/validators';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';

export async function createCalendarEvent(input: CalendarEventInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = calendarEventSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        title: v.title,
        description: v.description ?? null,
        event_type: v.event_type,
        start_at: new Date(v.start_at).toISOString(),
        end_at: v.end_at ? new Date(v.end_at).toISOString() : null,
        all_day: v.all_day,
        project_id: v.project_id ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    revalidatePath('/calendar');
    if (v.project_id) revalidatePath(`/projects/${v.project_id}`);
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateCalendarEvent(id: string, input: CalendarEventInput): Promise<ActionResult> {
  try {
    await requireEditor();
    const parsed = calendarEventSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: v.title,
        description: v.description ?? null,
        event_type: v.event_type,
        start_at: new Date(v.start_at).toISOString(),
        end_at: v.end_at ? new Date(v.end_at).toISOString() : null,
        all_day: v.all_day,
        project_id: v.project_id ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/calendar');
    if (v.project_id) revalidatePath(`/projects/${v.project_id}`);
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteCalendarEvent(id: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/calendar');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
