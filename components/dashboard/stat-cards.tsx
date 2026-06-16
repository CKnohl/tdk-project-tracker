import Link from 'next/link';
import { Activity, PauseCircle, Archive, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Stat {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

export function StatCards({
  counts,
}: {
  counts: { active: number; on_hold: number; inactive: number; awaiting: number };
}) {
  const stats: Stat[] = [
    { label: 'Active Projects', value: counts.active, href: '/projects?status=active', icon: Activity, accent: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'Awaiting Response', value: counts.awaiting, href: '/projects?workflow=awaiting_response', icon: Clock, accent: 'text-sky-600 bg-sky-50 dark:bg-sky-950' },
    { label: 'On Hold', value: counts.on_hold, href: '/projects?status=on_hold', icon: PauseCircle, accent: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { label: 'Inactive', value: counts.inactive, href: '/archive', icon: Archive, accent: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Link key={s.label} href={s.href}>
            <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', s.accent)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
