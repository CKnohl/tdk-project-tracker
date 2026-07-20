-- 0042_appointment_event_type.sql
-- Adds "appointment" to calendar_event_type (notes: "Add an option for Appointment
-- for the different types of events"). Personal/office appointments that aren't a
-- meeting, site visit, or inspection.
--
-- Additive + IDEMPOTENT. `add value if not exists` (PG12+) is safe to re-run; the
-- v_calendar_feed view passes event_type through, so it appears automatically. The
-- new value is not USED in this migration, so it is transaction-safe.

alter type calendar_event_type add value if not exists 'appointment';
