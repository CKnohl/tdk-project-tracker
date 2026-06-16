import { PageHeader } from '@/components/shared/page-header';
import { NotificationsList } from '@/components/notifications/notifications-list';
import { createClient } from '@/lib/supabase/server';
import type { NotificationItem } from '@/lib/types';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id,user_id,type,title,body,entity_type,entity_id,project_id,is_read,read_at,created_at,project:projects(id,project_number,name)')
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<NotificationItem[]>();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Notifications" description="Task, submittal, and project alerts." />
      <NotificationsList items={data ?? []} />
    </div>
  );
}
