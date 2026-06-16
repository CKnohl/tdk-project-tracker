'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { noteSchema, type NoteInput } from '@/lib/validators';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';

export async function createNote(input: NoteInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = noteSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('project_notes')
      .insert({ project_id: v.project_id, body: v.body, author_id: user.id })
      .select('id')
      .single();
    if (error) return fail(error.message);
    revalidatePath(`/projects/${v.project_id}`);
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteNote(id: string, projectId: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('project_notes').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
