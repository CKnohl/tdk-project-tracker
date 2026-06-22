'use server';

import { createClient } from '@/lib/supabase/server';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';
import { gatherReadyReport, type PreviousReport, type ReportCounts } from '@/lib/data/reports';
import type { Json } from '@/types/database.types';

/**
 * Generate a Ready Report: snapshot current operations, diff against the most
 * recent prior report, and persist the run to report_runs. Managers + Admins only.
 */
export async function generateReadyReport(): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();

    const { data: prevRow } = await supabase
      .from('report_runs')
      .select('generated_at, snapshot')
      .eq('report_type', 'ready_report')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let prev: PreviousReport | null = null;
    if (prevRow) {
      const snap = prevRow.snapshot as any;
      prev = {
        generated_at: prevRow.generated_at,
        counts: (snap?.counts ?? null) as ReportCounts | null,
      };
    }

    const snapshot = await gatherReadyReport(prev);

    const { data, error } = await supabase
      .from('report_runs')
      .insert({
        generated_by: user.id,
        report_type: 'ready_report',
        summary: snapshot.executive_summary,
        snapshot: snapshot as unknown as Json,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);

    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}
