// Shared Ready Report orchestrator. Called by BOTH the manual server action and
// the daily cron, so report logic lives in exactly one place.
// SERVER ONLY.

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  gatherReadyReport,
  type PreviousReport,
  type ReportCounts,
  type ReportSnapshot,
} from '@/lib/data/reports';
import { generateExecutiveSummary } from '@/lib/ai';
import { renderReportPdf } from '@/lib/reports/pdf';
import { uploadReportPdf } from '@/lib/reports/storage';
import type { Database, Json } from '@/types/database.types';

type DB = SupabaseClient<Database>;

/** Most recent prior report of ANY type, so manual + daily runs chain together. */
export async function getPreviousReport(client: DB): Promise<PreviousReport | null> {
  const { data } = await client
    .from('report_runs')
    .select('generated_at, snapshot')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const snap = data.snapshot as any;
  return { generated_at: data.generated_at, counts: (snap?.counts ?? null) as ReportCounts | null };
}

export interface RunReportResult {
  id: string;
  snapshot: ReportSnapshot;
  pdf: Buffer | null;
}

/**
 * Generate a Ready Report end-to-end: diff vs the previous report, compute the
 * snapshot, add an AI executive summary, render + store a PDF, and persist one
 * report_runs row (id is generated up front so pdf_path is set in the same
 * insert — no extra UPDATE policy needed). PDF + AI steps are best-effort.
 */
export async function runReadyReport(opts: {
  client: DB;
  generatedBy: string | null;
  generatorName: string;
  reportType?: string;
}): Promise<RunReportResult> {
  const { client, generatedBy, generatorName, reportType = 'ready_report' } = opts;

  const prev = await getPreviousReport(client);
  const snapshot = await gatherReadyReport(prev, client);

  // AI executive summary, with graceful fallback to the deterministic one.
  const ai = await generateExecutiveSummary(snapshot);
  if (ai) snapshot.executive_summary = ai;

  const id = randomUUID();

  // Best-effort PDF render + upload — a failure must not block report creation.
  let pdf: Buffer | null = null;
  let pdfPath: string | null = null;
  try {
    pdf = await renderReportPdf(snapshot, generatorName);
    pdfPath = await uploadReportPdf(id, pdf);
  } catch (e) {
    console.error('[reports] PDF generation failed', e);
  }

  const { error } = await client.from('report_runs').insert({
    id,
    generated_by: generatedBy,
    report_type: reportType,
    summary: snapshot.executive_summary,
    snapshot: snapshot as unknown as Json,
    pdf_path: pdfPath,
  });
  if (error) throw new Error(error.message);

  return { id, snapshot, pdf };
}
