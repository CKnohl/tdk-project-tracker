-- 0026_task_reviews.sql
-- V3.2 Phase B — task approval workflow storage. Apply AFTER 0025.
--
-- tasks.prior_status        : active status captured at "Send for Review", used
--                             to restore on Reject and Undo Complete (no data loss).
-- tasks.review_requested_at : submit timestamp (for the review queue).
-- tasks.review_requested_by : submitter staff id (for the review queue).
-- task_reviews              : append-only log of every review event
--                             (submitted / approved / rejected) with reviewer +
--                             comments — the "Review History".
--
-- Additive + IDEMPOTENT. No existing rows change. completed_at is still managed
-- by the existing set_task_completion() trigger.

alter table tasks add column if not exists prior_status        task_status;
alter table tasks add column if not exists review_requested_at timestamptz;
alter table tasks add column if not exists review_requested_by uuid references staff(id);

create table if not exists task_reviews (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  action       text not null check (action in ('submitted', 'approved', 'rejected')),
  actor_id     uuid references staff(id),
  comment      text,
  prior_status task_status,
  created_at   timestamptz not null default now()
);

create index if not exists idx_task_reviews_task on task_reviews (task_id, created_at desc);

alter table task_reviews enable row level security;

-- Everyone authenticated reads review history. Any editor (staff+) may append an
-- event; the application enforces WHO may submit vs approve/reject (assignees
-- submit; only the PM/Leads/admins approve or reject). Append-only — no update or
-- delete policy.
drop policy if exists task_reviews_select on task_reviews;
create policy task_reviews_select on task_reviews for select to authenticated using (true);

drop policy if exists task_reviews_insert on task_reviews;
create policy task_reviews_insert on task_reviews for insert to authenticated with check (has_min_rank(20));

grant select, insert on task_reviews to authenticated, service_role;
