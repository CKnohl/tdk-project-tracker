import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ActivityRow } from '@/components/dashboard/rows';
import { getActivityFeed } from '@/lib/data/activity';

export const metadata = { title: 'Activity' };

export default async function ActivityPage() {
  const items = await getActivityFeed(150);

  return (
    <div className="space-y-5">
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
