-- 0038_proposal_apply.sql
-- V6 Phase 1.1 — Proposal Apply Engine.
--
-- Records that a proposal was APPROVED and applied to the tracker. The apply engine never
-- writes tracker tables directly — it calls the existing server actions (createTask,
-- createGeneralTask, createSubmittal, createCalendarEvent, createNote) and stores only the
-- RESULT here. The original proposal, reasoning, and source text are retained (nothing is
-- deleted); these columns simply link a proposal to the object it produced.
--
-- Additive + IDEMPOTENT. No existing rows change.

alter table intake_proposals add column if not exists applied_at          timestamptz;
alter table intake_proposals add column if not exists applied_by          uuid references users(id);
alter table intake_proposals add column if not exists applied_entity_type text;   -- resulting object type
alter table intake_proposals add column if not exists applied_entity_id   uuid;    -- resulting object id

-- Allow the new 'approved' state (default check name for an inline column check).
alter table intake_proposals drop constraint if exists intake_proposals_state_check;
alter table intake_proposals add constraint intake_proposals_state_check
  check (state in ('proposed', 'edited', 'rejected', 'approved'));
