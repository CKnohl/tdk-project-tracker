-- 0044_delete_safe_activity_logging.sql
-- FIX: deleting a project fails with
--   insert or update on table "activity_logs" violates foreign key constraint
--   "activity_logs_project_id_fkey"
--
-- ROOT CAUSE (0011): both activity triggers are AFTER triggers, and on DELETE they
-- insert an activity row whose project_id references the project being deleted in
-- the same statement:
--   1. trg_activity_projects (AFTER DELETE on projects) inserts
--      project_id = old.id — the row that was just removed → FK violation.
--   2. During the same delete, the ON DELETE CASCADE removes child rows (tasks,
--      notes, submittals, files, contacts); their AFTER DELETE triggers
--      (log_child_activity) insert project_id = old.project_id — also the dead
--      project → the same violation.
-- Every other write path copies project_id from a row whose OWN foreign key
-- guarantees it exists, which is why only deletion can produce an invalid UUID.
-- Note the current design could never keep a deletion audit anyway: even if the
-- insert succeeded, a row referencing the deleted project would be removed by the
-- very cascade it records.
--
-- FIX (no FK changes; the constraint stays exactly as-is):
--   * log_project_activity DELETE branch → log with project_id = NULL and a
--     human summary ('Deleted project P-#### · Name'), so the audit row is valid
--     AND survives the cascade. entity_id keeps the old uuid (plain column, no FK).
--   * log_child_activity DELETE branch → if the parent project row no longer
--     exists (we are inside a project-deletion cascade), skip the row: the
--     project-level 'deleted' entry is the audit record. Normal single deletes
--     (project still present) log exactly as before; general tasks (project_id
--     NULL) log exactly as before.
--
-- Idempotent: CREATE OR REPLACE only; both functions otherwise byte-for-byte
-- preserve their 0011 behavior. Existing rows are untouched.

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
    -- Project-deletion cascade: the parent project row is already gone. Skip —
    -- the project's own 'deleted' activity row is the audit record, and a row
    -- referencing the dead project would violate activity_logs_project_id_fkey.
    if v_pid is not null and not exists (select 1 from projects where id = v_pid) then
      return old;
    end if;
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
    -- project_id NULL: a reference to the deleted row would (a) violate the FK
    -- and (b) be removed by the cascade this row exists to record. The summary
    -- keeps the audit human-readable; entity_id keeps the uuid (no FK on it).
    insert into activity_logs (actor_id, action, entity_type, entity_id, project_id, summary)
    values (auth.uid(), 'deleted', 'project', old.id, null,
            'Deleted project ' || old.project_number || ' · ' || old.name);
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
