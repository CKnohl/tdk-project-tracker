// Project-scoped permission engine (V3.2). ONE reusable place for "can this
// user manage / review / assign on THIS project". Mirrors the SQL helper
// can_manage_project() so the app layer and RLS agree.
//
// A user qualifies if they are an admin/PM-rank globally (rank >= 30), the
// project's Project Manager, or a Project Lead on that project — without any
// change to their global role.

import { rankOf, type RoleKey } from '@/lib/permissions';

export interface ProjectAuthContext {
  projectManagerId: string | null;
  leadStaffIds: string[];
}

interface AuthUser {
  role: RoleKey;
  staff_id: string | null;
}

export function canManageProject(user: AuthUser | null | undefined, ctx: ProjectAuthContext): boolean {
  if (!user) return false;
  if (rankOf(user.role) >= 30) return true; // admin + project_manager (global)
  if (!user.staff_id) return false;
  return user.staff_id === ctx.projectManagerId || ctx.leadStaffIds.includes(user.staff_id);
}

/** Who may review (approve/reject) work on this project — same set as managers. */
export const canReviewProject = canManageProject;

/** Who may assign staff on this project — same set as managers. */
export const canAssignProject = canManageProject;
