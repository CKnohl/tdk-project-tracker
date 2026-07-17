-- 0039_proposal_archived_state.sql
-- V6 Phase 1.2 — review workspace. Adds an 'archived' proposal state so a PM can dismiss a
-- suggestion without the finality of 'rejected'. Proposal-store only; no tracker tables.
--
-- Additive + IDEMPOTENT.

alter table intake_proposals drop constraint if exists intake_proposals_state_check;
alter table intake_proposals add constraint intake_proposals_state_check
  check (state in ('proposed', 'edited', 'rejected', 'approved', 'archived'));
