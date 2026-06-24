'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OverviewTab } from './overview-tab';
import { TasksTab } from './tasks-tab';
import { SubmittalsTab } from './submittals-tab';
import { ContactsTab } from './contacts-tab';
import { FilesTab } from './files-tab';
import { NotesTab } from './notes-tab';
import { StaffTab } from './staff-tab';
import { TimelineTab } from './timeline-tab';
import { HistoryTab } from './history-tab';
import type { ProjectDetail } from '@/lib/data/projects';
import type { StaffOption } from '@/lib/data/reference';

const TABS = ['overview', 'tasks', 'submittals', 'contacts', 'files', 'notes', 'staff', 'timeline', 'history'] as const;

export function ProjectTabs({
  detail,
  staff,
  canEdit,
  canManage,
}: {
  detail: ProjectDetail;
  staff: StaffOption[];
  canEdit: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get('tab') as (typeof TABS)[number]) || 'overview';
  const id = detail.project.id;

  const onTab = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const count = (n: number) => (n ? ` (${n})` : '');

  return (
    <Tabs value={TABS.includes(tab) ? tab : 'overview'} onValueChange={onTab}>
      <TabsList className="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tasks">Tasks{count(detail.tasks.length)}</TabsTrigger>
        <TabsTrigger value="submittals">Submittals{count(detail.submittals.length)}</TabsTrigger>
        <TabsTrigger value="contacts">Contacts{count(detail.contacts.length)}</TabsTrigger>
        <TabsTrigger value="files">Files{count(detail.files.length)}</TabsTrigger>
        <TabsTrigger value="notes">Notes{count(detail.notes.length)}</TabsTrigger>
        <TabsTrigger value="staff">Staff{count(detail.staff.length)}</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="overview"><OverviewTab detail={detail} /></TabsContent>
      <TabsContent value="tasks"><TasksTab projectId={id} tasks={detail.tasks} staff={staff} canEdit={canEdit} activity={detail.activity} /></TabsContent>
      <TabsContent value="submittals"><SubmittalsTab projectId={id} submittals={detail.submittals} history={detail.submittalHistory} staff={staff} canEdit={canEdit} canManage={canManage} /></TabsContent>
      <TabsContent value="contacts"><ContactsTab projectId={id} contacts={detail.contacts} canEdit={canEdit} /></TabsContent>
      <TabsContent value="files"><FilesTab projectId={id} files={detail.files} canEdit={canEdit} /></TabsContent>
      <TabsContent value="notes"><NotesTab projectId={id} notes={detail.notes} canEdit={canEdit} /></TabsContent>
      <TabsContent value="staff"><StaffTab projectId={id} members={detail.staff} staff={staff} canEdit={canEdit} /></TabsContent>
      <TabsContent value="timeline"><TimelineTab project={detail.project} phases={detail.phases} submittals={detail.submittals} tasks={detail.tasks} canManage={canManage} /></TabsContent>
      <TabsContent value="history"><HistoryTab activity={detail.activity} /></TabsContent>
    </Tabs>
  );
}
