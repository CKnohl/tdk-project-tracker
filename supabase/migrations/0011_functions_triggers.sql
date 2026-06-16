-- 0011_functions_triggers.sql
-- Provisioning, RLS helper functions, and domain automation triggers.

-- ───────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ───────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_staff_updated      before update on staff             for each row execute function set_updated_at();
create trigger trg_users_updated      before update on users             for each row execute function set_updated_at();
create trigger trg_projects_updated   before update on projects          for each row execute function set_updated_at();
create trigger trg_contacts_updated   before update on project_contacts  for each row execute function set_updated_at();
create trigger trg_tasks_updated      before update on tasks             for each row execute function set_updated_at();
create trigger trg_submittals_updated before update on project_submittals for each row execute function set_updated_at();
create trigger trg_notes_updated      before update on project_notes     for each row execute function set_updated_at();
create trigger trg_calendar_updated   before update on calendar_events   for each row execute function set_updated_at();
create trigger trg_settings_updated   before update on settings          for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- First-login provisioning + domain allowlist (authoritative gate)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_domain text := lower(split_part(new.email, '@', 2));
  v_company_id smallint;
  v_pm_role_id smallint;
begin
  if v_domain not in ('tdkengineering.com', 'mpengineers.com') then
    raise exception 'Email domain % is not permitted', v_domain
      using errcode = 'check_violation';
  end if;

  select id into v_company_id from public.companies where domain = v_domain;
  select id into v_pm_role_id from public.roles where key = 'project_manager';

  insert into public.users (id, email, full_name, avatar_url, role_id, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_pm_role_id,
    v_company_id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────
-- RLS helper functions (SECURITY DEFINER so they can read users/roles freely)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function auth_role_rank() returns smallint
language sql stable security definer set search_path = public as $$
  select r.rank
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid() and u.is_active;
$$;

create or replace function has_min_rank(min_rank integer) returns boolean
language sql stable as $$
  select coalesce(auth_role_rank(), 0) >= min_rank;
$$;

create or replace function is_admin() returns boolean
language sql stable as $$
  select coalesce(auth_role_rank(), 0) >= 40;
$$;

create or replace function current_staff_id() returns uuid
language sql stable security definer set search_path = public as $$
  select staff_id from public.users where id = auth.uid();
$$;

create or replace function is_project_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p and (
         pr.created_by = auth.uid()
      or pr.project_manager_id = current_staff_id()
      or exists (
           select 1 from public.project_staff ps
           where ps.project_id = p and ps.staff_id = current_staff_id())
    )
  );
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- Guard: only admins may change a user's role or activation
-- ───────────────────────────────────────────────────────────────────────────
create or replace function guard_user_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role_id is distinct from old.role_id and not is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  if new.is_active is distinct from old.is_active and not is_admin() then
    raise exception 'Only admins can change user activation';
  end if;
  return new;
end;
$$;

create trigger trg_guard_user_role
  before update on users
  for each row execute function guard_user_role_change();

-- ───────────────────────────────────────────────────────────────────────────
-- Projects: maintain workflow_state_since
-- ───────────────────────────────────────────────────────────────────────────
create or replace function set_workflow_state_since() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.workflow_state_since := case when new.workflow_state <> 'normal' then now() else null end;
  elsif new.workflow_state is distinct from old.workflow_state then
    new.workflow_state_since := case when new.workflow_state <> 'normal' then now() else null end;
  end if;
  return new;
end;
$$;

create trigger trg_workflow_since
  before insert or update on projects
  for each row execute function set_workflow_state_since();

-- ───────────────────────────────────────────────────────────────────────────
-- Tasks: maintain completed_at / completion_pct
-- ───────────────────────────────────────────────────────────────────────────
create or replace function set_task_completion() returns trigger
language plpgsql as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      new.completed_at := now();
    end if;
    new.completion_pct := 100;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_task_completion
  before insert or update on tasks
  for each row execute function set_task_completion();

-- ───────────────────────────────────────────────────────────────────────────
-- Submittals: append status history
-- ───────────────────────────────────────────────────────────────────────────
create or replace function log_submittal_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into submittal_history (submittal_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into submittal_history (submittal_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_submittal_history
  after insert or update on project_submittals
  for each row execute function log_submittal_history();

-- ───────────────────────────────────────────────────────────────────────────
-- Activity logging
-- ───────────────────────────────────────────────────────────────────────────
-- Child entities (tasks, submittals, notes, files, contacts)
create or replace function log_child_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_entity activity_entity;
  v_action activity_action;
  v_pid    uuid;
  v_eid    uuid;
begin
  v_entity := case tg_table_name
    when 'tasks'              then 'task'
    when 'project_submittals' then 'submittal'
    when 'project_notes'      then 'note'
    when 'project_files'      then 'file'
    when 'project_contacts'   then 'contact'
  end::activity_entity;

  if tg_op = 'INSERT' then
    v_action := 'created'; v_pid := new.project_id; v_eid := new.id;
  elsif tg_op = 'DELETE' then
    v_action := 'deleted'; v_pid := old.project_id; v_eid := old.id;
  else
    v_action := 'updated'; v_pid := new.project_id; v_eid := new.id;
    -- detect status change without referencing a column that may not exist
    if tg_table_name in ('tasks', 'project_submittals')
       and (to_jsonb(new) ->> 'status') is distinct from (to_jsonb(old) ->> 'status') then
      v_action := 'status_changed';
    end if;
  end if;

  insert into activity_logs (actor_id, action, entity_type, entity_id, project_id)
  values (auth.uid(), v_action, v_entity, v_eid, v_pid);

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger trg_activity_tasks      after insert or update or delete on tasks             for each row execute function log_child_activity();
create trigger trg_activity_submittals after insert or update or delete on project_submittals for each row execute function log_child_activity();
create trigger trg_activity_notes      after insert or update or delete on project_notes     for each row execute function log_child_activity();
create trigger trg_activity_files      after insert or delete on project_files               for each row execute function log_child_activity();
create trigger trg_activity_contacts   after insert or update or delete on project_contacts  for each row execute function log_child_activity();

-- Projects (handles status_changed / restored, and ignores volatile-only updates)
create or replace function log_project_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action activity_action;
begin
  if tg_op = 'INSERT' then
    insert into activity_logs (actor_id, action, entity_type, entity_id, project_id)
    values (auth.uid(), 'created', 'project', new.id, new.id);
    return new;
  elsif tg_op = 'DELETE' then
    insert into activity_logs (actor_id, action, entity_type, entity_id, project_id)
    values (auth.uid(), 'deleted', 'project', old.id, old.id);
    return old;
  end if;

  -- Skip logging when only volatile bookkeeping columns changed
  -- (this also prevents recursion with the last_activity_at updater below).
  if (to_jsonb(new) - 'last_activity_at' - 'updated_at')
       is not distinct from (to_jsonb(old) - 'last_activity_at' - 'updated_at') then
    return new;
  end if;

  v_action := 'updated';
  if new.status is distinct from old.status then
    v_action := case
      when old.status = 'inactive' and new.status <> 'inactive' then 'restored'
      else 'status_changed'
    end;
  end if;

  insert into activity_logs (actor_id, action, entity_type, entity_id, project_id)
  values (auth.uid(), v_action, 'project', new.id, new.id);
  return new;
end;
$$;

create trigger trg_activity_projects
  after insert or update or delete on projects
  for each row execute function log_project_activity();

-- Maintain projects.last_activity_at from any activity row.
create or replace function touch_project_last_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.project_id is not null then
    update projects set last_activity_at = now() where id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger trg_touch_last_activity
  after insert on activity_logs
  for each row execute function touch_project_last_activity();

-- ───────────────────────────────────────────────────────────────────────────
-- Assignment notifications
-- ───────────────────────────────────────────────────────────────────────────
create or replace function notify_project_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_name text;
begin
  select user_id into v_user from staff where id = new.staff_id;
  if v_user is not null then
    select name into v_name from projects where id = new.project_id;
    insert into notifications (user_id, type, title, body, entity_type, entity_id, project_id)
    values (v_user, 'project_assigned', 'Assigned to a project', v_name, 'project', new.project_id, new.project_id);
  end if;
  return new;
end;
$$;

create trigger trg_notify_project_assignment
  after insert on project_staff
  for each row execute function notify_project_assignment();

create or replace function notify_task_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_task text;
  v_pid  uuid;
begin
  select user_id into v_user from staff where id = new.staff_id;
  if v_user is not null then
    select name, project_id into v_task, v_pid from tasks where id = new.task_id;
    insert into notifications (user_id, type, title, body, entity_type, entity_id, project_id)
    values (v_user, 'task_assigned', 'Assigned a task', v_task, 'task', new.task_id, v_pid);
  end if;
  return new;
end;
$$;

create trigger trg_notify_task_assignment
  after insert on task_staff
  for each row execute function notify_task_assignment();

-- ───────────────────────────────────────────────────────────────────────────
-- Notification helper used by the daily cron job
-- ───────────────────────────────────────────────────────────────────────────
create or replace function create_notification(
  p_user uuid,
  p_type notification_type,
  p_title text,
  p_body text default null,
  p_entity_type activity_entity default null,
  p_entity_id uuid default null,
  p_project_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into notifications (user_id, type, title, body, entity_type, entity_id, project_id)
  values (p_user, p_type, p_title, p_body, p_entity_type, p_entity_id, p_project_id)
  returning id into v_id;
  return v_id;
end;
$$;
