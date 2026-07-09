'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ListChecks, FolderKanban, CalendarClock, FileWarning, Inbox } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TaskRow, SubmittalRowItem, ProjectRowItem, WidgetList } from '@/components/dashboard/rows';
import { NotificationsList } from '@/components/notifications/notifications-list';
import type { MyWorkData } from '@/lib/data/my-work';
import type { NotificationItem } from '@/lib/types';

const TABS = ['tasks', 'inbox', 'projects', 'deadlines', 'submittals'];

export function MyWorkTabs({
  data,
  notifications,
  defaultTab = 'tasks',
}: {
  data: MyWorkData;
  notifications: NotificationItem[];
  defaultTab?: string;
}) {
  // Personal deadlines = overdue first, then upcoming (already due-date sorted upstream).
  const deadlines = [...data.overdue, ...data.upcoming];
  const unread = notifications.filter((n) => !n.is_read).length;

  // Tab lives in the URL so returning from a record restores the last tab (state
  // preservation). Uses replace (no history spam) + scroll:false (no jump).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') ?? defaultTab;
  const value = TABS.includes(urlTab) ? urlTab : 'tasks';
  const onChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', v);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="w-full justify-start">
        <TabsTrigger value="tasks">To Do {data.tasks.length > 0 && `(${data.tasks.length})`}</TabsTrigger>
        <TabsTrigger value="inbox">
          <Inbox className="mr-1 h-3.5 w-3.5" /> Inbox {unread > 0 && `(${unread})`}
        </TabsTrigger>
        <TabsTrigger value="projects">Projects {data.projects.length > 0 && `(${data.projects.length})`}</TabsTrigger>
        <TabsTrigger value="deadlines">Deadlines {deadlines.length > 0 && `(${deadlines.length})`}</TabsTrigger>
        <TabsTrigger value="submittals">Submittals {data.submittals.length > 0 && `(${data.submittals.length})`}</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks">
        <div className="rounded-lg border p-2">
          <WidgetList items={data.tasks} emptyTitle="No assigned tasks" emptyIcon={ListChecks} render={(t) => <TaskRow key={t.id} task={t} />} />
        </div>
      </TabsContent>

      <TabsContent value="inbox">
        {/* One owner: the same NotificationsList the bell + (legacy) page use. */}
        <NotificationsList items={notifications} />
      </TabsContent>

      <TabsContent value="projects">
        <div className="rounded-lg border p-2">
          <WidgetList items={data.projects} emptyTitle="You're not assigned to any active projects" emptyIcon={FolderKanban} render={(p) => <ProjectRowItem key={p.id} project={p} />} />
        </div>
      </TabsContent>

      <TabsContent value="deadlines">
        <div className="rounded-lg border p-2">
          <WidgetList items={deadlines} emptyTitle="No upcoming personal deadlines" emptyIcon={CalendarClock} render={(t) => <TaskRow key={t.id} task={t} />} />
        </div>
      </TabsContent>

      <TabsContent value="submittals">
        <div className="rounded-lg border p-2">
          <WidgetList items={data.submittals} emptyTitle="No submittals assigned to you" emptyIcon={FileWarning} render={(s) => <SubmittalRowItem key={s.id} submittal={s} />} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
