-- 0031_self_reports.sql
-- V4.4 — Self Report. A personal version of the Ready Report, scoped to one staff
-- member. Reuses the existing report_runs table + PDF storage + /reports/[id]
-- viewer; only the storage column and an owner-scoped RLS pair are new.
--
-- Access model:
--   * report_type = 'self_report' rows carry subject_staff_id (the person the
--     report is about). Ready Reports leave it null.
--   * Generate-on-self: a linked, non-read-only user (rank >= 20) may create a
--     self_report whose subject is their OWN staff link.
--   * Generate-for-anyone + read-all: Project Managers / Admins (rank >= 30) keep
--     full access through the existing report_runs_select / _insert policies (0018).
--   * A staff member may read only their own self_report rows.
--
-- Additive + IDEMPOTENT. PDF downloads use service-role signed URLs (as the Ready
-- Report already does), so no storage policy change is required.

-- ── 1. Subject column ────────────────────────────────────────────────────────
alter table report_runs
  add column if not exists subject_staff_id uuid references staff(id) on delete set null;

create index if not exists report_runs_subject_idx
  on report_runs (subject_staff_id, generated_at desc);

-- ── 2. Owner-scoped RLS (added alongside the existing rank>=30 policies) ──────
-- Postgres ORs permissive policies, so these widen access for self_reports only
-- without loosening anything for Ready Reports.
drop policy if exists report_runs_select_own on report_runs;
create policy report_runs_select_own on report_runs for select to authenticated
  using (report_type = 'self_report' and subject_staff_id = current_staff_id());

drop policy if exists report_runs_insert_own on report_runs;
create policy report_runs_insert_own on report_runs for insert to authenticated
  with check (
    report_type = 'self_report'
    and subject_staff_id = current_staff_id()   -- self only
    and has_min_rank(20)                          -- linked + not read-only
  );
