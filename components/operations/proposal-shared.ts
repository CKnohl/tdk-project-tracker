// V6 — shared proposal display helpers, used by the inline per-document list AND the
// review workspace so there is one definition of confidence bands, destinations, and
// apply-gating. Pure display/logic; no server code, no write paths.

import type { IntakeProposalItem } from '@/lib/data/proposals';
import type { ProposalType, ProposalState, Json } from '@/types/database.types';

export const TYPE_LABEL: Record<ProposalType, string> = {
  task: 'Task', general_task: 'General Task', note: 'Note', submittal: 'Submittal', calendar_event: 'Calendar Event',
};

export const STATE_LABEL: Record<ProposalState, string> = {
  proposed: 'Needs review', edited: 'Edited', rejected: 'Rejected', approved: 'Applied', archived: 'Archived',
};

export function band(c: number) {
  if (c >= 80) return { label: 'High confidence', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
  if (c >= 50) return { label: 'Medium confidence', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
  return { label: 'Low confidence', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
}

export function detailOf(fields: Json): string {
  const f = fields as Record<string, unknown> | null;
  if (typeof f?.description === 'string') return f.description;
  if (typeof f?.body === 'string') return f.body;
  return '';
}

export function destination(p: IntakeProposalItem): string {
  if (p.project_match === 'existing' && p.matched_project) return `${p.matched_project.project_number} · ${p.matched_project.name}`;
  if (p.project_match === 'new_candidate') return `New project candidate${p.suggested_project_ref ? `: ${p.suggested_project_ref}` : ''}`;
  return 'Project unknown';
}

// Approve is gated on a valid destination so the PM edits first instead of failing.
export function canApply(p: IntakeProposalItem): { ok: boolean; reason: string } {
  if ((p.proposal_type === 'task' || p.proposal_type === 'note' || p.proposal_type === 'submittal') && !p.matched_project_id) {
    return { ok: false, reason: 'Set a project first (Edit)' };
  }
  if (p.proposal_type === 'calendar_event' && !p.suggested_due_date) return { ok: false, reason: 'Set a date first (Edit)' };
  return { ok: true, reason: '' };
}

// Where the created object lives (jump-to link).
export function appliedLink(p: IntakeProposalItem): string {
  const pid = p.matched_project_id;
  switch (p.applied_entity_type) {
    case 'task': return pid ? `/projects/${pid}?tab=tasks` : '/tasks';
    case 'submittal': return pid ? `/projects/${pid}?tab=submittals` : '/projects';
    case 'note': return pid ? `/projects/${pid}` : '/projects';
    case 'general_task': return '/tasks';
    case 'calendar_event': return pid ? `/projects/${pid}` : '/calendar';
    default: return '/operations';
  }
}
