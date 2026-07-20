'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditor, fail, errMessage, type ActionResult } from './_helpers';

const BUCKET = 'project-files';

// Uploads go DIRECT to storage (browser → bucket with a signed upload ticket) in two
// steps. The file body must never pass through a server action: actions have a ~1 MB
// request limit (4.5 MB hard cap on Vercel) and double the transfer, which is why
// uploads used to hang and fail. Only metadata crosses the action boundary.

/** Step 1 — mint a signed upload ticket for this project. */
export async function createProjectFileUpload(
  projectId: string,
  fileName: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const safeName = fileName.replace(/[^\w.\-]+/g, '_');
    const path = `${projectId}/${randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail(error?.message ?? 'Could not start the upload.');
    return { ok: true, data: { path: data.path, token: data.token } };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Step 2 — after the browser uploads, verify the object exists and record its row. */
export async function registerProjectFile(
  projectId: string,
  path: string,
  meta: { file_name: string; mime_type: string | null; size_bytes: number },
): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    if (!path.startsWith(`${projectId}/`)) return fail('Invalid upload path.');
    const supabase = await createClient();

    const objectName = path.slice(projectId.length + 1);
    const { data: found, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(projectId, { search: objectName, limit: 1 });
    if (listErr) return fail(listErr.message);
    const object = found?.find((o) => o.name === objectName);
    if (!object) return fail('Upload not found in storage — try again.');

    const { error } = await supabase.from('project_files').insert({
      project_id: projectId,
      storage_path: path,
      file_name: meta.file_name,
      mime_type: meta.mime_type,
      // Prefer the size storage actually recorded over what the client claims.
      size_bytes: (object.metadata?.size as number | undefined) ?? meta.size_bytes,
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
