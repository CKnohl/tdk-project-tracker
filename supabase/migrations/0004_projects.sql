-- 0004_projects.sql
-- Projects, team assignment, and external contacts.

create table projects (
  id                     uuid primary key default gen_random_uuid(),
  project_number         text not null unique,
  name                   text not null,
  company_id             smallint not null references companies(id),
  status                 project_status not null default 'active',
  phase                  project_phase not null default 'proposal',
  workflow_state         workflow_state not null default 'normal',
  workflow_state_since   timestamptz,
  description            text,
  scope                  text,
  project_manager_id     uuid references staff(id),
  target_completion_date date,
  inactive_reason        inactive_reason,
  last_activity_at       timestamptz not null default now(),
  created_by             uuid references users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- YYYYXXX with optional uppercase suffix letters: 2026021, 2025528P, 2025588G
  constraint project_number_format check (project_number ~ '^[0-9]{7}[A-Z]*$'),
  -- Inactive projects must record why (completed/lost bid/cancelled/fell through)
  constraint inactive_requires_reason check (status <> 'inactive' or inactive_reason is not null)
);

create table project_staff (
  project_id      uuid references projects(id) on delete cascade,
  staff_id        uuid references staff(id) on delete cascade,
  role_on_project text,
  assigned_at     timestamptz not null default now(),
  primary key (project_id, staff_id)
);

create table project_contacts (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name       text not null,
  company    text,
  email      citext,
  phone      text,
  role       contact_role not null default 'other',
  notes      text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column projects.workflow_state is 'Coexists with status; awaiting_response / needs_follow_up / urgent_follow_up keep a project active with special emphasis.';
comment on column projects.last_activity_at is 'Maintained by trigger from activity_logs; powers stale-project (no activity > 14d) detection.';
