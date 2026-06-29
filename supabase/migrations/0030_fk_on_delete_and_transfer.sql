-- 0030_fk_on_delete_and_transfer.sql
-- V4.4 P3-1 + P4-2 — database hygiene.
--
-- (1) Actor/author/assignee foreign keys had no ON DELETE rule (default NO ACTION
--     / RESTRICT), so deleting a staff member or user could be blocked or fail in
--     non-obvious ways. Every affected column is already NULLABLE, so switching to
--     ON DELETE SET NULL is safe and non-breaking: history rows survive with the
--     reference cleared instead of blocking the delete. Project-manager handoff is
--     still done deliberately via transfer_staff_ownership() below.
--
-- (2) transferOwnership ran four sequential writes with no error checks and could
--     leave a half-transferred book while reporting success. It now lives in ONE
--     SECURITY DEFINER function so the whole hand-off is atomic (a plpgsql function
--     body runs in a single transaction) and surfaces failure to the caller.
--
-- Constraint modification (not purely additive) but reversible and non-breaking;
-- IDEMPOTENT via drop-if-exists + re-add, and a re-run produces the same state.

-- ── 1. ON DELETE SET NULL on actor/author/assignee references ────────────────
-- Inline single-column FKs use the conventional name <table>_<column>_fkey.

alter table projects            drop constraint if exists projects_project_manager_id_fkey;
alter table projects            add  constraint projects_project_manager_id_fkey
  foreign key (project_manager_id) references staff(id) on delete set null;

alter table projects            drop constraint if exists projects_created_by_fkey;
alter table projects            add  constraint projects_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table tasks               drop constraint if exists tasks_created_by_fkey;
alter table tasks               add  constraint tasks_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table tasks               drop constraint if exists tasks_review_requested_by_fkey;
alter table tasks               add  constraint tasks_review_requested_by_fkey
  foreign key (review_requested_by) references staff(id) on delete set null;

alter table project_contacts    drop constraint if exists project_contacts_created_by_fkey;
alter table project_contacts    add  constraint project_contacts_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table project_notes       drop constraint if exists project_notes_author_id_fkey;
alter table project_notes       add  constraint project_notes_author_id_fkey
  foreign key (author_id) references users(id) on delete set null;

alter table project_files       drop constraint if exists project_files_uploaded_by_fkey;
alter table project_files       add  constraint project_files_uploaded_by_fkey
  foreign key (uploaded_by) references users(id) on delete set null;

alter table calendar_events     drop constraint if exists calendar_events_created_by_fkey;
alter table calendar_events     add  constraint calendar_events_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;

alter table report_runs         drop constraint if exists report_runs_generated_by_fkey;
alter table report_runs         add  constraint report_runs_generated_by_fkey
  foreign key (generated_by) references users(id) on delete set null;

alter table task_reviews        drop constraint if exists task_reviews_actor_id_fkey;
alter table task_reviews        add  constraint task_reviews_actor_id_fkey
  foreign key (actor_id) references staff(id) on delete set null;

alter table project_submittals  drop constraint if exists project_submittals_assigned_staff_id_fkey;
alter table project_submittals  add  constraint project_submittals_assigned_staff_id_fkey
  foreign key (assigned_staff_id) references staff(id) on delete set null;

alter table submittal_history   drop constraint if exists submittal_history_changed_by_fkey;
alter table submittal_history   add  constraint submittal_history_changed_by_fkey
  foreign key (changed_by) references users(id) on delete set null;

-- ── 2. Atomic ownership transfer (replaces the non-atomic app-layer version) ──
create or replace function transfer_staff_ownership(p_from uuid, p_to uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Authorize INSIDE the definer function: only Project Managers / Admins, exactly
  -- like the requireManager() gate on the calling server action. has_min_rank()
  -- reads the CALLER's JWT (auth.uid()), not the definer's, so this is correct.
  if not has_min_rank(30) then
    raise exception 'Only Project Managers and Admins can transfer ownership';
  end if;
  if p_from is null or p_to is null or p_from = p_to then
    raise exception 'Pick a different staff member to transfer to';
  end if;

  -- 1) Project manager role
  update projects set project_manager_id = p_to where project_manager_id = p_from;

  -- 2) Project team membership (keep PK unique)
  insert into project_staff (project_id, staff_id)
    select project_id, p_to from project_staff where staff_id = p_from
    on conflict (project_id, staff_id) do nothing;
  delete from project_staff where staff_id = p_from;

  -- 3) Task assignments
  insert into task_staff (task_id, staff_id)
    select task_id, p_to from task_staff where staff_id = p_from
    on conflict (task_id, staff_id) do nothing;
  delete from task_staff where staff_id = p_from;

  -- 4) Submittal assignments
  update project_submittals set assigned_staff_id = p_to where assigned_staff_id = p_from;
end;
$$;

grant execute on function transfer_staff_ownership(uuid, uuid) to authenticated, service_role;
