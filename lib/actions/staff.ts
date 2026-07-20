'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { staffSchema, type StaffInput } from '@/lib/validators';
import { suggestProjectLead } from '@/lib/data/staff';
import { notifyProjectNeedsManager } from '@/lib/notify';
import { requireManager, fail, errMessage, type ActionResult } from './_helpers';

function deriveInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export async function createStaff(input: StaffInput): Promise<ActionResult> {
  try {
    await requireManager();
    const parsed = staffSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .insert({
        full_name: v.full_name,
        email: v.email ?? null,
        initials: v.initials || deriveInitials(v.full_name),
        company_id: v.company_id ?? null,
        phone: v.phone ?? null,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);
    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateStaff(id: string, input: StaffInput): Promise<ActionResult> {
  try {
    await requireManager();
    const parsed = staffSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from('staff')
      .update({
        full_name: v.full_name,
        email: v.email ?? null,
        initials: v.initials || deriveInitials(v.full_name),
        company_id: v.company_id ?? null,
        phone: v.phone ?? null,
      })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/**
 * What deactivating this person would leave behind — shown in the offboarding
 * checklist BEFORE anything happens. Assignments are never deleted on
 * deactivation: history stays in the person's name, displays stop showing them
 * as assigned, and everything returns if they are reactivated.
 */
export interface OffboardingImpact {
  managedProjects: { id: string; project_number: string; name: string }[];
  leadOf: number;
  openTasks: number;
  openSubmittals: number;
  pendingReviews: number;
}

export async function getOffboardingImpact(staffId: string): Promise<ActionResult<OffboardingImpact>> {
  try {
    await requireManager();
    const supabase = await createClient();
    const [managed, leads, tasks, submittals, reviews] = await Promise.all([
      supabase
        .from('projects')
        .select('id, project_number, name')
        .eq('project_manager_id', staffId)
        .in('status', ['active', 'on_hold'])
        .order('project_number'),
      supabase
        .from('project_leads')
        .select('project_id, project:projects!inner(status)')
        .eq('staff_id', staffId)
        .in('project.status', ['active', 'on_hold']),
      supabase
        .from('task_staff')
        .select('task_id, task:tasks!inner(status)')
        .eq('staff_id', staffId)
        .not('task.status', 'in', '(completed,cancelled)'),
      supabase
        .from('project_submittals')
        .select('id')
        .eq('assigned_staff_id', staffId)
        .not('status', 'in', '(approved,rejected)'),
      supabase.from('tasks').select('id').eq('review_requested_by', staffId).eq('status', 'in_review'),
    ]);
    return {
      ok: true,
      data: {
        managedProjects: managed.data ?? [],
        leadOf: leads.data?.length ?? 0,
        openTasks: tasks.data?.length ?? 0,
        openSubmittals: submittals.data?.length ?? 0,
        pendingReviews: reviews.data?.length ?? 0,
      },
    };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await requireManager();
    const supabase = await createClient();
    const { error } = await supabase.from('staff').update({ is_active: active }).eq('id', id);
    if (error) return fail(error.message);

    // Deactivation may leave projects without an active manager. Make it a big
    // deal: alert every admin/PM per affected project, with a suggested new lead
    // (most open tasks) — a human confirms the assignment, nothing is automatic.
    // The dashboard's leaderless-projects box shows the same list until resolved.
    if (!active) {
      const { data: managed } = await supabase
        .from('projects')
        .select('id, project_number, name')
        .eq('project_manager_id', id)
        .in('status', ['active', 'on_hold']);
      for (const p of managed ?? []) {
        const suggested = await suggestProjectLead(supabase, p.id, id);
        await notifyProjectNeedsManager({
          projectId: p.id,
          projectLabel: `${p.project_number} · ${p.name}`,
          suggestedName: suggested?.full_name ?? null,
          actorId: user.id,
        });
      }
    }

    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    revalidatePath('/dashboard');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

/**
 * Move a staff member's project responsibilities to another staff member:
 * project manager role, project team membership, task assignments, and submittal
 * assignments. Used when someone leaves or hands off their book.
 *
 * Runs in a single SECURITY DEFINER function (transfer_staff_ownership, 0030) so
 * the whole hand-off is atomic — the previous version did four sequential writes
 * with no error checks and could leave a half-transferred book while reporting
 * success. The function authorizes the caller internally (rank >= 30) too.
 */
export async function transferOwnership(fromStaffId: string, toStaffId: string): Promise<ActionResult> {
  try {
    await requireManager();
    if (fromStaffId === toStaffId) return fail('Pick a different staff member to transfer to.');
    const supabase = await createClient();

    const { error } = await supabase.rpc('transfer_staff_ownership', { p_from: fromStaffId, p_to: toStaffId });
    if (error) return fail(`Couldn't transfer ownership: ${error.message}`);

    revalidatePath('/settings/staff');
    revalidatePath('/staff');
    revalidatePath('/projects');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}
