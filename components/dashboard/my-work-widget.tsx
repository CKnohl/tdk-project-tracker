import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, AlertTriangle, CalendarClock, FileWarning, FolderKanban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskRow } from './rows';
import { cn } from '@/lib/utils';
import type { MyWorkData } from '@/lib/data/my-work';

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-lg font-semibold leading-none tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function MyWorkWidget({ data }: { data: MyWorkData }) {
  const top = [...data.overdue, ...data.upcoming].slice(0, 4);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BriefcaseBusiness className="h-4 w-4 text-primary" />
          My Work
        </CardTitle>
        <Link href="/my-work" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          Open <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {!data.hasStaff ? (
          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Your account isn&apos;t linked to a staff member yet, so personal assignments can&apos;t be shown. An admin
            can link it in Settings → Staff.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Assigned" value={data.tasks.length} icon={BriefcaseBusiness} tone="bg-primary/10 text-primary" />
              <Stat label="Overdue" value={data.overdue.length} icon={AlertTriangle} tone="bg-red-50 text-red-600 dark:bg-red-950" />
              <Stat label="Due ≤14d" value={data.upcoming.length} icon={CalendarClock} tone="bg-amber-50 text-amber-600 dark:bg-amber-950" />
              <Stat label="Submittals" value={data.submittals.length} icon={FileWarning} tone="bg-violet-50 text-violet-600 dark:bg-violet-950" />
              <Stat label="Projects" value={data.projects.length} icon={FolderKanban} tone="bg-sky-50 text-sky-600 dark:bg-sky-950" />
            </div>
            {top.length > 0 && (
              <div className="-mx-2 divide-y divide-border/50 border-t pt-1">
                {top.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
