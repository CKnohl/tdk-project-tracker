-- 0034_activity_feed_index.sql
-- V5 Phase D — firm-wide activity feed. activity_logs is already fully populated by
-- triggers (it only surfaced per-project before). The existing indexes lead with
-- project_id / actor_id; a global "newest across all projects" feed needs a plain
-- created_at index. No new table, no new write path — one feed over existing data.
--
-- Additive + IDEMPOTENT.

create index if not exists idx_activity_created_at on activity_logs (created_at desc);
