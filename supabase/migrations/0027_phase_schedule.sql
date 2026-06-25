-- 0027_phase_schedule.sql
-- V4.0 Scheduling engine — give project phases real schedule fields so the
-- editable timeline can drive a lightweight Gantt + schedule health.
--
-- start_date / end_date: optional. When unset, the schedule engine interpolates
--   a phase's dates from the project start + target date by phase position, so
--   the Gantt is useful immediately and sharpens as real dates are entered.
-- progress: 0–100 for the current/in-flight phase (completed phases render full).
--
-- Dependencies are intentionally deferred (the critical-path signal is derived
-- from phase end dates + submittals, not a dependency graph) to keep V4 simple.
--
-- Additive + IDEMPOTENT. No existing rows change.

alter table project_phases add column if not exists start_date date;
alter table project_phases add column if not exists end_date   date;
alter table project_phases add column if not exists progress   smallint not null default 0;
