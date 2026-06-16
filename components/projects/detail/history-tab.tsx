import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { humanize, formatDateTime } from '@/lib/utils';
import type { ActivityItem } from '@/lib/types';

export function HistoryTab({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return <EmptyState icon={Activity} title="No history yet" />;
  }
  return (
    <ol className="relative ml-2 space-y-4 border-l pl-6">
      {activity.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="text-sm">
            <span className="font-medium">{a.actor?.full_name ?? 'System'}</span>{' '}
            <span className="text-muted-foreground">{humanize(a.action)} {a.entity_type}</span>
            {a.summary ? <span className="text-muted-foreground"> — {a.summary}</span> : null}
          </div>
          <div className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</div>
        </li>
      ))}
    </ol>
  );
}
