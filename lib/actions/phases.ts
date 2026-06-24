'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';

// Editable project timeline phases. Staff+ who are project members (or PM/Admin)
// per RLS. projects.phase (enum) is left untouched — this drives the Timeline tab.

export async function addPhase(projectId: string, name: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const trimmed = name.trim();
    if (trimmed.length < 2) return fail('Phase name is too short');
    const supabase = await createClient();
    const { data: last } = await supabase
      .from('project_phases')
      .select('position')
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (last?.position ?? 0) + 1;
    const { error } = await supabase.from('project_phases').insert({ project_id: projectId, name: trimmed, position });
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function renamePhase(id: string, projectId: string, name: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const trimmed = name.trim();
    if (trimmed.length < 2) return fail('Phase name is too short');
    const supabase = await createClient();
    const { error } = await supabase.from('project_phases').update({ name: trimmed }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deletePhase(id: string, projectId: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('project_phases').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Persist a new ordering. `orderedIds` is the full list of phase ids in order. */
export async function reorderPhases(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('project_phases')
        .update({ position: i + 1 })
        .eq('id', orderedIds[i])
        .eq('project_id', projectId);
      if (error) return fail(error.message);
    }
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setCurrentPhase(projectId: string, id: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    await supabase.from('project_phases').update({ is_current: false }).eq('project_id', projectId).eq('is_current', true);
    const { error } = await supabase.from('project_phases').update({ is_current: true }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
