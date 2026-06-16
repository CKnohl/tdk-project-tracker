'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contactSchema, type ContactInput } from '@/lib/validators';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';

export async function createContact(input: ContactInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('project_contacts')
      .insert({
        project_id: v.project_id,
        name: v.name,
        company: v.company ?? null,
        email: v.email ?? null,
        phone: v.phone ?? null,
        role: v.role,
        notes: v.notes ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    revalidatePath(`/projects/${v.project_id}`);
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateContact(id: string, input: ContactInput): Promise<ActionResult> {
  try {
    await requireEditor();
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from('project_contacts')
      .update({
        name: v.name,
        company: v.company ?? null,
        email: v.email ?? null,
        phone: v.phone ?? null,
        role: v.role,
        notes: v.notes ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${v.project_id}`);
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteContact(id: string, projectId: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('project_contacts').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
