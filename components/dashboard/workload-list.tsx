import Link from 'next/link';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StaffWorkloadRow } from '@/types/database.types';

export function StaffWorkloadList({ rows }: { rows: StaffWorkloadRow[] }) {
  const active = rows.filter((r) => r.open_tasks > 0 || r.active_projects > 0);
  if (active.length === 0) {
    return <EmptyState icon={Users} title="No assigned work" className="border-0 p-6" />;
  }
  const max = Math.max(...active.map((r) => r.open_tasks), 1);

  return (
    <div className="space-y-2">
      {active.map((r) => (
        <Link
          key={r.staff_id}
          href={`/staff/${r.staff_id}`}
          className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
        >
          <StaffAvatar name={r.full_name} initials={r.initials} className="h-7 w-7" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{r.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {r.open_tasks} tasks · {r.active_projects} proj
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full bg-primary')}
                style={{ width: `${Math.round((r.open_tasks / max) * 100)}%` }}
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
