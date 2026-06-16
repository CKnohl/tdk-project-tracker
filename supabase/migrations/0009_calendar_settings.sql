-- 0009_calendar_settings.sql
-- Calendar events (meetings, site visits, milestones, custom) and settings.

create table calendar_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  event_type   calendar_event_type not null default 'custom',
  start_at     timestamptz not null,
  end_at       timestamptz,
  all_day      boolean not null default false,
  project_id   uuid references projects(id) on delete cascade,
  task_id      uuid references tasks(id) on delete set null,
  submittal_id uuid references project_submittals(id) on delete set null,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table settings (
  id         uuid primary key default gen_random_uuid(),
  scope      text not null check (scope in ('global', 'user')),
  user_id    uuid references users(id) on delete cascade,
  key        text not null,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Enforce uniqueness per scope (NULL user_id for global needs a partial index).
create unique index settings_global_key on settings (key) where scope = 'global';
create unique index settings_user_key on settings (user_id, key) where scope = 'user';
