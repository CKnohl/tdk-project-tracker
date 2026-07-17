'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';
import { createTask, deleteTask } from './tasks';
import { createGeneralTask, deleteGeneralTask } from './general-tasks';
import { createSubmittal, deleteSubmittal } from './submittals';
import { createCalendarEvent, deleteCalendarEvent } from './calendar';
import { createNote, deleteNote } from './notes';
import type { Json, CalendarEventType } from '@/types/database.types';

// V6 Phase 1.1 — Proposal Apply Engine.
//
// The ONLY thing this module does is translate an approved proposal into a call to an
// EXISTING server action. It NEVER writes a tracker table directly, so there is exactly one
// write path per entity and all the existing behavior (validation, permissions, activity
// logging via triggers, and notifications) comes for free. It then records the result on the
// proposal (state=approved, applied_at/by, resulting object type + id) and retains everything
// else — nothing is deleted.

const CAL_TYPES = new Set<CalendarEventType>([
  'deadline', 'meeting', 'submittal', 'site_visit', 'follow_up', 'milestone', 'custom',
  'presentation', 'town_meeting', 'inspection',
]);

function detailOf(fields: Json): string {
  const f = fields as Record<string, unknown> | null;
  if (typeof f?.description === 'string') return f.description;
  if (typeof f?.body === 'string') return f.body;
  return '';
}
function agencyOf(fields: Json): string | undefined {
  const f = fields as Record<string, unknown> | null;
  return typeof f?.agency === 'string' && f.agency.trim() ? f.agency.trim() : undefined;
}
const eventType = (category: string | null): CalendarEventType =>
  category && CAL_TYPES.has(category as CalendarEventType) ? (category as CalendarEventType) : 'meeting';

/**
 * Approve a proposal → apply it by calling the matching existing action. Gated on a valid
 * destination (project-scoped types need a matched project; calendar needs a date) so the PM
 * is nudged to Edit first rather than silently failing.
 */
export async function approveProposal(id: string): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();

    const { data: p } = await supabase
      .from('intake_proposals')
      .select('proposal_type, category, title, fields, matched_project_id, suggested_due_date, state')
      .eq('id', id)
      .maybeSingle();
    if (!p) return fail('Proposal not found.');
    if (p.state === 'rejected') return fail('Rejected proposals can’t be approved.');
    if (p.state === 'approved') return fail('This proposal has already been applied.');

    const detail = detailOf(p.fields);
    const due = p.suggested_due_date ?? undefined;
    const needsProject = p.proposal_type === 'task' || p.proposal_type === 'note' || p.proposal_type === 'submittal';
    if (needsProject && !p.matched_project_id) return fail('Set a destination project first — Edit the proposal.');

    // Call the EXISTING action for this type. No direct tracker writes anywhere below.
    let result: ActionResult;
    switch (p.proposal_type) {
      case 'task':
        result = await createTask({
          project_id: p.matched_project_id!, name: p.title, description: detail || undefined,
          priority: 'medium', status: 'not_started', start_date: undefined, due_date: due,
          completion_pct: 0, notes: undefined, recurrence: 'none', staff_ids: [],
        });
        break;
      case 'general_task':
        result = await createGeneralTask({
          name: p.title, description: detail || undefined, priority: 'medium', status: 'not_started',
          start_date: undefined, due_date: due, recurrence: 'none', staff_ids: [],
        });
        break;
      case 'note':
        result = await createNote({ project_id: p.matched_project_id!, body: detail || p.title });
        break;
      case 'submittal':
        result = await createSubmittal({
          project_id: p.matched_project_id!, submission_type: p.title, agency: agencyOf(p.fields),
          submission_date: undefined, response_due_date: due, follow_up_date: undefined,
          assigned_staff_id: undefined, status: 'drafting', notes: detail || undefined,
        });
        break;
      case 'calendar_event':
        if (!due) return fail('Set a date first — Edit the proposal.');
        result = await createCalendarEvent({
          title: p.title, description: detail || undefined, event_type: eventType(p.category),
          start_at: due, end_at: undefined, all_day: true, project_id: p.matched_project_id ?? undefined,
        });
        break;
      default:
        return fail('Unsupported proposal type.');
    }

    if (!result.ok) return fail(result.error);

    const { error } = await supabase
      .from('intake_proposals')
      .update({
        state: 'approved',
        applied_at: new Date().toISOString(),
        applied_by: user.id,
        applied_entity_type: p.proposal_type,
        applied_entity_id: result.id ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);

    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export interface BulkApproveResult {
  applied: number;
  failed: number;
  failures: { id: string; error: string }[];
}

/**
 * Bulk-approve (Phase 1.2). Reuses the single-proposal Apply Engine per id — same existing
 * server actions, same one write path. Does NOT stop on failure: each proposal is applied
 * independently and failures are reported individually.
 */
export async function bulkApproveProposals(ids: string[]): Promise<ActionResult<BulkApproveResult>> {
  try {
    await requireManager();
    const failures: { id: string; error: string }[] = [];
    let applied = 0;
    for (const id of ids) {
      const res = await approveProposal(id);
      if (res.ok) applied++;
      else failures.push({ id, error: res.error });
    }
    revalidatePath('/operations');
    return { ok: true, data: { applied, failed: failures.length, failures } };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/**
 * Undo an approval: delete the created object via the EXISTING delete action and revert the
 * proposal to an editable state. The proposal itself is never deleted (its history is kept).
 */
export async function undoProposalApproval(id: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();

    const { data: p } = await supabase
      .from('intake_proposals')
      .select('state, applied_entity_type, applied_entity_id, matched_project_id')
      .eq('id', id)
      .maybeSingle();
    if (!p) return fail('Proposal not found.');
    if (p.state !== 'approved') return fail('This proposal has not been applied.');

    if (p.applied_entity_id && p.applied_entity_type) {
      const pid = p.matched_project_id ?? '';
      let res: ActionResult;
      switch (p.applied_entity_type) {
        case 'task': res = await deleteTask(p.applied_entity_id, pid); break;
        case 'general_task': res = await deleteGeneralTask(p.applied_entity_id); break;
        case 'note': res = await deleteNote(p.applied_entity_id, pid); break;
        case 'submittal': res = await deleteSubmittal(p.applied_entity_id, pid); break;
        case 'calendar_event': res = await deleteCalendarEvent(p.applied_entity_id); break;
        default: res = { ok: true };
      }
      if (!res.ok) return fail(res.error);
    }

    const { error } = await supabase
      .from('intake_proposals')
      .update({ state: 'edited', applied_at: null, applied_by: null, applied_entity_type: null, applied_entity_id: null })
      .eq('id', id);
    if (error) return fail(error.message);

    revalidatePath('/operations');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
