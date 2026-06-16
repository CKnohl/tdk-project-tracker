-- 0005_tasks.sql
-- Tasks and task assignment.

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  name           text not null,
  description    text,
  priority       task_priority not null default 'medium',
  status         task_status not null default 'not_started',
  due_date       date,
  completion_pct smallint not null default 0 check (completion_pct between 0 and 100),
  notes          text,
  created_by     uuid references users(id),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table task_staff (
  task_id  uuid references tasks(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  primary key (task_id, staff_id)
);
