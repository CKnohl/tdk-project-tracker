'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { projectSchema, type ProjectInput } from '@/lib/validators';
import { requireEditor, requireManager, fail, errMessage, type ActionResult } from './_helpers';
import { notifyProjectTeam, notifyProjectAssigned, notifyDeadlineChanged } from '@/lib/notify';
import { WORKFLOW_STATE, PHASE_ORDER, PROJECT_PHASE } from '@/lib/constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProjectStatus, ProjectPhase, WorkflowState, InactiveReason } from '@/types/database.types';

type DB = SupabaseClient<Database>;

/**
 * THE single source of truth for project staff assignment. Reconciles
 * project_staff to `staffIds`, but ALWAYS keeps the project's manager assigned
 * (the PM is also assigned staff — P3). Used by createProject, updateProject, and
 * setProjectStaff so every assignment path behaves identically.
 */
async function syncProjectStaff(
  supabase: DB,
  projectId: string,
  staffIds: string[],
  actorId: string,
  projectName?: string | null,
): Promise<{ added: string[]; removed: string[] }> {
  const { data: proj } = await supabase
    .from('projects')
    .select('project_manager_id, name')
    .eq('id', projectId)
    .maybeSingle();

  const desired = new Set(staffIds);
  if (proj?.project_manager_id) desired.add(proj.project_manager_id); // PM is always assigned

  const { data: existing } = await supabase.from('project_staff').select('staff_id').eq('project_id', projectId);
  const current = new Set((existing ?? []).map((r) => r.staff_id));
  const toAdd = [...desired].filter((s) => !current.has(s));
  const toRemove = [...current].filter((s) => !desired.has(s));

  if (toAdd.length > 0) {
    await supabase.from('project_staff').insert(toAdd.map((staff_id) => ({ project_id: projectId, staff_id })));
    await notifyProjectAssigned({ projectId, projectName: projectName ?? proj?.name ?? null, staffIds: toAdd, actorId });
  }
  if (toRemove.length > 0) {
    await supabase.from('project_staff').delete().eq('project_id', projectId).in('staff_id', toRemove);
  }
  return { added: toAdd, removed: toRemove };
}

export async function createProject(input: ProjectInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('projects')
      .insert({
        project_number: v.project_number,
        name: v.name,
        company_id: v.company_id,
        status: v.status,
        phase: v.phase,
        workflow_state: v.workflow_state,
        description: v.description ?? null,
        scope: v.scope ?? null,
        project_manager_id: v.project_manager_id ?? null,
        target_completion_date: v.target_completion_date ?? null,
        inactive_reason: v.inactive_reason ?? null,
        // Denormalized current phase name (Timeline is the source of truth — P4).
        current_phase_name: PROJECT_PHASE[v.phase].label,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return fail(error.message);

    // Seed the editable timeline from the default phase template.
    await supabase.from('project_phases').insert(
      PHASE_ORDER.map((key, i) => ({
        project_id: data.id,
        name: PROJECT_PHASE[key].label,
        position: i + 1,
        is_current: key === v.phase,
      })),
    );

    // Assign staff (always includes the PM) via the shared reconciler.
    await syncProjectStaff(supabase, data.id, v.staff_ids, user.id, v.name);

    revalidatePath('/projects');
    revalidatePath('/dashboard');
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function updateProject(id: string, input: ProjectInput): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input');
    const v = parsed.data;
    const supabase = await createClient();

    // Capture the prior target date so we can detect a deadline change.
    const { data: prev } = await supabase
      .from('projects')
      .select('target_completion_date')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase
      .from('projects')
      .update({
        project_number: v.project_number,
        name: v.name,
        company_id: v.company_id,
        status: v.status,
        phase: v.phase,
        workflow_state: v.workflow_state,
        description: v.description ?? null,
        scope: v.scope ?? null,
        project_manager_id: v.project_manager_id ?? null,
        target_completion_date: v.target_completion_date ?? null,
        inactive_reason: v.status === 'inactive' ? (v.inactive_reason ?? null) : null,
      })
      .eq('id', id);
    if (error) return fail(error.message);

    // P2 fix: the edit form's Assigned Staff now actually persists — same shared
    // reconciler as the staff page. P3: the (possibly new) PM is auto-included.
    await syncProjectStaff(supabase, id, v.staff_ids, user.id, v.name);

    await notifyProjectTeam({ projectId: id, type: 'project_updated', title: 'Project updated', excludeUserId: user.id });

    const oldTarget = prev?.target_completion_date ?? null;
    const newTarget = v.target_completion_date ?? null;
    if (oldTarget !== newTarget) {
      await notifyDeadlineChanged({
        projectId: id,
        scope: 'project',
        entityId: id,
        label: v.name,
        oldDate: oldTarget,
        newDate: newTarget,
        actorId: user.id,
      });
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
  inactiveReason?: InactiveReason,
): Promise<ActionResult> {
  try {
    await requireEditor();
    if (status === 'inactive' && !inactiveReason) return fail('Select why the project is inactive.');
    const supabase = await createClient();
    const { error } = await supabase
      .from('projects')
      .update({ status, inactive_reason: status === 'inactive' ? inactiveReason : null })
      .eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');
    revalidatePath('/archive');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setProjectPhase(id: string, phase: ProjectPhase): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('projects').update({ phase }).eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/projects/${id}`);
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setWorkflowState(id: string, workflow_state: WorkflowState): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from('projects').update({ workflow_state }).eq('id', id);
    if (error) return fail(error.message);

    if (workflow_state !== 'normal') {
      await notifyProjectTeam({
        projectId: id,
        type: 'follow_up_due',
        title: `Project marked ${WORKFLOW_STATE[workflow_state].label}`,
        excludeUserId: user.id,
      });
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath('/dashboard');
    return { ok: true, id };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = await createClient();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath('/projects');
    revalidatePath('/archive');
    return { ok: true };
  } catch (e) {
    return fail(errMessage(e));
  }
}

export async function setProjectStaff(projectId: string, staffIds: string[]): Promise<ActionResult> {
  try {
    const user = await requireEditor();
    const supabase = await createClient();
    await syncProjectStaff(supabase, projectId, staffIds, user.id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, id: projectId };
  } catch (e) {
    return fail(errMessage(e));
  }
}
