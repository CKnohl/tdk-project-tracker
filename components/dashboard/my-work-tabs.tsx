'use client';

import { ListChecks, FolderKanban, CalendarClock, FileWarning } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TaskRow, SubmittalRowItem, ProjectRowItem, WidgetList } from '@/components/dashboard/rows';
import type { MyWorkData } from '@/lib/data/my-work';

export function MyWorkTabs({ data }: { data: MyWorkData }) {
  // Personal deadlines = overdue first, then upcoming (already due-date sorted upstream).
  const deadlines = [...data.overdue, ...data.upcoming];

  return (
    <Tabs defaultValue="tasks">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="tasks">Tasks {data.tasks.length > 0 && `(${data.tasks.length})`}</TabsTrigger>
        <TabsTrigger value="projects">Projects {data.projects.length > 0 && `(${data.projects.length})`}</TabsTrigger>
        <TabsTrigger value="deadlines">Deadlines {deadlines.length > 0 && `(${deadlines.length})`}</TabsTrigger>
        <TabsTrigger value="submittals">Submittals {data.submittals.length > 0 && `(${data.submittals.length})`}</TabsTrigger>
      </TabsList>

      <TabsContent value="tasks">
        <div className="rounded-lg border p-2">
          <WidgetList items={data.tasks} emptyTitle="No assigned tasks" emptyIcon={ListChecks} render={(t) => <TaskRow key={t.id} task={t} />} />
        </div>
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
