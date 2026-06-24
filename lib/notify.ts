import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, renderNotificationEmail } from '@/lib/email';
import type { ActivityEntity, NotificationType } from '@/types/database.types';
import type { RoleKey } from '@/lib/permissions';

// All notification fan-out lives here. The service-role client is used because
// `notifications` has no client INSERT policy and recipient resolution needs to
// read staff/user rows freely. Every exported function is best-effort and never
// throws, so notification delivery can't block the action that triggered it.

type Admin = ReturnType<typeof createAdminClient>;

interface Recipient {
  id: string; // users.id
  email: string | null;
  full_name: string | null;
  role: RoleKey;
}

// notification_type -> notification_preferences email column. Types not listed
// here are in-app only (no email is sent for them).
type EmailPrefColumn =
  | 'email_task_assigned'
  | 'email_task_completed'
  | 'email_project_assigned'
  | 'email_deadline_changed';

const EMAIL_PREF_COLUMN: Partial<Record<NotificationType, EmailPrefColumn>> = {
  task_assigned: 'email_task_assigned',
  task_completed: 'email_task_completed',
  project_assigned: 'email_project_assigned',
  deadline_changed: 'email_deadline_changed',
};

// ── Recipient resolution helpers ─────────────────────────────────────────────

async function userIdsForStaff(admin: Admin, staffIds: string[]): Promise<string[]> {
  const ids = [...new Set(staffIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const { data } = await admin.from('staff').select('user_id').in('id', ids);
  return (data ?? []).map((s) => s.user_id).filter((x): x is string => Boolean(x));
}

async function projectManagerUserId(admin: Admin, projectId: string): Promise<string | null> {
  const { data: project } = await admin
    .from('projects')
    .select('project_manager_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project?.project_manager_id) return null;
  const [uid] = await userIdsForStaff(admin, [project.project_manager_id]);
  return uid ?? null;
}

async function adminUserIds(admin: Admin): Promise<string[]> {
  const { data: roles } = await admin.from('roles').select('id, key');
  const adminRoleId = (roles ?? []).find((r) => r.key === 'admin')?.id;
  if (adminRoleId == null) return [];
  const { data } = await admin
    .from('users')
    .select('id')
    .eq('role_id', adminRoleId)
    .eq('is_active', true);
  return (data ?? []).map((u) => u.id);
}

async function projectStaffUserIds(admin: Admin, projectId: string): Promise<string[]> {
  const { data } = await admin.from('project_staff').select('staff_id').eq('project_id', projectId);
  return userIdsForStaff(admin, (data ?? []).map((r) => r.staff_id));
}

async function hydrate(admin: Admin, userIds: string[]): Promise<Recipient[]> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const { data } = await admin
    .from('users')
    .select('id, email, full_name, is_active, role:roles(key)')
    .in('id', ids)
    .returns<{ id: string; email: string | null; full_name: string | null; is_active: boolean; role: { key: string } | null }[]>();
  return (data ?? [])
    .filter((u: any) => u.is_active)
    .map((u: any): Recipient => ({
      id: u.id,
      email: u.email ?? null,
      full_name: u.full_name ?? null,
      role: (u.role?.key ?? 'read_only') as RoleKey,
    }));
}

// ── Core dispatch ─────────────────────────────────────────────────────────────

interface DispatchOpts {
  type: NotificationType;
  recipientUserIds: string[];
  excludeUserIds?: (string | null | undefined)[];
  excludeAdmins?: boolean;
  title: string;
  body?: string | null;
  projectId?: string | null;
  entityType?: ActivityEntity | null;
  entityId?: string | null;
  email?: {
    subject: string;
    heading: string;
    intro?: string | null;
    lines?: string[];
    ctaLabel?: string;
    path?: string; // app-relative, e.g. /projects/<id>
  };
}

async function dispatch(admin: Admin, opts: DispatchOpts): Promise<void> {
  const recipients = await hydrate(admin, opts.recipientUserIds);

  const exclude = new Set((opts.excludeUserIds ?? []).filter((x): x is string => Boolean(x)));
  let targets = recipients.filter((r) => !exclude.has(r.id));
  if (opts.excludeAdmins) targets = targets.filter((r) => r.role !== 'admin');
  if (targets.length === 0) return;

  // Preferences: one row per user; a missing row means everything is enabled.
  const { data: prefRows } = await admin
    .from('notification_preferences')
    .select('*')
    .in('user_id', targets.map((t) => t.id));
  const prefs = new Map<string, any>((prefRows ?? []).map((p: any) => [p.user_id, p]));

  // In-app rows (suppressed only if the user turned in-app off).
  const inapp = targets.filter((t) => prefs.get(t.id)?.inapp_enabled !== false);
  if (inapp.length > 0) {
    await admin.from('notifications').insert(
      inapp.map((t) => ({
        user_id: t.id,
        type: opts.type,
        title: opts.title,
        body: opts.body ?? null,
        entity_type: opts.entityType ?? null,
        entity_id: opts.entityId ?? null,
        project_id: opts.projectId ?? null,
      })),
    );
  }

  // Email (only when the caller supplies content and the type maps to a column).
  const col = EMAIL_PREF_COLUMN[opts.type];
  if (opts.email && col) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
    const href = opts.email.path && base ? `${base}${opts.email.path}` : undefined;
    const html = renderNotificationEmail({
      heading: opts.email.heading,
      intro: opts.email.intro,
      bodyLines: opts.email.lines,
      ctaLabel: opts.email.ctaLabel,
      ctaHref: href,
    });

    const emailTargets = targets.filter((t) => {
      if (!t.email) return false;
      const p = prefs.get(t.id);
      if (p?.email_enabled === false) return false;
      if (p?.[col] === false) return false;
      return true;
    });

    await Promise.allSettled(
      emailTargets.map((t) => sendEmail({ to: t.email!, subject: opts.email!.subject, html })),
    );
  }
}

// ── Public event helpers ──────────────────────────────────────────────────────

/**
 * Task assigned -> the newly assigned staff member(s) AND the project's manager.
 * Admins never receive task-assignment notifications.
 */
export async function notifyTaskAssigned(opts: {
  taskId: string;
  taskName: string;
  projectId: string;
  staffIds: string[];
  actorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [assignees, pm] = await Promise.all([
      userIdsForStaff(admin, opts.staffIds),
      projectManagerUserId(admin, opts.projectId),
    ]);
    const recipients = [...assignees];
    if (pm) recipients.push(pm);

    await dispatch(admin, {
      type: 'task_assigned',
      recipientUserIds: recipients,
      excludeUserIds: [opts.actorId],
      excludeAdmins: true,
      title: 'Task assigned',
      body: opts.taskName,
      projectId: opts.projectId,
      entityType: 'task',
      entityId: opts.taskId,
      email: {
        subject: `Task assigned: ${opts.taskName}`,
        heading: 'A task was assigned',
        intro: opts.taskName,
        lines: ['A task has been assigned in the TDK Project Tracker.'],
        ctaLabel: 'Open project',
        path: `/projects/${opts.projectId}`,
      },
    });
  } catch {
    // best-effort
  }
}

/** Task completed -> project manager(s) + admins + the original task creator. */
export async function notifyTaskCompleted(opts: {
  taskId: string;
  taskName: string;
  projectId: string;
  actorId?: string | null;
  creatorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [pm, admins] = await Promise.all([
      projectManagerUserId(admin, opts.projectId),
      adminUserIds(admin),
    ]);
    const recipients = [...admins];
    if (pm) recipients.push(pm);
    if (opts.creatorId) recipients.push(opts.creatorId);

    await dispatch(admin, {
      type: 'task_completed',
      recipientUserIds: recipients,
      excludeUserIds: [opts.actorId],
      title: 'Task completed',
      body: opts.taskName,
      projectId: opts.projectId,
      entityType: 'task',
      entityId: opts.taskId,
      email: {
        subject: `Task completed: ${opts.taskName}`,
        heading: 'A task was completed',
        intro: opts.taskName,
        lines: ['A task has been marked complete.'],
        ctaLabel: 'Open project',
        path: `/projects/${opts.projectId}`,
      },
    });
  } catch {
    // best-effort
  }
}

/** Project assignment -> the newly assigned staff member(s) + the project manager. */
export async function notifyProjectAssigned(opts: {
  projectId: string;
  projectName?: string | null;
  staffIds: string[];
  actorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [staff, pm] = await Promise.all([
      userIdsForStaff(admin, opts.staffIds),
      projectManagerUserId(admin, opts.projectId),
    ]);
    const recipients = [...staff];
    if (pm) recipients.push(pm);

    let name = opts.projectName ?? null;
    if (!name) {
      const { data } = await admin.from('projects').select('name').eq('id', opts.projectId).maybeSingle();
      name = data?.name ?? null;
    }

    await dispatch(admin, {
      type: 'project_assigned',
      recipientUserIds: recipients,
      excludeUserIds: [opts.actorId],
      // Neutral wording: the same content reaches the new assignee and the PM.
      title: 'Project assignment',
      body: name,
      projectId: opts.projectId,
      entityType: 'project',
      entityId: opts.projectId,
      email: {
        subject: `Project assignment: ${name ?? 'project'}`,
        heading: 'Project assignment',
        intro: name,
        lines: ['A team member was assigned to this project in the TDK Project Tracker.'],
        ctaLabel: 'Open project',
        path: `/projects/${opts.projectId}`,
      },
    });
  } catch {
    // best-effort
  }
}

/**
 * Deadline changed -> affected staff + the project manager.
 * `scope` is 'task' (task assignees) or 'project' (all project staff).
 */
export async function notifyDeadlineChanged(opts: {
  projectId: string;
  scope: 'task' | 'project';
  entityId: string;
  label: string;
  oldDate: string | null;
  newDate: string | null;
  staffIds?: string[];
  actorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const affected =
      opts.scope === 'task'
        ? await userIdsForStaff(admin, opts.staffIds ?? [])
        : await projectStaffUserIds(admin, opts.projectId);
    const pm = await projectManagerUserId(admin, opts.projectId);
    const recipients = [...affected];
    if (pm) recipients.push(pm);

    const fmt = (d: string | null) => d ?? 'no date';
    const change = `${fmt(opts.oldDate)} → ${fmt(opts.newDate)}`;

    await dispatch(admin, {
      type: 'deadline_changed',
      recipientUserIds: recipients,
      excludeUserIds: [opts.actorId],
      title: 'Deadline changed',
      body: `${opts.label}: ${change}`,
      projectId: opts.projectId,
      entityType: opts.scope,
      entityId: opts.entityId,
      email: {
        subject: `Deadline changed: ${opts.label}`,
        heading: 'A deadline changed',
        intro: opts.label,
        lines: [`The deadline moved from ${fmt(opts.oldDate)} to ${fmt(opts.newDate)}.`],
        ctaLabel: 'Open project',
        path: `/projects/${opts.projectId}`,
      },
    });
  } catch {
    // best-effort
  }
}

/** General (project-less) task assigned -> the assigned staff member(s). */
export async function notifyGeneralTaskAssigned(opts: {
  taskId: string;
  taskName: string;
  staffIds: string[];
  actorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const recipients = await userIdsForStaff(admin, opts.staffIds);
    await dispatch(admin, {
      type: 'task_assigned',
      recipientUserIds: recipients,
      excludeUserIds: [opts.actorId],
      excludeAdmins: true,
      title: 'Task assigned',
      body: opts.taskName,
      entityType: 'task',
      entityId: opts.taskId,
      email: {
        subject: `Task assigned: ${opts.taskName}`,
        heading: 'A task was assigned',
        intro: opts.taskName,
        lines: ['A general office task has been assigned to you in the TDK Project Tracker.'],
        ctaLabel: 'Open tasks',
        path: '/tasks',
      },
    });
  } catch {
    // best-effort
  }
}

/** General (project-less) task completed -> admins + the original creator. */
export async function notifyGeneralTaskCompleted(opts: {
  taskId: string;
  taskName: string;
  actorId?: string | null;
  creatorId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const recipients = await adminUserIds(admin);
    if (opts.creatorId) recipients.push(opts.creatorId);
    await dispatch(admin, {
      type: 'task_completed',
      recipientUserIds: recipients,
      excludeUserIds: [opts.actorId],
      title: 'Task completed',
      body: opts.taskName,
      entityType: 'task',
      entityId: opts.taskId,
      email: {
        subject: `Task completed: ${opts.taskName}`,
        heading: 'A task was completed',
        intro: opts.taskName,
        lines: ['A general office task has been marked complete.'],
        ctaLabel: 'Open tasks',
        path: '/tasks',
      },
    });
  } catch {
    // best-effort
  }
}

/**
 * Notify a project's team (assigned staff + manager) of an in-app-only event
 * such as `project_updated` or `follow_up_due`. No email is sent for these.
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
    const [staffUserIds, pm, project] = await Promise.all([
      projectStaffUserIds(admin, opts.projectId),
      projectManagerUserId(admin, opts.projectId),
      admin.from('projects').select('name').eq('id', opts.projectId).maybeSingle(),
    ]);
    const recipients = [...staffUserIds];
    if (pm) recipients.push(pm);

    await dispatch(admin, {
      type: opts.type,
      recipientUserIds: recipients,
      excludeUserIds: [opts.excludeUserId],
      title: opts.title,
      body: opts.body ?? project.data?.name ?? null,
      projectId: opts.projectId,
      entityType: 'project',
      entityId: opts.projectId,
      // No email mapping for these types -> in-app only.
    });
  } catch {
    // best-effort
  }
}
