import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ActivityRow } from '@/components/dashboard/rows';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { getActivityFeed } from '@/lib/data/activity';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';

export const metadata = { title: 'Activity' };

// V6.1.3: management oversight surface — PM/Admin only (reached via Settings/⌘K,
// no longer on the sidebar). Engineers see their own work in My Work instead.
export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user || !canManageProjects(user.role)) redirect('/dashboard');
  const items = await getActivityFeed(150);

  return (
    <div className="space-y-5">
      <ScrollRestoration storageKey="tdk-activity-scroll" />
      <PageHeader title="Activity" description="Everything happening across all projects, newest first." />
      {items.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Project changes will show up here as they happen." />
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
