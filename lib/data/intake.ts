import { createClient } from '@/lib/supabase/server';
import type { IntakeSourceType, IntakeStatus } from '@/types/database.types';

// V6 Phase 0 — Operations Center intake list. RLS already scopes reads to rank >= 30
// (PM/Admin); the page also guards. Returns ALL statuses newest-first so the client can
// present the processing queue (New / In Progress / Filed / Archived) with live counts.

export interface IntakeDocumentItem {
  id: string;
  source_type: IntakeSourceType;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: IntakeStatus;
  filed_project_id: string | null;
  filed_at: string | null;
  note: string | null;
  created_at: string;
  uploader: { full_name: string | null } | null;
  filer: { full_name: string | null } | null;
  filed_project: { id: string; project_number: string; name: string } | null;
}

// Two FKs to users (uploaded_by, filed_by) → disambiguate embeds by column.
const SELECT =
  'id,source_type,storage_path,file_name,mime_type,size_bytes,status,filed_project_id,filed_at,note,created_at,' +
  'uploader:users!uploaded_by(full_name),filer:users!filed_by(full_name),' +
  'filed_project:projects(id,project_number,name)';

export async function getIntakeDocuments(): Promise<IntakeDocumentItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('intake_documents')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(300)
    .returns<IntakeDocumentItem[]>();
  return data ?? [];
}
