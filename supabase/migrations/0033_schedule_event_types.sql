-- 0033_schedule_event_types.sql
-- V5 Phase C — richer scheduled-item types. The schedule stays a single READ model
-- (v_calendar_feed unions tasks, submittals, calendar_events, milestones); we do
-- NOT introduce a unified write table. We only extend the calendar_event_type enum
-- so the genuinely calendar-native items (presentations, town meetings,
-- inspections) can be added as calendar_events and flow through the feed
-- automatically (the view already passes event_type through).
--
-- Additive + IDEMPOTENT. `add value if not exists` (PG12+) is safe to re-run; the
-- new values are not USED in this migration, so it is transaction-safe.

alter type calendar_event_type add value if not exists 'presentation';
alter type calendar_event_type add value if not exists 'town_meeting';
alter type calendar_event_type add value if not exists 'inspection';
