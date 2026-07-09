import Link from 'next/link';
import { AlertTriangle, Clock, ListChecks, Flame } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { DueItemRow } from '@/components/dashboard/rows';
import { getDueItems } from '@/lib/data/due-items';
import { ScrollRestoration } from '@/components/shared/scroll-restoration';
import { BackLink } from '@/components/shared/back-link';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Priority Items' };

type Filter = 'overdue' | 'today' | 'week' | 'high';

export default async function DuePage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const f: Filter =
    filter === 'today' ? 'today' : filter === 'week' ? 'week' : filter === 'high' ? 'high' : 'overdue';

  const due = await getDueItems();
  const items = due[f];

  const tabs: { key: Filter; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overdue', label: 'Overdue', count: due.overdue.length, icon: AlertTriangle },
    { key: 'today', label: 'Due Today', count: due.today.length, icon: Clock },
    { key: 'week', label: 'Due This Week', count: due.week.length, icon: ListChecks },
    { key: 'high', label: 'High Priority', count: due.high.length, icon: Flame },
  ];

  return (
    <div className="space-y-5">
      <ScrollRestoration storageKey="tdk-due-scroll" />
      <BackLink fallbackHref="/dashboard" fallbackLabel="Dashboard" />
      <PageHeader
        title="Priority Items"
        description="Every task and submittal due now or soon, across all projects. Open any item to view details or its project."
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.key === f;
          return (
            <Link
              key={t.key}
              href={`/due?filter=${t.key}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
                active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing here" description="No items match this filter right now." />
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((i) => (
            <div key={`${i.kind}-${i.id}`} className="px-1">
              <DueItemRow item={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
