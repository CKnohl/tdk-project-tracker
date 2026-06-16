-- 0006_submittals.sql
-- Municipal / agency submittal tracking and status history.

create table project_submittals (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  submission_type   text not null,                  -- 'Planning Board', 'FOIL Request', 'NYSDOT Permit', ...
  agency            text,
  submission_date   date,
  response_due_date date,
  follow_up_date    date,
  assigned_staff_id uuid references staff(id),
  status            submittal_status not null default 'drafting',
  notes             text,
  created_by        uuid references users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table submittal_history (
  id           uuid primary key default gen_random_uuid(),
  submittal_id uuid not null references project_submittals(id) on delete cascade,
  from_status  submittal_status,
  to_status    submittal_status not null,
  note         text,
  changed_by   uuid references users(id),
  created_at   timestamptz not null default now()
);
