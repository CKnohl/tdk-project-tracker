import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import { canEdit, canManageProjects, isAdmin } from '@/lib/permissions';

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
