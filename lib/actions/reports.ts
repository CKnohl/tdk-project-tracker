'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects, rankOf } from '@/lib/permissions';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';
import { runReadyReport, runSelfReport } from '@/lib/reports/run';

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

/**
 * Generate a personal Self Report. Gate:
 *   - The caller must be linked to a staff profile and NOT read-only (rank >= 20).
 *   - Staff may generate ONLY for themselves.
 *   - Project Managers + Admins (rank >= 30) may generate for any staff member.
 * `subjectStaffId` defaults to the caller's own staff link. Reuses runSelfReport,
 * so report generation logic isn't duplicated.
 */
export async function generateSelfReport(subjectStaffId?: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('You must be signed in.');

    const manager = canManageProjects(user.role); // rank >= 30
    if (!manager) {
      if (rankOf(user.role) < 20) return fail('Read-only accounts can’t generate reports.');
      if (!user.staff_id) return fail('Your account isn’t linked to a staff profile yet.');
    }

    const subject = subjectStaffId ?? user.staff_id;
    if (!subject) return fail('No staff member to report on.');
    if (!manager && subject !== user.staff_id) {
      return fail('You can only generate your own report.');
    }

    const supabase = await createClient();
    const { id } = await runSelfReport({ client: supabase, subjectStaffId: subject, generatedBy: user.id });
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}
