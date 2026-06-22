import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import type { NotificationPreferenceRow } from '@/types/database.types';

export type NotificationPrefs = Pick<
  NotificationPreferenceRow,
  | 'email_enabled'
  | 'inapp_enabled'
  | 'email_task_assigned'
  | 'email_task_completed'
  | 'email_project_assigned'
  | 'email_deadline_changed'
>;

// A missing row means "all defaults" — mirrors how the service treats absent prefs.
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email_enabled: true,
  inapp_enabled: true,
  email_task_assigned: true,
  email_task_completed: true,
  email_project_assigned: true,
  email_deadline_changed: true,
};

export async function getNotificationPreferences(): Promise<NotificationPrefs> {
  const user = await getCurrentUser();
  if (!user) return DEFAULT_NOTIFICATION_PREFS;
  const supabase = await createClient();
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return DEFAULT_NOTIFICATION_PREFS;
  return {
    email_enabled: data.email_enabled,
    inapp_enabled: data.inapp_enabled,
    email_task_assigned: data.email_task_assigned,
    email_task_completed: data.email_task_completed,
    email_project_assigned: data.email_project_assigned,
    email_deadline_changed: data.email_deadline_changed,
  };
}
