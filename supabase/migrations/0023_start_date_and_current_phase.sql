-- 0023_start_date_and_current_phase.sql
-- P5: optional Start Date on tasks.
-- P4: denormalized current-phase name on projects (project_phases is the source
--     of truth; this column is a cheap read for dashboard/cards/lists).
--
-- Additive + IDEMPOTENT. No existing rows are modified destructively.

-- P5 — Start Date (optional, never breaks existing tasks)
alter table tasks add column if not exists start_date date;

-- P4 — current phase name, kept in sync by the phase actions
alter table projects add column if not exists current_phase_name text;

-- Backfill from the current project_phases row where not already set.
update projects p
set current_phase_name = pp.name
from project_phases pp
where pp.project_id = p.id
  and pp.is_current
  and p.current_phase_name is null;
