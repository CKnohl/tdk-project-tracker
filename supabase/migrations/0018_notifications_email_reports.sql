-- 0018_notifications_email_reports.sql
-- Feature work:
--   (1) Two new notification event types produced by the application layer.
--   (2) Per-user notification_preferences (master + per-type email switches).
--   (3) report_runs history for the Ready Report.
--   (4) Retire the DB-trigger assignment notifications — the app now creates them
--       so it can also notify project managers, exclude admins from task
--       assignments, send email via Resend, and honor notification_preferences.
--
-- IDEMPOTENT: safe to run multiple times and safe against a partially-applied
-- state. Re-running will not modify or drop existing data.
--
-- NOTE on the enum: `ALTER TYPE ... ADD VALUE IF NOT EXISTS` works inside a
-- transaction on PG12+ as long as the new value isn't *used* in the same
-- transaction (it isn't here). If your SQL editor still complains, run the two
-- ALTER TYPE lines on their own first, then run the rest.

-- ── 1. Extend the notification_type enum ────────────────────────────────────
alter type notification_type add value if not exists 'task_completed';
alter type notification_type add value if not exists 'deadline_changed';

-- ── 2. notification_preferences ─────────────────────────────────────────────
-- One row per user. Absence of a row means "all defaults" (everything enabled),
-- so existing users need no backfill.
create table if not exists notification_preferences (
  user_id                uuid primary key references users(id) on delete cascade,
  email_enabled          boolean not null default true,   -- master email switch
  inapp_enabled          boolean not null default true,   -- master in-app switch
  email_task_assigned    boolean not null default true,
  email_task_completed   boolean not null default true,
  email_project_assigned boolean not null default true,
  email_deadline_changed boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists trg_notif_prefs_updated on notification_preferences;
create trigger trg_notif_prefs_updated
  before update on notification_preferences
  for each row execute function set_updated_at();

alter table notification_preferences enable row level security;

drop policy if exists notif_prefs_select on notification_preferences;
create policy notif_prefs_select on notification_preferences for select to authenticated
  using (user_id = auth.uid() or is_admin());
drop policy if exists notif_prefs_insert on notification_preferences;
create policy notif_prefs_insert on notification_preferences for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists notif_prefs_update on notification_preferences;
create policy notif_prefs_update on notification_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_prefs_delete on notification_preferences;
create policy notif_prefs_delete on notification_preferences for delete to authenticated
  using (user_id = auth.uid());

-- ── 3. report_runs (Ready Report history) ───────────────────────────────────
-- snapshot holds the fully-computed report payload at generation time so each
-- run is a frozen historical document and the next run can diff against it.
create table if not exists report_runs (
  id            uuid primary key default gen_random_uuid(),
  generated_by  uuid references users(id),
  generated_at  timestamptz not null default now(),
  report_type   text not null default 'ready_report',
  pdf_path      text,                                    -- reserved for a future stored PDF
  summary       text,                                    -- executive summary text
  snapshot      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists report_runs_generated_at_idx on report_runs (report_type, generated_at desc);

alter table report_runs enable row level security;

-- Only Project Managers and Admins (rank >= 30) may read or create reports.
drop policy if exists report_runs_select on report_runs;
create policy report_runs_select on report_runs for select to authenticated
  using (has_min_rank(30));
drop policy if exists report_runs_insert on report_runs;
create policy report_runs_insert on report_runs for insert to authenticated
  with check (has_min_rank(30));

-- ── 4. Retire DB-trigger assignment notifications (moved to the app layer) ──
drop trigger if exists trg_notify_task_assignment on task_staff;
drop trigger if exists trg_notify_project_assignment on project_staff;
drop function if exists notify_task_assignment();
drop function if exists notify_project_assignment();

-- ── 5. Grants ───────────────────────────────────────────────────────────────
-- 0017 set default privileges for future tables, but grant explicitly so this
-- migration is self-contained regardless of who runs it.
grant select, insert, update, delete on notification_preferences to authenticated, service_role;
grant select, insert, update, delete on report_runs to authenticated, service_role;
