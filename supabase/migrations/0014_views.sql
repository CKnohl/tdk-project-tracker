-- 0014_views.sql
-- Reporting views. security_invoker = on so the querying user's RLS applies.

-- ── Unified calendar feed ────────────────────────────────────────────────────
-- Sources: task due dates, submittal response-due, submittal follow-up,
-- calendar events (meetings/site visits/milestones/custom), project milestones.
create view v_calendar_feed with (security_invoker = on) as
  -- Tasks
  select
    'task:' || t.id::text          as feed_id,
    'task'                         as source,
    'deadline'::calendar_event_type as event_type,
    t.project_id,
    p.project_number,
    p.name                         as project_name,
    t.name                         as title,
    t.due_date::timestamptz        as start_at,
    null::timestamptz              as end_at,
    true                           as all_day,
    t.status::text                 as status,
    t.id                           as entity_id
  from tasks t
  join projects p on p.id = t.project_id
  where t.due_date is not null and t.status not in ('completed', 'cancelled')

  union all
  -- Submittal response-due dates
  select
    'submittal-due:' || s.id::text, 'submittal', 'submittal'::calendar_event_type,
    s.project_id, p.project_number, p.name,
    coalesce(s.submission_type, 'Submittal') || ' — response due',
    s.response_due_date::timestamptz, null, true, s.status::text, s.id
  from project_submittals s
  join projects p on p.id = s.project_id
  where s.response_due_date is not null and s.status not in ('approved', 'rejected')

  union all
  -- Submittal follow-up dates
  select
    'submittal-followup:' || s.id::text, 'follow_up', 'follow_up'::calendar_event_type,
    s.project_id, p.project_number, p.name,
    coalesce(s.submission_type, 'Submittal') || ' — follow up',
    s.follow_up_date::timestamptz, null, true, s.status::text, s.id
  from project_submittals s
  join projects p on p.id = s.project_id
  where s.follow_up_date is not null and s.status not in ('approved', 'rejected')

  union all
  -- Calendar events (meetings, site visits, milestones, custom)
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
    p.target_completion_date::timestamptz, null, true, p.status::text, p.id
  from projects p
  where p.target_completion_date is not null and p.status = 'active';

-- ── Awaiting Response projects (project flag OR any awaiting submittal) ──────
create view v_awaiting_response_projects with (security_invoker = on) as
  select p.*
  from projects p
  where p.status = 'active'
    and (
      p.workflow_state = 'awaiting_response'
      or exists (
        select 1 from project_submittals s
        where s.project_id = p.id and s.status = 'awaiting_response'
      )
    );

-- ── Follow-Up Needed ("don't forget these") ─────────────────────────────────
create view v_follow_up_needed with (security_invoker = on) as
  select
    p.*,
    case
      when p.workflow_state = 'urgent_follow_up' then 'urgent_follow_up'
      when p.workflow_state = 'needs_follow_up' then 'needs_follow_up'
      when p.workflow_state = 'awaiting_response'
           and p.workflow_state_since < now() - interval '14 days' then 'awaiting_over_14d'
      when p.last_activity_at < now() - interval '14 days' then 'no_activity_14d'
      else 'no_follow_up_date'
    end as reason
  from projects p
  where p.status = 'active'
    and (
      p.workflow_state in ('needs_follow_up', 'urgent_follow_up')
      or (p.workflow_state = 'awaiting_response'
          and p.workflow_state_since < now() - interval '14 days')
      or p.last_activity_at < now() - interval '14 days'
      or not exists (
        select 1 from project_submittals s
        where s.project_id = p.id and s.follow_up_date is not null
          and s.status not in ('approved', 'rejected')
      )
    );

-- ── Staff workload (open tasks / active projects per staff) ─────────────────
create view v_staff_workload with (security_invoker = on) as
  select
    s.id   as staff_id,
    s.full_name,
    s.initials,
    coalesce(tw.open_tasks, 0)      as open_tasks,
    coalesce(pw.active_projects, 0) as active_projects
  from staff s
  left join (
    select ts.staff_id, count(*) as open_tasks
    from task_staff ts
    join tasks t on t.id = ts.task_id
    where t.status not in ('completed', 'cancelled')
    group by ts.staff_id
  ) tw on tw.staff_id = s.id
  left join (
    select ps.staff_id, count(*) as active_projects
    from project_staff ps
    join projects p on p.id = ps.project_id
    where p.status = 'active'
    group by ps.staff_id
  ) pw on pw.staff_id = s.id
  where s.is_active;

-- ── Per-project rollup for list/cards ───────────────────────────────────────
create view v_project_stats with (security_invoker = on) as
  select
    p.id as project_id,
    count(distinct t.id) filter (where t.status not in ('completed', 'cancelled')) as open_tasks,
    count(distinct t.id) filter (where t.due_date < current_date and t.status not in ('completed', 'cancelled')) as overdue_tasks,
    count(distinct s.id) filter (where s.status = 'awaiting_response') as awaiting_submittals,
    count(distinct ps.staff_id) as team_size,
    min(t.due_date) filter (where t.status not in ('completed', 'cancelled')) as next_due_date
  from projects p
  left join tasks t on t.project_id = p.id
  left join project_submittals s on s.project_id = p.id
  left join project_staff ps on ps.project_id = p.id
  group by p.id;
