-- 0021_tasks_general_recurring.sql
-- P5 General (project-less) tasks + P6 Recurring tasks.
--   1. tasks.project_id becomes nullable (standalone office tasks).
--   2. New task_recurrence enum + tasks.recurrence column.
--   3. RLS: let editors (rank >= 20) manage general tasks (project_id is null).
--
-- Additive and IDEMPOTENT. Existing rows are untouched: recurrence defaults to
-- 'none' and all current tasks keep their project_id.

-- ── 1. Allow project-less tasks ─────────────────────────────────────────────
alter table tasks alter column project_id drop not null;

-- ── 2. Recurrence ───────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_recurrence') then
    create type task_recurrence as enum ('none', 'daily', 'weekly', 'monthly', 'yearly');
  end if;
end $$;

alter table tasks add column if not exists recurrence task_recurrence not null default 'none';

-- ── 3. RLS — general tasks (null project) manageable by any editor ──────────
drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks for update to authenticated
  using      (has_min_rank(30) or project_id is null and has_min_rank(20) or (has_min_rank(20) and is_project_member(project_id)))
  with check (has_min_rank(30) or project_id is null and has_min_rank(20) or (has_min_rank(20) and is_project_member(project_id)));

drop policy if exists tasks_delete on tasks;
create policy tasks_delete on tasks for delete to authenticated
  using (has_min_rank(30) or created_by = auth.uid() or (project_id is null and has_min_rank(20)));
