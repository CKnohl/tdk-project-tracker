import { AlertTriangle, CalendarClock, FileWarning, FolderKanban, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { MyWorkTabs } from '@/components/dashboard/my-work-tabs';
import { ReviewQueue } from '@/components/dashboard/review-queue';
import { RecentlyViewed } from '@/components/dashboard/recently-viewed';
import { SelfReportButton } from '@/components/reports/self-report-button';
import { getCurrentUser } from '@/lib/auth';
import { rankOf } from '@/lib/permissions';
import { getMyWork, getReviewQueue } from '@/lib/data/my-work';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/lib/types';

export const metadata = { title: 'My Work' };

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <Card className="card-hover flex items-center gap-3 p-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

const NOTIF_SELECT =
  'id,user_id,type,title,body,entity_type,entity_id,project_id,is_read,read_at,created_at,project:projects(id,project_number,name)';

export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [data, reviewQueue, notifRes] = await Promise.all([
    getMyWork(user?.staff_id ?? null),
    getReviewQueue(user ? { role: user.role, staff_id: user.staff_id } : null),
    // RLS scopes notifications to the signed-in user (notif_select: user_id = auth.uid()).
    supabase.from('notifications').select(NOTIF_SELECT).order('created_at', { ascending: false }).limit(100).returns<NotificationItem[]>(),
  ]);

  const notifications = notifRes.data ?? [];
  const canSelfReport = !!user && !!user.staff_id && rankOf(user.role) >= 20;
  const defaultTab = tab ?? (data.hasStaff ? 'tasks' : 'inbox');

  return (
    <div className="space-y-5">
      <PageHeader title="My Work" description="Your personal workspace — what you need today.">
        {canSelfReport && <SelfReportButton />}
      </PageHeader>

      {reviewQueue.length > 0 && <ReviewQueue items={reviewQueue} />}

      {!data.hasStaff && (
        <EmptyState
          icon={FolderKanban}
          title="No staff link"
          description="Your account isn't linked to a staff directory entry yet, so personal assignments won't appear. An admin can link it from Settings → Staff. Your Inbox still works below."
        />
      )}

      {data.hasStaff && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open tasks" value={data.tasks.length} icon={ListChecks} tone="bg-primary/10 text-primary" />
          <Stat label="Overdue" value={data.overdue.length} icon={AlertTriangle} tone="bg-red-50 text-red-600 dark:bg-red-950" />
          <Stat label="Submittals" value={data.submittals.length} icon={FileWarning} tone="bg-violet-50 text-violet-600 dark:bg-violet-950" />
          <Stat label="Projects" value={data.projects.length} icon={CalendarClock} tone="bg-sky-50 text-sky-600 dark:bg-sky-950" />
        </div>
      )}

      <RecentlyViewed />

      <MyWorkTabs data={data} notifications={notifications} defaultTab={defaultTab} />
    </div>
  );
}
