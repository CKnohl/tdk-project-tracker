import { createClient } from '@/lib/supabase/server';
import type { ProposalType, ProjectMatchVerdict, ProposalState, Json } from '@/types/database.types';

// V6 Phase 1 — proposals for the Operations Center. RLS scopes reads to rank >= 30; the
// page also guards. Returned grouped by source document so the intake queue can show each
// document's suggestions inline.

export interface IntakeProposalItem {
  id: string;
  intake_document_id: string;
  proposal_type: ProposalType;
  category: string | null;
  title: string;
  fields: Json;
  confidence: number;
  reasoning: string | null;
  source_text: string | null;
  project_match: ProjectMatchVerdict | null;
  matched_project_id: string | null;
  suggested_project_ref: string | null;
  suggested_assignee: string | null;
  suggested_due_date: string | null;
  uncertainties: string | null;
  state: ProposalState;
  comment: string | null;
  created_at: string;
  applied_at: string | null;
  applied_entity_type: ProposalType | null;
  applied_entity_id: string | null;
  matched_project: { project_number: string; name: string } | null;
  document?: { file_name: string } | null;
}

const SELECT =
  'id,intake_document_id,proposal_type,category,title,fields,confidence,reasoning,source_text,' +
  'project_match,matched_project_id,suggested_project_ref,suggested_assignee,suggested_due_date,' +
  'uncertainties,state,comment,created_at,applied_at,applied_entity_type,applied_entity_id,' +
  'matched_project:projects(project_number,name)';

export async function getProposalsByDocument(): Promise<Record<string, IntakeProposalItem[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('intake_proposals')
    .select(SELECT)
    .order('created_at', { ascending: true })
    .returns<IntakeProposalItem[]>();

  const byDoc: Record<string, IntakeProposalItem[]> = {};
  for (const p of data ?? []) (byDoc[p.intake_document_id] ??= []).push(p);
  return byDoc;
}

// Flat list of every proposal (+ source document name) for the review workspace.
export async function getAllProposals(): Promise<IntakeProposalItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('intake_proposals')
    .select(`${SELECT},document:intake_documents(file_name)`)
    .order('created_at', { ascending: false })
    .returns<IntakeProposalItem[]>();
  return data ?? [];
}
