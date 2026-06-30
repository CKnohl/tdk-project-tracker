# TDK Project Tracker — V5.0 Workflow & UX Overhaul Handoff

One cohesive release (Phases A–D), not incremental patches. Goal: **simpler, more
consistent, easier to learn** while preserving every existing workflow.
**TypeScript ✓ · Production build ✓ (26 routes).** Four additive/idempotent
migrations (`0032`–`0035`); the Supabase MCP can't reach the TDK project, so apply
them with `supabase db push`.

## Rule 0 (the governing principle)

Every fact has **one owner and one edit point; everything else references it.**
Applied throughout: task text → `description`; company → `companies` (+ data-driven
allowlist); schedule → `v_calendar_feed`; activity → `activity_logs`; notifications →
the My Work Inbox; due items → `getDueItems()` → `/due`; health → `lib/schedule.ts`.

---

## Phase A — Foundations

- **Multi-company (shared pool).** `0032_companies_multi.sql` adds **PJO Surveying**
  (`pjosurvey.com`, `#6dacde`) and **Aquarii Lighting** (`aquariitech.com`, `#b794e6`)
  as sign-in-only firms (they own no projects), and makes `handle_new_user()` read the
  domain allowlist from `companies.domain` — onboarding firm #5 is now a single INSERT,
  no code change. Visibility is unchanged (`select using (true)`): everyone keeps
  collaborating across all companies.
- **Nav reorder** (`components/layout/nav.ts`): **Activity** added; **General Tasks
  kept** visible. Notifications is now the My Work Inbox + the bell, but the nav entry
  is **kept for one transitional release** (it redirects to the Inbox) for easy
  rollback — removed in a later cleanup. Order = Dashboard · My Work · Active Projects ·
  Calendar · Activity · General Tasks · Staff · Archive · Notifications · Settings.
- **Completion gating** (`lib/actions/projects.ts`): archiving/completing a project
  (`status → inactive`) now requires the project's Manager / Lead / Admin
  (`requireProjectManager`). Active ↔ On Hold stays editor-level.
- **Health** — already the On-Track / Slipping / Behind model; no code needed.

## Phase B — Office Dashboard + Personal Workspace

- **Dashboard (Office)** — fully rebuilt to the compact "command center" spec
  (`app/(app)/dashboard/page.tsx` + `getOfficeOverview()` in `lib/data/dashboard.ts`):
  Priority Focus tiles (Overdue · Due Today · Due This Week · **High Priority**) →
  `/due`; a status-button row (Behind · Slipping · Needs Attention · Waiting) → the
  canonical filtered lists; Today's Schedule + Upcoming Meetings from `v_calendar_feed`;
  an Office Summary line (Active · On Hold · Archive). One screen, no duplicated widgets;
  every count links out.
- **High Priority** is a new bucket on the single due-items source (`lib/data/due-items.ts`)
  surfaced as a 4th tab on `/due` — not a parallel pipeline.
- **My Work (Personal)** (`app/(app)/my-work/page.tsx`, `my-work-tabs.tsx`): To Do ·
  **Inbox** (notifications merged, reusing the one `NotificationsList`) · Projects ·
  Deadlines · Submittals, plus **Recently Viewed**. `/notifications` now redirects here;
  the bell points to `?tab=inbox`.
- **Recently Viewed** (`components/shared/recent-tracker.tsx` + `recently-viewed.tsx`):
  last 5 projects / reports / staff, owned by the browser (localStorage, references
  canonical ids). `<RecentTracker/>` is dropped on the project, staff, and report pages.
- The old `stat-cards.tsx`, `priority-card.tsx`, `schedule-health.tsx` are now unused
  but **kept for one release** (delete in a cleanup commit after the new dashboard is
  proven — safer rollback). **Health direction:** the Office dashboard surfaces only
  **Behind** and **Slipping** buttons — On Schedule is implied, not emphasized (the old
  "On schedule" tile lived in `schedule-health.tsx`, which is no longer rendered).

## Phase C — Schedule & Calendar

- **No unified write table** (rejected by design). The schedule stays the single READ
  model `v_calendar_feed`. `0033_schedule_event_types.sql` extends `calendar_event_type`
  with **presentation / town_meeting / inspection**, surfaced in the event form, colored
  in `EVENT_COLORS`, and flowing through the feed automatically.
- **Calendar** **remembers the user's last view** (Month/Week/Agenda persisted to
  localStorage) instead of hard-coding one — `defaultView` is only the first-time
  fallback (Month). The bottom list is relabeled "Manage calendar events" with a note
  that tasks/submittals/deadlines appear on the grid automatically (kills the "is this
  the whole schedule?" confusion while keeping event CRUD).

## Phase D — Cleanup & Activity feed

- **Firm-wide Activity feed** (`/activity`, `lib/data/activity.ts`) over the existing
  `activity_logs` (already trigger-populated) — newest-first across all projects.
  `0034_activity_feed_index.sql` adds the `created_at` index the global feed needs.
- **One task text field.** The task form already edited only `description`; `notes` was
  a legacy column. `0035_consolidate_task_notes.sql` folds any remaining notes into
  `description` (guarded/idempotent, **column kept** for V5.1) and the task detail dialog
  now shows a single field.

---

## Migrations (apply in order via `supabase db push`)

| File | Purpose | Notes |
|---|---|---|
| `0032_companies_multi.sql` | PJO/Aquarii rows + data-driven domain allowlist | additive, idempotent |
| `0033_schedule_event_types.sql` | +presentation/town_meeting/inspection enum values | `add value if not exists`; run outside a txn if your editor complains |
| `0034_activity_feed_index.sql` | `activity_logs(created_at desc)` index | additive, idempotent |
| `0035_consolidate_task_notes.sql` | backfill `tasks.notes` → `description` | non-destructive (keeps column), guarded |

## Regression analysis

- **Dashboard:** rebuilt from the same data sources; tiles/buttons link to existing
  lists. The old `getDashboardData()` is now unused (left in place, flagged for the knip
  pass) — no behavior depends on it.
- **My Work / Notifications:** notifications now render in the Inbox via the *same*
  `NotificationsList` + actions; `/notifications` redirects so old links/bookmarks work;
  the bell still shows the unread count. No data change.
- **Nav:** Notifications removed but reachable (redirect + bell); Activity added; General
  Tasks kept reachable.
- **Completion gating:** plain staff (non-PM/Lead) can no longer archive/complete a
  project — intended (item 6). All other status changes unchanged.
- **Calendar:** view is no longer hard-coded — it remembers the user's last choice
  (localStorage); the events list is relabeled but retains full CRUD; new event types are
  additive. Feed/grid unchanged.
- **Notes:** task editing already used `description`; backfill preserves legacy notes
  (column retained), so nothing is lost. Submittal `notes` (a single field) is untouched.
- **Companies:** the allowlist is now data-driven; TDK/M&P sign-in is unaffected.

## Deployment checklist

1. `supabase db push` → `0032` → `0033` → `0034` → `0035` (in order).
2. `npm run typecheck` + `npm run build` green (they are here).
3. No new env vars. Deploy to Vercel after migrations are live.
4. **Rollback:** app reverts with the commit. `0032`/`0033`/`0034` are additive; `0035`
   kept the `notes` column, so it's reversible.

## Verification (live)

- A `@pjosurvey.com` / `@aquariitech.com` user can sign in (lands Read-Only); Settings →
  Companies lists all four with colors.
- Dashboard fits one screen; each tile/button opens the right filtered list; counts match.
- My Work → Inbox lists notifications (mark-read / delete work); Recently Viewed fills in
  after visiting projects/staff/reports; the bell opens the Inbox.
- Calendar opens on Week; presentation/town-meeting/inspection are selectable and colored.
- A non-manager can't archive a project; a PM/Lead/Admin can.
- After `0035`, a task that had notes shows them inside its single Description.

## Recommended next step (not another big sprint)

Apply the migrations, deploy, and **dogfood for a few days** — log every small
annoyance ("three clicks instead of one", "should remember my filter", confusing
wording). Then run a focused **V5.1 Polish Sprint** of 20–30 small usability fixes. At
this maturity those refinements likely beat another feature set.

## V5.1 Polish Sprint candidates (specced, deferred)

- **Global Quick Add** — a single `+` / `N` shortcut to create a Project / Task / General
  Task / Meeting / Note / Report without navigating first. Highest-leverage remaining
  usability win; build it as one launcher that routes to the existing create flows (no
  new data paths).
- **Transitional cleanup (do AFTER the Inbox + new dashboard are proven):** remove the
  Notifications nav entry, and delete the retained `stat-cards.tsx` / `priority-card.tsx` /
  `schedule-health.tsx` plus the unused `getDashboardData`/`DashboardData` (run `npx knip`).
- **Undo consistency:** submittal status-revert and "reopen review" (task undo + project
  restore already exist). State-transition undo only.
- **Standardized status language:** unify the four "state" signals on a project card
  (status · workflow · health · phase) into one visual hierarchy.
- **Shared back-nav hook:** `/projects` already restores filters/sort/scroll
  (`ProjectsToolbar` + `ScrollRestoration`); extend the same pattern to staff/tasks/archive.

## V5.1 / V6

- **V5.1:** drop the `tasks.notes` column (deprecate-then-remove).
- **V6:** universal soft-delete/undo for hard deletes; personal Notes in My Work.
  (Multi-tenant isolation is permanently off — shared pool by decision.)
