'use server';

import { createClient } from '@/lib/supabase/server';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';
import { runReadyReport } from '@/lib/reports/run';

/**
 * Generate a Ready Report on demand. Snapshots current operations, diffs against
 * the most recent prior report, adds an AI executive summary, stores a PDF, and
 * persists the run. Managers + Admins only. Reuses the shared orchestrator that
 * the daily cron also uses.
 */
export async function generateReadyReport(): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();

    const { id } = await runReadyReport({
      client: supabase,
      generatedBy: user.id,
      generatorName: user.full_name ?? user.email ?? 'Unknown',
      reportType: 'ready_report',
    });

    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}
