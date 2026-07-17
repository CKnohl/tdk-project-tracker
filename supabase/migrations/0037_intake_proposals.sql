-- 0037_intake_proposals.sql
-- V6 Phase 1 — AI proposal store. The SINGLE owner of pending AI suggestions.
--
-- Interpreting an intake document produces PROPOSALS only. Nothing here is ever written
-- to a tracker table (projects/tasks/submittals/notes/calendar). Approve/apply is a LATER
-- phase; Phase 1 stores, displays, edits, rejects, and comments on proposals — that's it.
--
-- This generalizes the review concept (task_reviews = human task approvals) to any proposed
-- change, but stays a DISTINCT owner: task_reviews is untouched. A proposal references the
-- source document (provenance) and, at most, a candidate project — it never shadows a
-- tracker record's columns; the target payload lives in `fields` (jsonb) for a future apply.
--
-- Additive + IDEMPOTENT. No existing rows change.

create table if not exists intake_proposals (
  id                    uuid primary key default gen_random_uuid(),
  intake_document_id    uuid not null references intake_documents(id) on delete cascade,
  -- Base target entity (maps 1:1 to an EXISTING action at apply-time in a later phase).
  proposal_type         text not null
                          check (proposal_type in ('task', 'general_task', 'note', 'submittal', 'calendar_event')),
  -- Document-domain flavor for display (rfi / permit / municipal_comment / client_request /
  -- meeting / site_visit / deadline / ...). Advisory only.
  category              text,
  title                 text not null,
  fields                jsonb not null default '{}'::jsonb,   -- editable payload for a future apply
  confidence            smallint not null default 0 check (confidence between 0 and 100),
  reasoning             text,
  source_text           text,                                 -- verbatim supporting snippet (provenance)
  project_match         text check (project_match in ('existing', 'new_candidate', 'unknown')),
  matched_project_id    uuid references projects(id) on delete set null,
  suggested_project_ref text,                                 -- raw number/name the model extracted
  suggested_assignee    text,                                 -- name string (unresolved in Phase 1)
  suggested_due_date    date,
  uncertainties         text,
  state                 text not null default 'proposed'
                          check (state in ('proposed', 'edited', 'rejected')),
  comment               text,
  dedupe_key            text,                                 -- idempotent re-interpret guard
  created_by            uuid references users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists intake_proposals_doc_idx on intake_proposals (intake_document_id, created_at);
create unique index if not exists intake_proposals_dedupe
  on intake_proposals (intake_document_id, dedupe_key) where dedupe_key is not null;

drop trigger if exists trg_intake_proposals_updated on intake_proposals;
create trigger trg_intake_proposals_updated
  before update on intake_proposals
  for each row execute function set_updated_at();

-- ── RLS — PM/Admin only (rank >= 30), matching the Operations Center ────────────
alter table intake_proposals enable row level security;

drop policy if exists intake_proposals_select on intake_proposals;
create policy intake_proposals_select on intake_proposals for select to authenticated
  using (has_min_rank(30));

drop policy if exists intake_proposals_insert on intake_proposals;
create policy intake_proposals_insert on intake_proposals for insert to authenticated
  with check (has_min_rank(30));

drop policy if exists intake_proposals_update on intake_proposals;
create policy intake_proposals_update on intake_proposals for update to authenticated
  using (has_min_rank(30)) with check (has_min_rank(30));

drop policy if exists intake_proposals_delete on intake_proposals;
create policy intake_proposals_delete on intake_proposals for delete to authenticated
  using (has_min_rank(30));

grant select, insert, update, delete on intake_proposals to authenticated, service_role;
