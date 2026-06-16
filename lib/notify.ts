import { createAdminClient } from '@/lib/supabase/admin';
import type { NotificationType } from '@/types/database.types';

/**
 * Notify a project's team (assigned staff + manager) that are linked to a login.
 * Uses the service-role client because `notifications` has no client INSERT policy.
 * Non-fatal: failures here never block the calling action.
 */
export async function notifyProjectTeam(opts: {
  projectId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  excludeUserId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();

    const [{ data: members }, { data: project }] = await Promise.all([
      admin.from('project_staff').select('staff_id').eq('project_id', opts.projectId),
      admin.from('projects').select('project_manager_id, name').eq('id', opts.projectId).single(),
    ]);

    const staffIds = new Set<string>((members ?? []).map((m) => m.staff_id));
    if (project?.project_manager_id) staffIds.add(project.project_manager_id);
    if (staffIds.size === 0) return;

    const { data: staff } = await admin
      .from('staff')
      .select('user_id')
      .in('id', [...staffIds]);

    const userIds = new Set<string>();
    (staff ?? []).forEach((s) => {
      if (s.user_id) userIds.add(s.user_id);
    });
    if (opts.excludeUserId) userIds.delete(opts.excludeUserId);
    if (userIds.size === 0) return;

    const rows = [...userIds].map((user_id) => ({
      user_id,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? project?.name ?? null,
      entity_type: 'project' as const,
      entity_id: opts.projectId,
      project_id: opts.projectId,
    }));

    await admin.from('notifications').insert(rows);
  } catch {
    // Notification delivery is best-effort.
  }
}
