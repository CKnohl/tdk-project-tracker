-- 0040_calendar_feed_date_fix.sql
-- Fix: date-only fields (task due_date, submittal response/follow-up, project target date)
-- were cast to timestamptz as MIDNIGHT UTC. Rendered in Eastern time that shows the DAY
-- BEFORE (e.g., a 7/23 due date appears on 7/22 in the calendar / Today's Schedule).
--
-- Fix: anchor those floating dates at NOON UTC so they render on the correct calendar day
-- in Eastern time. Real calendar events (calendar_events.start_at) are true instants and are
-- left unchanged. Only `create or replace view` — no data changes, fully idempotent.

create or replace view v_calendar_feed with (security_invoker = on) as
  -- Tasks (LEFT JOIN so general tasks are included)
  select
    'task:' || t.id::text          as feed_id,
    'task'                         as source,
    'deadline'::calendar_event_type as event_type,
    t.project_id,
    p.project_number,
    p.name                         as project_name,
    t.name                         as title,
    (t.due_date + time '12:00') at time zone 'UTC' as start_at,
    null::timestamptz              as end_at,
    true                           as all_day,
    t.status::text                 as status,
    t.id                           as entity_id
  from tasks t
  left join projects p on p.id = t.project_id
  where t.due_date is not null and t.status not in ('completed', 'cancelled')

  union all
  -- Submittal response-due dates
  select
    'submittal-due:' || s.id::text, 'submittal', 'submittal'::calendar_event_type,
    s.project_id, p.project_number, p.name,
    coalesce(s.submission_type, 'Submittal') || ' — response due',
    (s.response_due_date + time '12:00') at time zone 'UTC', null, true, s.status::text, s.id
  from project_submittals s
  join projects p on p.id = s.project_id
  where s.response_due_date is not null and s.status not in ('approved', 'rejected')

  union all
  -- Submittal follow-up dates
  select
    'submittal-followup:' || s.id::text, 'follow_up', 'follow_up'::calendar_event_type,
    s.project_id, p.project_number, p.name,
    coalesce(s.submission_type, 'Submittal') || ' — follow up',
    (s.follow_up_date + time '12:00') at time zone 'UTC', null, true, s.status::text, s.id
  from project_submittals s
  join projects p on p.id = s.project_id
  where s.follow_up_date is not null and s.status not in ('approved', 'rejected')

  union all
  -- Calendar events (real instants — unchanged)
  select
    'event:' || e.id::text, 'event', e.event_type,
    e.project_id, p.project_number, p.name,
    e.title, e.start_at, e.end_at, e.all_day, null, e.id
  from calendar_events e
  left join projects p on p.id = e.project_id

  union all
  -- Project target completion as a milestone
  select
    'milestone:' || p.id::text, 'milestone', 'milestone'::calendar_event_type,
    p.id, p.project_number, p.name,
    'Target completion',
    (p.target_completion_date + time '12:00') at time zone 'UTC', null, true, p.status::text, p.id
  from projects p
  where p.target_completion_date is not null and p.status = 'active';
