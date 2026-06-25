-- 0025_review_enums.sql
-- V3.2 Phase B — enum values for the task review workflow.
--
-- Kept in a SEPARATE migration so these values are COMMITTED before 0026 / app
-- code references them: Postgres won't let a newly-added enum value be used in
-- the same transaction it was added in.
--
-- Additive + IDEMPOTENT.

alter type task_status add value if not exists 'in_review';

alter type notification_type add value if not exists 'review_requested';
alter type notification_type add value if not exists 'task_approved';
alter type notification_type add value if not exists 'task_rejected';
