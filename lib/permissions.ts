export type RoleKey = 'admin' | 'project_manager' | 'staff' | 'read_only';

export const ROLE_RANK: Record<RoleKey, number> = {
  admin: 40,
  project_manager: 30,
  staff: 20,
  read_only: 10,
};

export const ROLE_LABEL: Record<RoleKey, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  staff: 'Staff',
  read_only: 'Read Only',
};

export function rankOf(role: RoleKey | null | undefined): number {
  return role ? ROLE_RANK[role] : 0;
}

export function hasMinRole(role: RoleKey | null | undefined, min: RoleKey): boolean {
  return rankOf(role) >= ROLE_RANK[min];
}

export const isAdmin = (role: RoleKey | null | undefined) => hasMinRole(role, 'admin');
export const canManageProjects = (role: RoleKey | null | undefined) => hasMinRole(role, 'project_manager');
export const canEdit = (role: RoleKey | null | undefined) => hasMinRole(role, 'staff');
export const isReadOnly = (role: RoleKey | null | undefined) => rankOf(role) <= ROLE_RANK.read_only;
