-- 0008_notifications_activity.sql
-- Per-user notifications and the global activity log.

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  entity_type activity_entity,
  entity_id   uuid,
  project_id  uuid references projects(id) on delete cascade,
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id),
  action      activity_action not null,
  entity_type activity_entity not null,
  entity_id   uuid,
  project_id  uuid references projects(id) on delete cascade,
  summary     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
