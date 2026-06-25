'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { cn } from '@/lib/utils';
import type { StaffDashboardCard } from '@/lib/data/staff';

type SortKey = 'name' | 'workload' | 'overdue' | 'review' | 'completion';
type FilterKey = 'all' | 'overdue' | 'review' | 'leadership';

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className={cn('text-base font-semibold tabular-nums', tone)}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export function StaffDashboard({ cards }: { cards: StaffDashboardCard[] }) {
  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('name');
  const [filter, setFilter] = React.useState<FilterKey>('all');

  const visible = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = cards.filter((c) => !term || c.full_name.toLowerCase().includes(term));
    if (filter === 'overdue') rows = rows.filter((c) => c.overdueTasks > 0);
    else if (filter === 'review') rows = rows.filter((c) => c.reviewQueue > 0);
    else if (filter === 'leadership') rows = rows.filter((c) => c.pmCount > 0 || c.leadCount > 0);
    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'workload': return b.openTasks - a.openTasks || a.full_name.localeCompare(b.full_name);
        case 'overdue': return b.overdueTasks - a.overdueTasks || a.full_name.localeCompare(b.full_name);
        case 'review': return b.reviewQueue - a.reviewQueue || a.full_name.localeCompare(b.full_name);
        case 'completion': return b.completionRate - a.completionRate || a.full_name.localeCompare(b.full_name);
        default: return a.full_name.localeCompare(b.full_name);
      }
    });
  }, [cards, q, sort, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="pl-8" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            <SelectItem value="overdue">Has overdue</SelectItem>
            <SelectItem value="review">Awaiting review</SelectItem>
            <SelectItem value="leadership">Leadership</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="workload">Workload</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="review">Review queue</SelectItem>
            <SelectItem value="completion">Completion rate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No staff match your filters.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <Link key={c.id} href={`/staff/${c.id}`}>
              <Card className="card-hover flex h-full flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <StaffAvatar name={c.full_name} initials={c.initials} className="h-10 w-10" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.pmCount === 0 && c.leadCount === 0
                        ? 'Team member'
                        : [c.pmCount > 0 ? `PM ×${c.pmCount}` : null, c.leadCount > 0 ? `Lead ×${c.leadCount}` : null]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Projects" value={c.activeProjects} />
                  <Metric label="Open" value={c.openTasks} />
                  <Metric label="Review" value={c.reviewQueue} tone={c.reviewQueue > 0 ? 'text-violet-600 dark:text-violet-400' : undefined} />
                  <Metric label="Overdue" value={c.overdueTasks} tone={c.overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
                  <Metric label="Due wk" value={c.dueThisWeek} tone={c.dueThisWeek > 0 ? 'text-amber-600 dark:text-amber-400' : undefined} />
                  <Metric label="General" value={c.generalTasks} />
                </div>

                <div className="mt-auto">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Completion</span>
                    <span className="font-medium tabular-nums">{c.completionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.completionRate}%` }} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
