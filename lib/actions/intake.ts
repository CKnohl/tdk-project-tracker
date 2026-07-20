'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';

// V6 Phase 0 — Operations Center intake store (no AI). Documents land here before we
// know their project; a PM/Admin views them and files them to a project using the
// EXISTING note/task actions (createNote / createTask). This module only owns the
// intake document + its lifecycle — it never writes tracker records itself, so there
// is one write path per concern.
//
// Mirrors lib/actions/files.ts (storage upload + row insert + signed URL); gated to
// PM/Admin via requireManager (rank >= 30), matching the Operations Center.

const BUCKET = 'intake';

// Direct-to-storage upload in two steps (mirrors lib/actions/files.ts): the browser
// uploads with a signed ticket; only metadata passes through the action. The old
// pass-the-file-through-the-action path hit the ~1 MB server-action body limit.

/** Step 1 — mint a signed upload ticket for the intake bucket. */
export async function createIntakeUpload(fileName: string): Promise<ActionResult<{ path: string; token: string }>> {
  try {
    await requireManager();
    const supabase = await createClient();
    const safeName = fileName.replace(/[^\w.\-]+/g, '_');
    const path = `${randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail(error?.message ?? 'Could not start the upload.');
    return { ok: true, data: { path: data.path, token: data.token } };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Step 2 — after the browser uploads, verify the object exists and record the intake row. */
export async function registerIntakeDocument(
  path: string,
  meta: { file_name: string; mime_type: string | null; size_bytes: number },
): Promise<ActionResult> {
  try {
    const user = await requireManager();
    if (path.includes('/')) return fail('Invalid upload path.');
    const supabase = await createClient();

    const { data: found, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list('', { search: path, limit: 1 });
    if (listErr) return fail(listErr.message);
    const object = found?.find((o) => o.name === path);
    if (!object) return fail('Upload not found in storage — try again.');

    const { error } = await supabase.from('intake_documents').insert({
      source_type: 'upload',
      storage_path: path,
      file_name: meta.file_name,
      mime_type: meta.mime_type,
      size_bytes: (object.metadata?.size as number | undefined) ?? meta.size_bytes,
      status: 'received',
      uploaded_by: user.id,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      return fail(error.message);
    }
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function createIntakeSignedUrl(storagePath: string): Promise<ActionResult<string>> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);
    if (error || !data) return fail(error?.message ?? 'Could not create link.');
    return { ok: true, data: data.signedUrl };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/**
 * Mark a document as filed to a project. The actual note/task is created by the
 * caller through the existing createNote / createTask action BEFORE calling this,
 * so intake never becomes a second write path for tracker records. filed_at / filed_by
 * are captured for quick display; the authoritative audit is the activity_logs row the
 * note/task trigger writes.
 */
export async function markIntakeFiled(id: string, projectId: string): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();
    const { error } = await supabase
      .from('intake_documents')
      .update({ status: 'filed', filed_project_id: projectId, filed_at: new Date().toISOString(), filed_by: user.id })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

// Non-filing lifecycle transitions (Start / Archive / Reopen). Filing goes through
// markIntakeFiled because it needs a project + records who filed it.
const SETTABLE = new Set(['received', 'in_progress', 'archived']);

export async function setIntakeStatus(
  id: string,
  status: 'received' | 'in_progress' | 'archived',
): Promise<ActionResult> {
  try {
    await requireManager();
    if (!SETTABLE.has(status)) return fail('Invalid status.');
    const supabase = await createClient();
    const { error } = await supabase.from('intake_documents').update({ status }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Bulk document lifecycle change (Start / Reopen / Archive). Filing stays per-document. */
export async function bulkSetIntakeStatus(
  ids: string[],
  status: 'received' | 'in_progress' | 'archived',
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireManager();
    if (!SETTABLE.has(status)) return fail('Invalid status.');
    if (ids.length === 0) return { ok: true, data: { count: 0 } };
    const supabase = await createClient();
    const { data, error } = await supabase.from('intake_documents').update({ status }).in('id', ids).select('id');
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true, data: { count: data?.length ?? 0 } };
  } catch (e) {
    return fail(errMessage(e));
  }
}
