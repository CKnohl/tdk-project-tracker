# TDK Project Tracker — V3.2 Phase A Handoff (Project Leadership + Permission Engine)

V3.2 is a large, DB-coupled, **authorization-critical** sprint (10 items). Because
the Supabase MCP can't reach the TDK DB, migrations/RLS can't be applied or tested
here — so it's being built in reviewable phases. This is **Phase A: the foundation**
everything else sits on. Also shipped this turn: **#9 Timezone** (independent).

TypeScript ✓ · Production build ✓.

## Shipped this turn

### #9 Timezone → America/New_York (independent, complete)
- `lib/utils.ts` `formatDate/formatDateTime/formatTime` now render in `America/New_York` (DST-aware) via `Intl`, regardless of server TZ (Vercel = UTC). Date-only values (`yyyy-MM-dd` due/start dates) are pinned to UTC-noon so a timezone never shifts the day; timestamps are shown as ET instants. Propagates everywhere (UI, activity, history, completion, notifications, PDF reports) because all rendering routes through these helpers.

### Phase A — Project Leadership foundation (#1, #6, #7)
**Architecture / root design.** A project keeps one **Project Manager**
(`projects.project_manager_id`) and now zero or more **Project Leads** (new
`project_leads` table). A Lead gets project-manager powers **for that project
only**, never a global role change.

The mechanism is deliberately low-risk for untestable RLS: the app folds every
Lead into `project_staff` (exactly as it already does for the PM), so Leads become
project **members** and inherit the **existing, tested** member-level RLS on
tasks / submittals / phases / project_staff / projects. The migration therefore
changes **no existing policy** — it only adds the leadership table + two helper
functions. The app layer adds a project-scoped guard for the rank-30-gated
actions (timeline, project-staff management).

**Files changed**
- `supabase/migrations/0024_project_leads.sql` (new) — `project_leads` table, `is_project_lead()` + `can_manage_project()` SQL helpers, RLS on the new table only. Additive + idempotent.
- `types/database.types.ts` — `ProjectLeadRow` + register `project_leads`.
- `lib/project-permissions.ts` (new) — the engine: `canManageProject / canReviewProject / canAssignProject(user, {projectManagerId, leadStaffIds})`. Mirrors the SQL helper.
- `lib/actions/_helpers.ts` — `requireProjectManager(projectId)` guard (admin/PM-rank, the PM, or a Lead).
- `lib/actions/phases.ts` — all 5 timeline actions: `requireManager()` → `requireProjectManager(projectId)`, so Leads can edit their timeline.
- `lib/actions/workload.ts` — `addStaffToProject` / `removeStaffFromProject` → `requireProjectManager(projectId)`.
- `lib/actions/projects.ts` — `syncProjectLeads()` reconciler; create/update reconcile leads and fold them into the member set.
- `lib/validators.ts` — `projectSchema.lead_ids`.
- `lib/data/projects.ts` — `getProjectDetail` returns `leads: StaffRef[]` (one extra small query).
- `components/projects/project-form.tsx` — "Project Leads" multiselect (PM · Leads · Staff, clearly separated).
- `app/(app)/projects/[id]/page.tsx`, `components/projects/detail/project-header.tsx` — thread `assignedLeadIds`.
- `components/projects/detail/command-center.tsx` — shows Project Leads when present.

**Database changes:** `project_leads` table + `is_project_lead()` / `can_manage_project()` functions. No column/enum changes. No existing policy touched.

**Migration files:** `0024_project_leads.sql` — **must be applied** to the TDK DB (`grpfdtomncopqslrwpem`) before deploying this code.

**Regression analysis**
- Global Admins/PMs (rank ≥ 30) are unaffected — `requireProjectManager` fast-paths them, identical to the old `requireManager`.
- Existing projects have zero leads → behavior identical to today until leads are added.
- Leads being folded into `project_staff` means a Lead also appears in the assigned-staff list (intended — they're members). Display dedup is a polish item, not a correctness issue.
- `getProjectDetail` adds one small `project_leads` query (cached with the rest of the detail fetch).

**Performance impact:** +1 small indexed query per project-detail load; `requireProjectManager` adds 2 tiny lookups only for non-rank-30 users on manager-gated actions (admins/PMs skip it).

## Production deployment checklist (Phase A)
1. Apply `supabase/migrations/0024_project_leads.sql` in the TDK SQL editor. Verify: `select * from pg_proc where proname in ('is_project_lead','can_manage_project');` returns 2 rows, and `project_leads` exists.
2. Commit + push the code → Vercel deploys.
3. Smoke test: Edit a project → add a Staff-rank person as a **Project Lead** → confirm they can edit that project's timeline and staff, and **cannot** on a project they don't lead.

## Remaining phases (not yet built)
- **Phase B — Review workflow (#2–#5):** migration `0025` (`task_status += 'in_review'`; `task_reviews(id, task_id, reviewer_id, action, comment, prior_status, created_at)` + RLS via `can_manage_project`). Actions: `sendForReview` (notify PM + Leads of that project only), `approveTask` (→ completed + confetti + recurrence), `rejectTask` (comment required → restore `prior_status`, notify assignee), `undoComplete` (restore `prior_status`; priority/due/start/assignments are already never nulled). Approval history in the task detail dialog. Reviewer gating uses `canReviewProject` (already built).
- **Phase C — Staff page (#10):** management dashboard (search/sort/filter/workload/project count/**review queue** = tasks `in_review` on projects you manage or lead/quick actions). Depends on Phase B.
- **#8 Companies (Aquarii, PJO):** additive `companies` rows + add their email domains to `ALLOWED_DOMAINS` and `handle_new_user`. **Blocked on input:** the actual email domains for Aquarii and PJO.

## Notes for next session
- The permission engine (`canReviewProject`) and the `can_manage_project()` SQL helper are already in place for Phase B's `task_reviews` RLS — reuse them, don't fork.
- Keep using `requireProjectManager(projectId)` for new project-scoped manager actions (e.g. report generation, submittal delete) if you want Leads to perform them.
- Build/run caveats unchanged: full node path for tooling; MCP can't reach the TDK DB.
