import { MyWorkWorkspace } from '@/components/dashboard/my-work-workspace';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';
import { getCurrentUser } from '@/lib/auth';
import { rankOf } from '@/lib/permissions';
import { getMyWork, getReviewQueue, getMyReports } from '@/lib/data/my-work';
import { createClient } from '@/lib/supabase/server';
import type { NotificationItem } from '@/lib/types';

export const metadata = { title: 'My Work' };

const NOTIF_SELECT =
  'id,user_id,type,title,body,entity_type,entity_id,project_id,is_read,read_at,created_at,project:projects(id,project_number,name)';

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [data, reviewQueue, reports, notifRes] = await Promise.all([
    getMyWork(user?.staff_id ?? null),
    getReviewQueue(user ? { role: user.role, staff_id: user.staff_id } : null),
    user ? getMyReports(user.id, user.staff_id) : Promise.resolve([]),
    // RLS scopes notifications to the signed-in user.
    supabase.from('notifications').select(NOTIF_SELECT).order('created_at', { ascending: false }).limit(100).returns<NotificationItem[]>(),
  ]);

  const notifications = notifRes.data ?? [];
  const canSelfReport = !!user && !!user.staff_id && rankOf(user.role) >= 20;
  const defaultFolder = tab ?? (data.hasStaff ? 'todo' : 'inbox');

  return (
    <>
      <ScrollRestoration storageKey="tdk-mywork-scroll" />
      <MyWorkWorkspace
        data={data}
        notifications={notifications}
        reviewQueue={reviewQueue}
        reports={reports}
        canGenerateReport={canSelfReport}
        defaultFolder={defaultFolder}
      />
    </>
  );
}
