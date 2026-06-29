# TDK Project Tracker — V4.4 Implementation Handoff

Implements the V4.4 audit (`docs/HANDOFF_V4.4.md`). Hardening + one feature
(Self Report). **TypeScript ✓ · Production build ✓.** Three new migrations, all
additive/idempotent (one is a reversible FK constraint change). The Supabase MCP
still can't reach the TDK project, so migrations ship as files for you to
`supabase db push`; live-DB verification steps are listed at the end.

---

## Priority 1 — Security (audit P2-1, HIGH)

**Root cause.** RLS `users_update` lets a user update their own row, and
`guard_user_role_change()` blocked only `role_id` / `is_active` — `staff_id` was
unguarded. Since `current_staff_id()` resolves `users.staff_id` and drives
`is_project_member` / `can_manage_project` / Lead powers and notification routing, a
non-admin could PATCH their own `staff_id` to a manager's and inherit those powers.

**Fix.** `0029_guard_staff_link.sql` extends the existing guard trigger to also
reject `staff_id` **and** `company_id` changes when `not is_admin()`. The admin
linking path (`linkUserStaff`, already `requireAdmin`) and the SECURITY DEFINER
provisioning (INSERT) are unaffected — an admin caller satisfies `is_admin()`.

**Permission review (the rest of the surface).** `current_staff_id()` is the root of
project membership, leads, and review permissions. With `staff_id` now admin-only,
the chain is sound: `is_project_member` / `can_manage_project` / `is_project_lead`
all key off a `staff_id` a user can no longer self-assign. The review actions already
gate with `requireProjectManager(projectId)` (PM / Lead / rank ≥ 30). No further
escalation path found.

## Priority 2 — Review workflow race conditions (audit P4-1)

**Root cause.** `sendTaskForReview` / `approveTask` / `rejectTask` / `undoComplete`
read `status`, then updated `.eq('id', taskId)` with no guard on the current status —
two reviewers could double-approve or approve-after-reject, duplicating review log
rows + notifications.

**Fix (app-layer, `lib/actions/reviews.ts`).** Each transition is now a single
status-guarded `UPDATE … WHERE id = ? AND status = <expected>` with `.select('id')`;
**0 rows affected ⇒ a friendly "already changed / already reviewed" error** and the
side effects (review-log insert, recurrence, notifications) are skipped. The DB makes
the check-and-set atomic, so exactly one concurrent actor wins.

## Priority 3 — Error handling (audit P5-1, P4-2)

- **`syncTaskStaff` (`lib/tasks-shared.ts`)** now inspects the insert/delete `error`
  and throws a friendly message (mirroring the already-hardened `syncProjectStaff`).
  A failed task-assignment write can no longer be silently reported as "saved."
- **`transferOwnership` (`lib/actions/staff.ts`)** was four sequential writes with no
  error checks that could half-complete and still report success. It's now a single
  SECURITY DEFINER RPC, `transfer_staff_ownership()` (`0030`), so the hand-off is
  **atomic** (one transaction) and surfaces failure. The RPC re-authorizes internally
  (`has_min_rank(30)`), matching the action's `requireManager()` gate — so exposing it
  via PostgREST adds no new privilege. Behavior is otherwise identical to before
  (PM role, project membership, task assignments, submittals; project_leads were not
  transferred before and still aren't — left unchanged on purpose).

## Priority 4 — Self Report (new feature)

A personal version of the Ready Report scoped to one staff member, reusing the
existing pipeline (gather → PDF → `report_runs` row → `/reports/[id]` viewer).

**Gate (enforced in the action AND by RLS).**
- Generate own: linked (`staff_id` set) + not read-only (rank ≥ 20).
- Generate for anyone + read all: Project Managers / Admins (rank ≥ 30).
- A staff member may read only their own self-report rows.

**Pieces.**
- `0031_self_reports.sql` — `report_runs.subject_staff_id` + index; owner-scoped
  `select`/`insert` RLS for `report_type='self_report' AND subject = current_staff_id()`
  (ORed alongside the existing rank ≥ 30 policies). PDF downloads use the existing
  service-role signed URLs, so no storage-policy change was needed.
- `lib/data/self-report.ts` — `gatherSelfReport(staffId, client?)` →
  `SelfReportSnapshot` (overdue / due-this-week / upcoming tasks, assigned submittals,
  active projects, last-7-days completions, deterministic summary).
- `lib/reports/run.ts` — `runSelfReport({ client, subjectStaffId, generatedBy })`;
  reuses `uploadReportPdf`. **Also: `getPreviousReport` now excludes `self_report`** so
  a personal report can never become the Ready Report's comparison baseline.
- `lib/reports/self-report-pdf.tsx` — personal PDF (same style primitives).
- `lib/actions/reports.ts` — `generateSelfReport(subjectStaffId?)` enforces the gate.
- `components/reports/self-report-button.tsx` — client button.
- Placement: My Work header (own report); Staff detail header (admins/PMs for anyone,
  or a person on their own page).
- `app/reports/[id]/page.tsx` — fetch-then-authorize (so a staff member can open their
  own self report) + a personal layout for `report_type='self_report'`.

## Priority 5 — Database (audit P3-1)

`0030_fk_on_delete_and_transfer.sql` sets **`ON DELETE SET NULL`** on every
actor/author/assignee FK (all already nullable): `projects.project_manager_id`,
`projects.created_by`, `tasks.created_by`, `tasks.review_requested_by`,
`project_contacts.created_by`, `project_notes.author_id`, `project_files.uploaded_by`,
`calendar_events.created_by`, `report_runs.generated_by`, `task_reviews.actor_id`,
`project_submittals.assigned_staff_id`, `submittal_history.changed_by`. Deleting a
staff member or user no longer hits a silent RESTRICT; history rows survive with the
reference cleared. PM hand-off remains deliberate via `transfer_staff_ownership()`.

---

## Migrations (apply in order via `supabase db push`)

| File | What | Notes |
|---|---|---|
| `0029_guard_staff_link.sql` | Block non-admin `staff_id`/`company_id` change | `create or replace` of the guard fn; trigger already exists. Idempotent. |
| `0030_fk_on_delete_and_transfer.sql` | FK `ON DELETE SET NULL` + atomic `transfer_staff_ownership()` RPC | Drop-if-exists + re-add per FK (assumes the conventional `<table>_<column>_fkey` names Postgres generates for inline FKs — true here). Constraint change is reversible. |
| `0031_self_reports.sql` | `report_runs.subject_staff_id` + owner RLS | Additive + idempotent. |

## Files changed

**New:** `supabase/migrations/0029_guard_staff_link.sql`,
`supabase/migrations/0030_fk_on_delete_and_transfer.sql`,
`supabase/migrations/0031_self_reports.sql`, `lib/data/self-report.ts`,
`lib/reports/self-report-pdf.tsx`, `components/reports/self-report-button.tsx`.

**Edited:** `types/database.types.ts` (`ReportRunRow.subject_staff_id`, `Functions`
entry for the RPC), `lib/actions/reviews.ts`, `lib/tasks-shared.ts`,
`lib/actions/staff.ts`, `lib/actions/reports.ts`, `lib/reports/run.ts`,
`app/(app)/my-work/page.tsx`, `app/(app)/staff/[id]/page.tsx`,
`app/reports/[id]/page.tsx`.

## Regression analysis

- **Ready Report / daily digest:** logic unchanged except `getPreviousReport` now
  filters out `self_report` — manual (`ready_report`) + cron (`daily_digest`) still
  chain together exactly as before; a self report can't corrupt the "since last
  report" window or KPI deltas.
- **Report viewer:** managers are unchanged. A non-manager opening a *Ready Report*
  URL now gets 404 (RLS returns no row) instead of a redirect to /dashboard — a minor,
  safer change (doesn't confirm the report exists). A staff member can now open their
  own self report.
- **Review workflow:** the normal single-actor path is unchanged (the guard matches
  the status just read). Only genuine concurrent duplicates now fail with a clear
  message instead of double-applying.
- **Ownership transfer:** same four steps and same end state, now atomic and
  error-surfacing. No behavior change for the happy path.
- **Task assignment:** unchanged on success; a failed write now raises instead of
  silently passing.
- **`guard_user_role_change`:** admins, the provisioning INSERT, and a user editing
  their own `full_name` are all unaffected (their `staff_id` doesn't change). Only a
  non-admin trying to change `staff_id`/`company_id` is blocked.
- **FK changes:** affect delete-time behavior only; no effect on normal reads/writes.
- **Build:** 25/25 routes generated; `/reports/[id]` and `/staff/[id]` and `/my-work`
  recompiled cleanly; no new client bundle of significance.

## Deployment checklist

1. `supabase db push` to apply `0029` → `0030` → `0031` (in order).
2. Confirm `npm run typecheck` and `npm run build` are green (they are here).
3. No new env vars. Deploy to Vercel after migrations are live.
4. **Rollback:** app code reverts with the commit. `0029`/`0031` are additive
   (drop the two `*_own` policies + the column / restore the prior guard body to
   undo). `0030` is reversible by re-adding the FKs without `ON DELETE SET NULL` and
   `drop function transfer_staff_ownership`.

## Verification (run on a live instance — MCP can't reach the DB)

- **P2-1:** as a non-admin, `PATCH /rest/v1/users?id=eq.<self>` with `{"staff_id": "<other>"}` → rejected; admin Settings → Staff linking still works.
- **P4-1:** fire two `approveTask` calls on one in-review task → exactly one succeeds; the other returns "already reviewed."
- **Transfer:** transfer a departing staff member's book → projects/tasks/submittals move atomically; a forced mid-transfer failure leaves no partial state.
- **Self Report:** staff generates own (works) · staff passes another's `staff_id` (denied) · admin/PM generates anyone's (works) · staff opens another person's report URL (404) · read-only linked user sees no button and the action denies.

## Intentionally deferred (not in the V4.4 implementation scope)

- **P2-2** friendly `requireProjectMember` gates — RLS already blocks non-members and
  the actions return a clear error, so this is defense-in-depth polish, not a silent
  failure. Left to avoid changing project-edit behavior.
- **P2-3** task-assignee-not-a-project-member completion — needs a live-DB decision on
  the intended membership model before changing RLS.
- **P2-4** `task_staff_write` scope and **P3-2** project-search trigram index — product
  decision / scale-driven; no change.
- **P8** dead-code sweep — run `npx knip` and remove confirmed-dead items in a separate
  commit.
