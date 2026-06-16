import { subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarView } from '@/components/calendar/calendar-view';
import { AddEventButton } from '@/components/calendar/add-event-button';
import { EventsList } from '@/components/calendar/events-list';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import type { CalendarEventItem } from '@/lib/types';

export const metadata = { title: 'Calendar' };

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: projects }, { data: events }] = await Promise.all([
    supabase.from('projects').select('id, project_number, name').in('status', ['active', 'on_hold']).order('project_number'),
    supabase
      .from('calendar_events')
      .select('id,title,description,event_type,start_at,end_at,all_day,project_id,task_id,submittal_id,created_by,created_at,updated_at,project:projects(id,project_number,name)')
      .gte('start_at', subDays(new Date(), 1).toISOString())
      .order('start_at', { ascending: true })
      .limit(50)
      .returns<CalendarEventItem[]>(),
  ]);

  const editor = !!user && canEdit(user.role);

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" description="Tasks, submittals, follow-ups, site visits, meetings, and milestones.">
        {editor && <AddEventButton projects={projects ?? []} />}
      </PageHeader>
      <Card>
        <CardContent className="p-4">
          <CalendarView defaultView="month" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm font-semibold">Scheduled events</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <EventsList events={events ?? []} projects={projects ?? []} canEdit={editor} />
        </CardContent>
      </Card>
    </div>
  );
}
