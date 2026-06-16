import { NextResponse, type NextRequest } from 'next/server';
import { addDays, format, subDays } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NotificationType } from '@/types/database.types';

export const dynamic = 'force-dynamic';

interface PendingNotif {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: 'task' | 'submittal';
  entity_id: string;
  project_id: string | null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const cutoff14 = format(subDays(new Date(), 14), 'yyyy-MM-dd');

  const pending: PendingNotif[] = [];

  // Tasks due tomorrow + overdue, with assignees linked to a user.
  const taskSelect =
    'id,name,due_date,project_id,task_staff(staff:staff(user_id))';
  const [{ data: dueTomorrow }, { data: overdue }] = await Promise.all([
    supabase.from('tasks').select(taskSelect).eq('due_date', tomorrow).not('status', 'in', '(completed,cancelled)').returns<any[]>(),
    supabase.from('tasks').select(taskSelect).lt('due_date', today).not('status', 'in', '(completed,cancelled)').returns<any[]>(),
  ]);

  const pushTask = (rows: any[] | null, type: NotificationType, label: string) => {
    for (const t of rows ?? []) {
      for (const ts of t.task_staff ?? []) {
        const uid = ts.staff?.user_id;
        if (uid) pending.push({ user_id: uid, type, title: label, body: t.name, entity_type: 'task', entity_id: t.id, project_id: t.project_id });
      }
    }
  };
  pushTask(dueTomorrow, 'task_due_tomorrow', 'Task due tomorrow');
  pushTask(overdue, 'task_overdue', 'Task overdue');

  // Submittals awaiting response longer than 14 days.
  const { data: submittals } = await supabase
    .from('project_submittals')
    .select('id,submission_type,project_id,assigned_staff_id,submission_date,response_due_date,assigned:staff(user_id)')
    .eq('status', 'awaiting_response')
    .returns<any[]>();
  for (const s of submittals ?? []) {
    const since = s.submission_date ?? s.response_due_date;
    const uid = s.assigned?.user_id;
    if (uid && since && since <= cutoff14) {
      pending.push({
        user_id: uid,
        type: 'submittal_awaiting_too_long',
        title: 'Submittal awaiting response',
        body: `${s.submission_type} has been awaiting a response for 14+ days`,
        entity_type: 'submittal',
        entity_id: s.id,
        project_id: s.project_id,
      });
    }
  }

  if (pending.length === 0) return NextResponse.json({ created: 0 });

  // Dedupe against notifications created in the last ~20 hours.
  const { data: recent } = await supabase
    .from('notifications')
    .select('user_id,type,entity_id')
    .gte('created_at', format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss"));
  const seen = new Set((recent ?? []).map((r) => `${r.user_id}|${r.type}|${r.entity_id}`));

  const toInsert = pending.filter((p) => !seen.has(`${p.user_id}|${p.type}|${p.entity_id}`));
  if (toInsert.length === 0) return NextResponse.json({ created: 0 });

  const { error } = await supabase.from('notifications').insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: toInsert.length });
}
