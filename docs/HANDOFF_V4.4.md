# TDK Project Tracker — V4.4 Production Hardening Audit Handoff

Audit-first pass. Per direction, this round **delivers findings and recommendations
only — no source code was changed.** It was produced by reading the actual
implementation: auth (`lib/auth.ts`), permissions (`lib/permissions.ts`,
`lib/project-permissions.ts`), all RLS + triggers (`supabase/migrations/0011`,
`0012`, `0018`, `0024`, `0026`), every server action (`lib/actions/*`), the data
layer (`lib/data/*`), the report pipeline (`lib/reports/*`, `lib/notify.ts`), and the
schema migrations. TypeScript / build **not re-run** (no code changed).

**Constraint:** the Supabase MCP cannot reach the TDK project (`grpfdtomncopqslrwpem`),
so nothing was run against the live DB and no migration was applied. Every DB-layer
fix below is specified as a new migration file for `supabase db push`. Findings are
tagged **[verified by code]** or **[needs live-DB confirmation]**.

Severity legend: **HIGH** = security / data-loss · **MED** = correctness / UX ·
**LOW** = polish.

---

## Headline

The codebase is genuinely well-maintained — consistent `ActionResult` error handling,
best-effort notifications that never block actions, RLS on every table, parallelized
data reads, React `cache()` on the hot detail path, smart partial indexes. The obvious
bugs are already gone (e.g. 0018 retired the divergent assignment-notification
triggers and moved them to the app layer using the authoritative `users.staff_id`
link). So the audit had to dig for subtler issues. It found **one HIGH security gap**
and a cluster of MED correctness/concurrency items, all with contained fixes.

---

## Role-model clarification (frames the permission findings)

The directive names 5 roles; the code implements **4 global roles** —
`admin(40) / project_manager(30) / staff(20) / read_only(10)` (`lib/permissions.ts`)
— **plus a project-scoped "Lead"** (`project_leads`, migration 0024). A Lead is a
`staff`-rank user given *project-manager powers for one project only* via
`can_manage_project()` (SQL) / `canManageProject()` (`lib/project-permissions.ts`),
with no global role change. "Project Lead" and "Staff Engineer" are therefore not
separate global roles. Findings are written against the real model.

---

## Findings

### Priority 2 — Permissions

**P2-1 · HIGH · [verified] Self-serviceable `users.staff_id` → privilege escalation.**
- **Root cause:** RLS `users_update` (0012) allows a user to update their own row
  (`id = auth.uid()`), and `guard_user_role_change()` (0011) blocks only `role_id`
  and `is_active` — **`staff_id` is unguarded.** `current_staff_id()` resolves
  `users.staff_id`, which drives `is_project_member`, `can_manage_project`, the review
  queue, and notification routing.
- **Impact:** a non-admin can `PATCH /users?id=eq.<self>` via direct PostgREST (the
  browser holds an auth key) and set their `staff_id` to a Project Manager's — gaining
  that PM's per-project management powers, review queue, and assignment notifications.
  The UI never exposes this, but RLS is the real boundary for a Supabase client app.
- **Fix (migration `0029`, function only):** extend the guard trigger to also reject
  `staff_id` and `company_id` changes when `not is_admin()`. The admin path
  `linkUserStaff` (already `requireAdmin`) and the SECURITY DEFINER provisioning are
  unaffected.
- **Verify:** as a non-admin, the PATCH must be rejected; admin linking still works.

**P2-2 · MED · [verified] Project/task mutations lean on RLS for the membership gate.**
- `updateProject`, `setProjectStatus/Phase`, `setWorkflowState`, `setProjectStaff`
  (`lib/actions/projects.ts`) and `updateTask`/`setTaskStatus`/`deleteTask`
  (`lib/actions/tasks.ts`) call only `requireEditor()` (rank ≥ 20); RLS
  `is_project_member` is what actually blocks non-members.
- **Impact:** functionally safe (RLS rejects), but a blocked non-member sees a raw
  Postgres RLS string via `fail(error.message)`, and defense-in-depth is thinner than
  the review actions, which correctly use `requireProjectManager(projectId)`.
- **Fix (app-layer):** add `requireProjectMember(projectId)` to `_helpers.ts`
  (mirroring the existing `requireProjectManager`) and use it on project-scoped writes.

**P2-3 · MED · [needs live-DB confirmation] Task assignee who isn't a project member
can't update their own task.**
- RLS `tasks_update` requires `is_project_member` for rank-20; `is_project_member`
  checks `created_by` / PM / `project_staff` — **not `task_staff`**. Assigning a task
  (`syncTaskStaff`) does not add the assignee to `project_staff`.
- **Impact:** a staff helper assigned a single task on a project they're not a member
  of would be RLS-rejected on "Mark complete."
- **Fix options:** include task assignees in `is_project_member`, or auto-add the
  assignee to `project_staff` on task assignment. Confirm on live data first.

**P2-4 · LOW · [verified] `task_staff_write` RLS is rank-only, not project-scoped**
(0012: `has_min_rank(20)`), unlike membership-scoped `project_staff_write`. Any staff
can (re)assign anyone on any task. Possibly intentional; flagged for consistency.

### Priority 4 — Concurrent editing

**P4-1 · MED · [verified] Review workflow is check-then-act with no status guard.**
- `sendTaskForReview` / `approveTask` / `rejectTask` / `undoComplete`
  (`lib/actions/reviews.ts`) read `status`, then `update(...).eq('id', taskId)` with no
  guard on the expected current status.
- **Impact:** two reviewers at once can double-approve or approve+reject → duplicate
  `task_reviews` rows and duplicate notifications.
- **Fix (app-layer):** make each update conditional — `.eq('id', id).eq('status',
  expected)` — and treat 0 rows affected as "already changed by someone else" with a
  friendly toast. Same guard helps the archive flip in `setProjectStatus`.

**P4-2 · MED · [verified] `transferOwnership` is non-atomic and swallows errors.**
- `lib/actions/staff.ts` runs four sequential write groups (PM reassign, project_staff
  move, task_staff move, submittal reassign) with **no error checks**, returning
  `{ ok: true }` regardless.
- **Impact:** a mid-sequence failure leaves a half-transferred book and reports success.
- **Fix:** move the transfer into a single SECURITY DEFINER Postgres function (RPC) so
  it's atomic; the action calls it and surfaces failure.

### Priority 5 — Error handling

**P5-1 · MED · [verified] `syncTaskStaff` silently ignores insert/delete errors.**
- `lib/tasks-shared.ts` runs `task_staff` insert/delete with no error inspection —
  exactly the silent-failure class `syncProjectStaff` was already hardened against (it
  throws). Task assignment can fail while the user is told it saved.
- **Fix:** mirror the project reconciler — capture `{ error }` and throw a friendly
  message.

**P5-2 · LOW · [verified] Update-then-sync partial writes.** `updateProject` /
`updateTask` write the row, then reconcile staff; if the sync throws, the row change
persists but the action returns `fail()`. Acceptable (notifications are correctly
best-effort) — documented, not blocking.

**Baseline to preserve:** all actions use `try/catch → fail(errMessage)` +
`ActionResult` (`_helpers.ts`); `notify.ts` is best-effort and never blocks the
triggering action.

### Priority 3 — Database

**P3-1 · MED · [verified] Actor/author FKs have no `ON DELETE` rule (default RESTRICT).**
- Deleting a staff member or user can be blocked or fail non-obviously. Affected:
  `projects.project_manager_id`, `projects.created_by`, `tasks.created_by`,
  `tasks.review_requested_by`, `project_contacts.created_by`, `project_notes.author_id`,
  `project_files.uploaded_by`, `calendar_events.created_by`, `report_runs.generated_by`,
  `task_reviews.actor_id`, `project_submittals.assigned_staff_id`.
- **Fix:** `ON DELETE SET NULL` on actor/author/assignee references (preserve history,
  allow deletion); keep PM handoff via `transferOwnership`.

**P3-2 · LOW · [verified] No trigram/GIN index for project text search.** `getProjects`
filters `name/project_number/description ILIKE %term%`. Fine at office scale; add
`pg_trgm` GIN indexes only if project volume grows.

**P3-3 · LOW · [verified] `report_runs` RLS is rank ≥ 30 for select and insert** (0018)
— blocks the Self Report for staff; the feature loosens it with an owner-scoped policy.

**Baseline (good):** secondary indexes well-covered (0010 + per-feature migrations);
junction PKs cover leading-column lookups; partial indexes on `tasks.due_date` and
`projects.workflow_state`; all child tables cascade from their parent; no N+1 in the
data layer (parallel `Promise.all`, `getProjectDetail` is `cache()`-wrapped).

### Priorities 1, 6, 7 — Workflow / performance / QA (verify on a running instance)

Can't be reproduced statically (no live DB). See the **Regression checklist** below.

### Priority 8 — Cleanup

Method, not guesses: run `npx knip` (or `ts-prune`) to enumerate unused
exports/components, then delete only confirmed-dead items in a separate, review-friendly
commit. **Do not "fix"** the `calendar_events` milestone type — it remains by design
after milestones were removed from the schedule engine (V4.3).

---

## Self Report — feature design (build after audit sign-off)

**Gate.** Self-report-on-self requires `user.staff_id != null` AND `rankOf(role) >= 20`
(linked + not read-only). Admin/PM (rank ≥ 30) may generate for any staff member.
Staff may view only reports whose subject is their own `staff_id`.

**Reuse (don't rebuild).** Pipeline mirrors `runReadyReport` (`lib/reports/run.ts`):
gather → AI summary (`lib/ai.ts`, graceful fallback) → `renderReportPdf`
(`lib/reports/pdf.tsx`) → `uploadReportPdf` (`lib/reports/storage.ts`) → one
`report_runs` insert. Per-person data already exists: `getStaffWorkloadDetail(id)`
(`lib/data/staff.ts`) and `getMyWork(staffId)` (`lib/data/my-work.ts`).

**Schema (migration `0030_self_reports.sql`).**
- `report_runs` add `subject_staff_id uuid references staff(id)` (null for Ready Reports).
- RLS: keep rank ≥ 30 full access; ADD owner-scoped select/insert for
  `report_type = 'self_report' AND subject_staff_id = current_staff_id()`.
- Mirror the `reports` storage read policy so a user can read their own self-report PDF.

**Code.**
- `lib/data/self-report.ts` — `gatherSelfReport(staffId)` + `SelfReportSnapshot`.
- `lib/reports/run.ts` — `runSelfReport({ client, subjectStaffId, generatedBy })`.
- `lib/actions/reports.ts` — `generateSelfReport(subjectStaffId?)`: enforce the gate
  (self unless rank ≥ 30), default subject = caller's `staff_id`.
- `components/reports/self-report-button.tsx` — client button → action → push `/reports/[id]`.
- Placement: My Work header (`app/(app)/my-work/page.tsx`); Staff detail header
  (`app/(app)/staff/[id]/page.tsx`).
- Viewer: extend `app/reports/[id]/page.tsx` to also authorize the subject staff
  member and render the personal layout for `report_type = 'self_report'`.

---

## Staged remediation plan (the implementation pass)

1. **Security migration `0029`** — guard `staff_id` / `company_id` (P2-1). Smallest, highest value.
2. **App-layer correctness (no schema)** — review-workflow status guards (P4-1),
   `syncTaskStaff` error checks (P5-1), `requireProjectMember` friendly gates (P2-2).
3. **DB hygiene migration** — `ON DELETE SET NULL` on actor/author FKs (P3-1);
   `transferOwnership` RPC (P4-2).
4. **Self Report** — migration `0030` + the code above.
5. **Live QA pass** (P1/6/7) + `knip` cleanup (P8).
6. Update this handoff with what shipped.

Each phase ends with `npm run typecheck` + `npm run build`.

---

## Deployment checklist (for when fixes land)

- [ ] `0029_guard_staff_link.sql` applied (`supabase db push`) — re-test the P2-1 PATCH is rejected.
- [ ] `0030_self_reports.sql` applied (if Self Report is in scope).
- [ ] `transferOwnership` RPC migration applied before the action edit is deployed.
- [ ] `npm run typecheck` clean · `npm run build` clean.
- [ ] No new env vars required. Vercel deploy after migrations are live.
- [ ] **Rollback:** app-layer fixes revert by reverting the commit; migrations are
      additive/idempotent — keep a paired down migration only for the FK `ON DELETE`
      change (restore prior FK definition) if a revert is ever needed.

## Regression checklist (live pass — ties to P1/6/7)

- [ ] Dashboard health counts == `/projects?health=behind|slipping|on_track` (same engine).
- [ ] Review queue: a Lead sees only their projects' pending reviews; PM/admin see all.
- [ ] No duplicate notifications on assign/complete/approve (assignment notifs are app-layer only post-0018).
- [ ] Filters (status/company/phase/workflow/health), sorts (incl. in-memory stats sorts), archive view all correct.
- [ ] Command palette + search cover projects/tasks/staff; empty states render; unread/open-task badges match.
- [ ] **P2-3:** a task assignee on a non-member project can "Mark complete" (or is correctly auto-added as a member).
- [ ] Two concurrent approvals on one task → exactly one succeeds, the other gets the friendly "already changed" (post P4-1).
- [ ] Self Report: staff generates own ✓ / staff requests another's id ✗ / admin generates anyone ✓ / staff can't open another's report URL ✗.

## Remaining technical debt

- P2-3 needs a live-DB decision (membership semantics for task assignees).
- P2-4 `task_staff_write` scope is a product decision (per-project vs any-staff).
- P3-2 project search has no trigram index — fine now, revisit at scale.
- `getStaffDashboard` / report aggregations read all `task_staff` rows in memory —
  fine at office scale, revisit with a view/materialization at hundreds of projects
  (carried from V3.3).
- Dead-code sweep (P8) deferred to the implementation pass (run `knip` first).

## Recommendations before V5.0

1. Land the **P2-1 security migration** first regardless of everything else.
2. Add a thin **integration test** around the review state machine and the permission
   gates (the two areas with the subtle bugs) — the app currently has no automated tests.
3. Consider a single **`can_manage_project` app helper used everywhere** (some actions
   use `requireEditor` + RLS, others `requireProjectManager`) for one consistent gate.
4. Decide the task-assignee membership model (P2-3) and document it.
5. Keep the "one schedule engine / no duplicate concepts" discipline from V4.3.

## Open question

Bundle Self Report into V4.4, or split to V4.5? It's the only *new feature* in an
otherwise hardening release. Default: include it (step 4), since it was explicitly requested.
