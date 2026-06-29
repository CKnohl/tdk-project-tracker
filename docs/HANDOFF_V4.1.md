# TDK Project Tracker — V4.1 Stability & Professional Polish Handoff

Stability sprint. The headline is the **notification root-cause fix** (P1).
Everything was traced in the actual code first. TypeScript ✓ · Production build ✓ ·
**No database changes / no migration this sprint.**

## P1 — Notifications: ROOT CAUSE FOUND + FIXED
**Symptom:** one user (Connor) never receives notifications; everyone else does.

**Root cause (code, not guess):** there are two link columns between a user and
their staff record:
- `users.staff_id` — the **authoritative** link. RLS `current_staff_id()` uses it; `linkUserStaff` sets it first and error-checks it.
- `staff.user_id` — a **secondary denormalized copy**, set second, unchecked, conditionally.

The notification recipient resolver `userIdsForStaff` read **`staff.user_id`**.
When the two columns diverge for a user (the second write didn't land, or a
re-link left it stale), that user can still do everything (RLS uses
`users.staff_id`) but **every staff-targeted notification silently drops them**,
while correctly-synced users receive theirs. That is exactly the reported
behavior.

**Fix:** `lib/notify.ts` `userIdsForStaff` now resolves through the authoritative
`users.staff_id` (`select id from users where staff_id in (...)`). One function,
single source of truth, matches RLS. This also repairs **review-workflow
notifications** (P2), which use the same resolver.

**Verify in the TDK DB (I can't reach it):**
```sql
select u.email, u.staff_id as users_staff_id, s.id as staff_id, s.user_id as staff_user_id
from users u left join staff s on s.id = u.staff_id
where u.email ilike '%knohl%';
```
If `users_staff_id` is set but `staff_user_id` is null → confirms the divergence (the code fix already handles it). Optional hygiene re-sync:
```sql
update staff set user_id = u.id from users u
where u.staff_id = staff.id and staff.user_id is distinct from u.id;
```

## P2 — Review workflow: VERIFIED CORRECT (no rewrite)
Traced every path in `lib/actions/reviews.ts` + `lib/notify.ts`:
- Send for Review (`requireEditor`) → status `in_review`, snapshot `prior_status`, notify **PM + all Project Leads only** (`projectLeadUserIds` returns every lead → **multiple leads work**).
- Approve / Reject use `requireProjectManager` → **multiple reviewers** (PM + any lead + admin) all qualify.
- Approve → completed + confetti + `notifyTaskApproved` (assignees). Reject → comment required, restores `prior_status`, `notifyTaskRejected` (assignees, **with the comment**). Comments persist in `task_reviews`.
- Undo Complete restores `prior_status` (priority/dates/assignees/notes never nulled). Review History renders newest-first in the task dialog. Activity is logged by the existing `log_child_activity` trigger.
- **The only defect was notification delivery — the P1 resolver bug — now fixed.** Nothing else changed.

## P3 — Project Lead permissions: VERIFIED
- **Elevated, lead-specific actions are correctly project-scoped** via `requireProjectManager(projectId)` (admin/PM-rank, the PM, or a Lead of *that* project): approve/reject reviews, edit timeline, edit phase schedule, manage project staff. They cannot do these on projects they don't lead (guard + RLS `can_manage_project`). ✅
- Edit tasks: leads are folded into `project_staff` (Phase A) so RLS `is_project_member` lets them edit tasks on **their** projects, and blocks non-member projects. ✅
- **Honest note:** *creating* and *assigning* tasks is open to **all staff (rank ≥ 20) on any project** by pre-existing design (`tasks_insert` / `task_staff_write` RLS are rank-gated, not membership-gated) — this predates Leads and is not a Lead bug. If you want task creation restricted to project members, that's a separate, deliberate RLS change — tell me and I'll scope it.

## P4 — Staff page: DONE (compact rows)
`components/staff/staff-dashboard.tsx` converted from cards to a single bordered
list of compact rows (avatar + name + leadership on the left; Proj / Open /
Review / Overdue / Due-wk / Done% stat columns on the right). Search, sort, and
filter unchanged. Much higher density, far less visual noise.

## P5 — Dashboard polish: PARTIAL (needs direction)
- **Done (concrete light-mode fix):** the page background was `bg-muted/30` (near-white) against white cards → they blended. Bumped to `bg-muted/50` in `app-shell.tsx` for visible separation.
- **Deferred (needs your visual direction):** "reduce color usage" is subjective and partly conflicts with the colored status rails you requested in V2.3 (overdue red / waiting blue / attention orange/yellow). I won't strip those blind. Tell me which surfaces feel too colorful and I'll tone them precisely.

## P6 — Archive: DONE
`components/projects/archive-toolbar.tsx` (new) + `archive/page.tsx` now read
searchParams and pass them to the existing `getProjects({ archived: true, … })`.
Search + company filter + sort, consistent with Active Projects.

## P7 — Active Projects sorting: DONE (mostly)
Added stats-based sorts to `getProjects` (sorted in memory over the already-
fetched `v_project_stats`) + toolbar options: **Next deadline**, **Most overdue**,
**Most open tasks**, **Most submittals** (plus existing recent/oldest/number/name).
**"Next event"** was intentionally skipped — it needs a per-project join to
`calendar_events`/`v_calendar_feed` that the project-list query doesn't do today;
say the word and I'll add it (one extra grouped query, like the dashboard).

## P8 — Weekly calendar: BLOCKED (need location)
I searched the codebase: the **only** monthly calendar is the full `/calendar`
page (`calendar-view.tsx`). There is **no** "tiny monthly calendar in a weekly
section" on the dashboard or My Work. Please tell me exactly where you see it
(screenshot or page name), or confirm you mean "give the `/calendar` page a
weekly-agenda view." Then I'll build the Outlook-style weekly agenda.

## P9 — Companies (PJO Surveying, Aquarii Lighting): BLOCKED (need info)
The signup trigger `handle_new_user` **hard-codes** the allowed domains
(`tdkengineering.com`, `mpengineers.com`) and `ALLOWED_DOMAINS` mirrors them.
To add the two companies I need, per company:
1. **Email domain** (e.g. `pjosurveying.com`, `aquariilighting.com`) — required for OAuth sign-in to be allowed and for auto company-assignment.
2. **Short key/code** for badges (e.g. `PJO`, `AQ`) — used by `formatCompanyTag`.
3. **Badge color** (hex) — `companies.color`.

With those, it's an additive migration (insert `companies` rows + extend the
`handle_new_user` domain check) + an `ALLOWED_DOMAINS` constant update. Filters,
dashboard, project creation, and reports are all data-driven (`getCompanies`) and
pick up new companies automatically — no further wiring.

## Files changed
- `lib/notify.ts` (P1 fix), `lib/data/projects.ts` (P7 sorts), `components/projects/projects-toolbar.tsx` (P7 options), `components/projects/archive-toolbar.tsx` (new, P6), `app/(app)/archive/page.tsx` (P6), `components/staff/staff-dashboard.tsx` (P4), `components/layout/app-shell.tsx` (P5).

## Database / migrations / deployment / rollback
- **DB changes: none. Migration: none.** Everything is code-only.
- **Deploy:** commit + push → Vercel. No migration step.
- **Rollback:** revert the commit and redeploy — there is no schema to unwind. The P1 fix is a single function; if ever needed, revert `userIdsForStaff` alone.

## Concerns / open items
- P1 fix is verified by code + build, **not** by a live send (the Supabase MCP can't reach the TDK DB and the app is OAuth-gated). Confirm by triggering a notification to Connor after deploy.
- `staff.user_id` is now used only for display (the settings "linked" indicator); consider it deprecated as a join key. A future cleanup could drop the dual-column pattern entirely.
- P5 color-reduction, P8 weekly agenda, P9 companies all await your input above.

## Caveats unchanged
Full node path for tooling; MCP can't reach the TDK DB (`grpfdtomncopqslrwpem`).
