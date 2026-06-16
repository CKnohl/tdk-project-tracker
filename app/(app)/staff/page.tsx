import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { StaffAvatar } from '@/components/shared/staff-avatar';
import { getStaffWithWorkload } from '@/lib/data/staff';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Staff' };

export default async function StaffPage() {
  const staff = await getStaffWithWorkload();
  const max = Math.max(...staff.map((s) => s.open_tasks), 1);

  return (
    <div className="space-y-5">
      <PageHeader title="Staff" description="Team directory and workload across all active projects." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <Link key={s.staff_id} href={`/staff/${s.staff_id}`}>
            <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-accent/40">
              <div className="flex items-center gap-3">
                <StaffAvatar name={s.full_name} initials={s.initials} className="h-10 w-10" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.open_tasks} open task{s.open_tasks === 1 ? '' : 's'} · {s.active_projects} project{s.active_projects === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full bg-primary')} style={{ width: `${Math.round((s.open_tasks / max) * 100)}%` }} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
