# TDK Project Tracker — V4.2 Workflow & UI Refinement Handoff

Read the existing implementation first. TypeScript ✓ · Production build ✓.
One additive migration (calendar view). P4 (Companies) is **blocked pending info**
— details below.

## P3 — Weekly calendar → real agenda  (DONE)
**What it actually was:** `CalendarView` already had month/week/agenda modes; the
"week" view was a cramped 7-column chip grid from `v_calendar_feed`. Two real
problems: (a) the week grid wasn't a readable agenda, and (b) the feed's task
branch used an **inner** join to projects, so **general tasks never appeared on
the calendar** (this is also P5).

**Fix:**
- `supabase/migrations/0028_calendar_feed_general_tasks.sql` — recreate `v_calendar_feed` with `left join projects` on the Tasks branch so project-less general tasks are included (null project columns). Every other branch identical. `create or replace`, idempotent, no data change. ("Review requests" = in-review tasks are already in the feed — they're non-completed tasks with due dates.)
- `components/calendar/calendar-view.tsx` — the **week** mode is now a day-by-day **agenda**: each day is a section listing its items (tasks, general tasks, submittals, milestones, in-review/review-request tasks) as readable rows with a Today marker, instead of the chip grid. Month + Agenda modes unchanged. General-task links now go to `/tasks` instead of dead `#`.

## P5 — General tasks parity  (mostly DONE)
- **Calendar:** fixed — general tasks now appear (migration above).
- **My Work / dashboard rows:** `components/dashboard/rows.tsx` — general-task rows linked to dead `#`; now link to `/tasks`. (General tasks already flow into My Work + due buckets + notifications via `notifyGeneralTaskAssigned`, which now also benefits from the V4.1 recipient fix.)
- **Still inconsistent (flagged, not yet done):** the **Command Palette** (⌘K) searches projects + staff but **not tasks** — so general (and project) tasks aren't findable there. And the **Ready Report** is project-scoped, so general tasks don't appear in reports. Both are additive enhancements; say the word and I'll add task search to the palette (one extra query) and a general-tasks section to the report.

## P6 — UX workflow audit
Traced each workflow; current state:
- **Create/Edit Project, Archive, Create/Complete Task, Send-for-Review, Approve, Reject, Undo Complete, Timeline editing, Notifications, Reports, Calendar, Command Palette** — all function correctly against the existing architecture.
- Issues found + fixed this sprint: general tasks missing from calendar (P3/P5), dead `#` links for general tasks (P5).
- Issues found, deferred (need your input or are enhancements): command-palette task search (P5), general tasks in reports (P5), "reduce color" direction (P2, below), companies (P4).
- No correctness/permission defects found in the review or scheduling workflows (verified in V4.1 / V4.0).

## P1 / P2 — UI polish & dashboard color
- **Light-mode card separation** was addressed in V4.1 (`app-shell` page background `bg-muted/30 → /50`); the compact Staff rows (V4.1) and the new weekly agenda also cut visual noise.
- **"Reduce unnecessary color" — needs your direction, not a blind change.** The current palette already mostly follows your stated rule (gray=normal, blue=waiting, yellow/orange=needs attention, red=overdue) — e.g. the dashboard status rails and KPI tones encode status, not decoration. The pieces that read as "colorful" (the Priority-Focus card accents, the status rails) are the ones you explicitly asked for in V2.2/V2.3. I won't strip approved work blind. Point me at the specific surface(s) that feel over-designed and I'll neutralize exactly those.

## P4 — Companies (PJO Surveying, Aquarii Lighting): **BLOCKED — need info**
The signup trigger `handle_new_user` and the `ALLOWED_DOMAINS` constant **hard-code**
the permitted email domains, and badges/branding need per-company values. Before I
touch anything I need, for **each** company:
1. **Email domain** — e.g. `pjosurveying.com`, `aquariilighting.com` (required: OAuth sign-in is rejected for unknown domains, and company auto-assignment keys off it).
2. **Short badge key** — e.g. `PJO`, `AQ` (used by `formatCompanyTag`).
3. **Badge color** — hex (e.g. `#0ea5e9`) for `companies.color`.

With those three per company it's a single additive migration (insert `companies`
rows + extend the `handle_new_user` domain allowlist) + an `ALLOWED_DOMAINS` update.
Filters, dashboard, project creation, the company selector, and reports are all
data-driven via `getCompanies` and pick up the new companies automatically — no
further wiring. I'll implement it immediately once you send those values.

## Files changed
- `supabase/migrations/0028_calendar_feed_general_tasks.sql` (new)
- `components/calendar/calendar-view.tsx` (week agenda + links)
- `components/dashboard/rows.tsx` (general-task links)

## Database changes / migration
- `0028` — `create or replace view v_calendar_feed` (inner→left join on tasks). Additive, idempotent, no data change, `security_invoker` preserved. Only consumer is the calendar feed (`useCalendarFeed`).

## Deployment order
1. Apply `0028_calendar_feed_general_tasks.sql` to the TDK DB.
2. Commit + push → Vercel.
(Order matters only in that the view should exist before the new week agenda relies on general-task rows; the UI degrades gracefully if applied after.)

## Rollback plan
- Code: revert the commit and redeploy.
- View: re-apply the 0014 definition of `v_calendar_feed` (inner join) — it's a `create or replace`, fully reversible, no data involved.

## Regression review
- `v_calendar_feed` gains rows (general tasks) but its columns/types are unchanged, so `CalendarFeedRow` and `useCalendarFeed` are unaffected; month/agenda views simply show a few more items. The week view changed presentation only (same data). My Work/dashboard link change is href-only. No schema columns, no actions, no permissions touched.

## Concerns
- The calendar feed change is verified by code + build, not a live query (MCP can't reach the TDK DB). After applying 0028, confirm a general task with a due date shows on the calendar.
- P4/P2/P5-palette/P5-reports await your input above.

## Caveats unchanged
Full node path for tooling; MCP can't reach the TDK DB (`grpfdtomncopqslrwpem`).
