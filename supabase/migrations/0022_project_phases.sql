-- 0022_project_phases.sql
-- P7 Editable project timelines: per-project, customizable phases.
--
-- projects.phase (the enum column) is KEPT as-is and still drives dashboard/card
-- badges. This table becomes the source of truth for the Timeline tab, seeded
-- from the same 12-phase template so existing behavior is preserved.
--
-- Additive and IDEMPOTENT. Backfill only touches projects that have no phases yet.

create table if not exists project_phases (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  position    smallint not null default 0,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists project_phases_project_idx on project_phases (project_id, position);

alter table project_phases enable row level security;

drop policy if exists project_phases_select on project_phases;
create policy project_phases_select on project_phases for select to authenticated using (true);

drop policy if exists project_phases_write on project_phases;
create policy project_phases_write on project_phases for all to authenticated
  using      (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)))
  with check (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)));

grant select, insert, update, delete on project_phases to authenticated, service_role;

-- Backfill existing projects from the 12-phase template (skip any already seeded).
insert into project_phases (project_id, name, position, is_current)
select p.id, t.label, t.ord, (t.key = p.phase::text)
from projects p
cross join (values
  ('proposal',            'Proposal',             1),
  ('survey',              'Survey',               2),
  ('existing_conditions', 'Existing Conditions',  3),
  ('concept_design',      'Concept Design',       4),
  ('engineering_design',  'Engineering Design',   5),
  ('client_review',       'Client Review',        6),
  ('municipal_review',    'Municipal Review',     7),
  ('permitting',          'Permitting',           8),
  ('bidding',             'Bidding',              9),
  ('construction',        'Construction',        10),
  ('closeout',            'Closeout',            11),
  ('completed',           'Completed',           12)
) as t(key, label, ord)
where not exists (select 1 from project_phases pp where pp.project_id = p.id);
