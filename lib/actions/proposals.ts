'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getProjectDirectory } from '@/lib/data/reference';
import { extractProposals, interpretEnabled, type ExtractedProposal } from '@/lib/intake-interpret';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';
import type { Json, ProjectMatchVerdict } from '@/types/database.types';

// V6 Phase 1 — proposal actions. interpretIntakeDocument turns a document's text into
// PROPOSALS stored in intake_proposals; edit/reject/comment operate on proposals only.
// NOTHING here writes to a tracker table (projects/tasks/submittals/notes/calendar) — that
// is a later phase. The document text is untrusted; because nothing is ever auto-applied,
// an injected instruction cannot cause a tracker change.

type InterpretResult = { interpreted: boolean; reason?: 'no_text' | 'disabled'; count?: number };

const isTextLike = (mime: string | null, name: string) =>
  (mime?.startsWith('text/') ?? false) || /\.(txt|md|markdown|csv|json|log)$/i.test(name);

function resolveProject(
  ref: string | null,
  projects: { id: string; project_number: string; name: string }[],
): { verdict: ProjectMatchVerdict; id: string | null } {
  if (!ref) return { verdict: 'unknown', id: null };
  const r = ref.trim().toLowerCase();
  const hit = projects.find((p) => p.project_number.toLowerCase() === r || p.name.toLowerCase() === r);
  if (hit) return { verdict: 'existing', id: hit.id };
  return { verdict: 'new_candidate', id: null };
}

const dedupeKey = (p: ExtractedProposal) =>
  createHash('sha1').update(`${p.proposal_type}|${p.title}|${p.source_text ?? ''}`).digest('hex');

/**
 * Interpret a document into proposals. Text source (Phase 1, no OCR): the caller's pasted
 * text, or a text-extractable file's contents. Scanned PDFs/images have no machine-readable
 * text yet → returns reason 'no_text' (OCR is Phase 2). Gated off unless configured →
 * returns reason 'disabled'. Writes ONLY to intake_proposals; never to a tracker table.
 */
export async function interpretIntakeDocument(
  intakeId: string,
  providedText?: string,
): Promise<ActionResult<InterpretResult>> {
  try {
    const user = await requireManager();
    const supabase = await createClient();

    const { data: doc } = await supabase
      .from('intake_documents')
      .select('id, storage_path, mime_type, file_name')
      .eq('id', intakeId)
      .maybeSingle();
    if (!doc) return fail('Document not found.');

    let text = providedText?.trim() ?? '';
    if (!text && isTextLike(doc.mime_type, doc.file_name)) {
      const { data: blob } = await supabase.storage.from('intake').download(doc.storage_path);
      if (blob) text = (await blob.text()).trim();
    }
    if (!text) return { ok: true, data: { interpreted: false, reason: 'no_text' } };
    if (!interpretEnabled()) return { ok: true, data: { interpreted: false, reason: 'disabled' } };

    const projects = await getProjectDirectory();
    const extracted = await extractProposals(text, projects.map((p) => ({ project_number: p.project_number, name: p.name })));
    if (!extracted) return { ok: true, data: { interpreted: false, reason: 'disabled' } };

    // Idempotent: drop untouched machine proposals for this doc, keep human-touched ones.
    await supabase.from('intake_proposals').delete().eq('intake_document_id', intakeId).eq('state', 'proposed');

    const rows = extracted.map((e) => {
      const { verdict, id } = resolveProject(e.project_ref, projects);
      return {
        intake_document_id: intakeId,
        proposal_type: e.proposal_type,
        category: e.category,
        title: e.title,
        fields: e.fields as unknown as Json,
        confidence: e.confidence,
        reasoning: e.reasoning,
        source_text: e.source_text,
        project_match: verdict,
        matched_project_id: id,
        suggested_project_ref: e.project_ref,
        suggested_assignee: e.assignee,
        suggested_due_date: e.due_date,
        uncertainties: e.uncertainties,
        state: 'proposed' as const,
        dedupe_key: dedupeKey(e),
        created_by: user.id,
      };
    });

    if (rows.length) {
      const { error } = await supabase
        .from('intake_proposals')
        .upsert(rows, { onConflict: 'intake_document_id,dedupe_key', ignoreDuplicates: true });
      if (error) return fail(error.message);
    }
    revalidatePath('/operations');
    return { ok: true, data: { interpreted: true, count: rows.length } };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export interface ProposalEdit {
  title: string;
  details: string;
  due_date: string | null;
  assignee: string | null;
  project_id: string | null;
}

/** Edit a proposal (proposal table only — never a tracker record). Marks it 'edited'. */
export async function updateProposal(id: string, input: ProposalEdit): Promise<ActionResult> {
  try {
    await requireManager();
    if (!input.title.trim()) return fail('Title is required.');
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('intake_proposals')
      .select('proposal_type, fields, project_match')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return fail('Proposal not found.');

    const detailKey = existing.proposal_type === 'note' ? 'body' : 'description';
    const fields = { ...(existing.fields as Record<string, unknown> | null ?? {}) };
    if (input.details.trim()) fields[detailKey] = input.details.trim();
    else delete fields[detailKey];

    const { error } = await supabase
      .from('intake_proposals')
      .update({
        title: input.title.trim(),
        suggested_due_date: input.due_date || null,
        suggested_assignee: input.assignee?.trim() || null,
        matched_project_id: input.project_id || null,
        project_match: input.project_id ? 'existing' : (existing.project_match ?? null),
        fields: fields as unknown as Json,
        state: 'edited',
      })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function rejectProposal(id: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase.from('intake_proposals').update({ state: 'rejected' }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function commentOnProposal(id: string, comment: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase
      .from('intake_proposals')
      .update({ comment: comment.trim() || null })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/** Restore a rejected/archived proposal back to an editable state (undo an accidental dismiss). */
export async function restoreProposal(id: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase
      .from('intake_proposals')
      .update({ state: 'edited' })
      .eq('id', id)
      .in('state', ['rejected', 'archived']);
    if (error) return fail(error.message);
    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

// ── Bulk proposal-store operations (Phase 1.2) ────────────────────────────────
// These touch ONLY intake_proposals (the proposal store), never a tracker table. Applied
// proposals are left alone so the audit link to their created record is preserved.

export interface BulkResult { count: number; skipped: number }

async function bulkSetState(ids: string[], state: 'rejected' | 'archived'): Promise<ActionResult<BulkResult>> {
  await requireManager();
  if (ids.length === 0) return { ok: true, data: { count: 0, skipped: 0 } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('intake_proposals')
    .update({ state })
    .in('id', ids)
    .neq('state', 'approved')
    .select('id');
  if (error) return fail(error.message);
  const count = data?.length ?? 0;
  revalidatePath('/operations');
  return { ok: true, data: { count, skipped: ids.length - count } };
}

export async function bulkRejectProposals(ids: string[]): Promise<ActionResult<BulkResult>> {
  try { return await bulkSetState(ids, 'rejected'); } catch (e) { return fail(errMessage(e)); }
}

export async function bulkArchiveProposals(ids: string[]): Promise<ActionResult<BulkResult>> {
  try { return await bulkSetState(ids, 'archived'); } catch (e) { return fail(errMessage(e)); }
}

/** Delete proposal rows (suggestions), never tracker records. Applied proposals are kept. */
export async function bulkDeleteProposals(ids: string[]): Promise<ActionResult<BulkResult>> {
  try {
    await requireManager();
    if (ids.length === 0) return { ok: true, data: { count: 0, skipped: 0 } };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('intake_proposals')
      .delete()
      .in('id', ids)
      .neq('state', 'approved')
      .select('id');
    if (error) return fail(error.message);
    const count = data?.length ?? 0;
    revalidatePath('/operations');
    return { ok: true, data: { count, skipped: ids.length - count } };
  } catch (e) {
    return fail(errMessage(e));
  }
}
