'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';

const BUCKET = 'project-files';

export async function uploadProjectFile(projectId: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('No file selected.');
    if (file.size > 50 * 1024 * 1024) return fail('File exceeds the 50 MB limit.');

    const supabase = await createClient();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${projectId}/${randomUUID()}-${safeName}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (upErr) return fail(upErr.message);

    const { error } = await supabase.from('project_files').insert({
      project_id: projectId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: user.id,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      return fail(error.message);
    }
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteProjectFile(id: string, projectId: string, storagePath: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    await supabase.storage.from(BUCKET).remove([storagePath]);
    const { error } = await supabase.from('project_files').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function createFileDownloadUrl(storagePath: string): Promise<ActionResult<string>> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);
    if (error || !data) return fail(error?.message ?? 'Could not create link.');
    return { ok: true, data: data.signedUrl };
  } catch (e) {
    return fail(errMessage(e));
  }
}
