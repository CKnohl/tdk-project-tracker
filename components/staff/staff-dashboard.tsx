'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { cn } from '@/lib/utils';
import type { StaffDashboardCard } from '@/lib/data/staff';

type SortKey = 'name' | 'workload' | 'overdue' | 'review' | 'completion';
type FilterKey = 'all' | 'overdue' | 'review' | 'leadership';

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <span className="flex w-12 flex-col items-center">
      <span className={cn('text-sm font-semibold tabular-nums', tone)}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </span>
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
        <div className="overflow-hidden rounded-lg border">
          {visible.map((c) => (
            <Link
              key={c.id}
              href={`/staff/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-3 py-2 transition-colors last:border-0 hover:bg-accent"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <StaffAvatar name={c.full_name} initials={c.initials} className="h-8 w-8 text-xs" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.pmCount === 0 && c.leadCount === 0
                      ? 'Team member'
                      : [c.pmCount > 0 ? `PM ×${c.pmCount}` : null, c.leadCount > 0 ? `Lead ×${c.leadCount}` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Stat label="Proj" value={c.activeProjects} />
                <Stat label="Open" value={c.openTasks} />
                <Stat label="Review" value={c.reviewQueue} tone={c.reviewQueue > 0 ? 'text-violet-600 dark:text-violet-400' : undefined} />
                <Stat label="Overdue" value={c.overdueTasks} tone={c.overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : undefined} />
                <Stat label="Due wk" value={c.dueThisWeek} tone={c.dueThisWeek > 0 ? 'text-amber-600 dark:text-amber-400' : undefined} />
                <Stat label="Done" value={`${c.completionRate}%`} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
