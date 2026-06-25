import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import { canEdit, canManageProjects, isAdmin, rankOf } from '@/lib/permissions';
import { canManageProject } from '@/lib/project-permissions';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? { id?: string } : { data: T }))
  | { ok: false; error: string };

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Ensure the caller can edit (Staff and above). Returns the user or throws a friendly message. */
export async function requireEditor(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be signed in.');
  if (!canEdit(user.role)) throw new Error('Your role is read-only.');
  return user;
}

export async function requireManager(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be signed in.');
  if (!canManageProjects(user.role)) throw new Error('Only Project Managers and Admins can do this.');
  return user;
}

/**
 * Ensure the caller can manage THIS project: admin/PM-rank globally, the
 * project's Project Manager, or a Project Lead. Project-scoped permission — a
 * Staff-rank Lead passes here for their own projects only, never elsewhere.
 */
export async function requireProjectManager(projectId: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be signed in.');
  if (rankOf(user.role) >= 30) return user; // global managers — skip the lookup
  const supabase = await createClient();
  const [{ data: proj }, { data: leads }] = await Promise.all([
    supabase.from('projects').select('project_manager_id').eq('id', projectId).maybeSingle(),
    supabase.from('project_leads').select('staff_id').eq('project_id', projectId),
  ]);
  const ctx = {
    projectManagerId: proj?.project_manager_id ?? null,
    leadStaffIds: (leads ?? []).map((l) => l.staff_id),
  };
  if (!canManageProject(user, ctx)) {
    throw new Error('Only the Project Manager or a Project Lead can do this.');
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be signed in.');
  if (!isAdmin(user.role)) throw new Error('Admins only.');
  return user;
}

export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong.';
}
