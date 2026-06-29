# TDK Project Tracker — V4.3 Product Direction Changes Handoff

Intentional simplification toward how a civil-engineering office actually works.
TypeScript ✓ · Production build ✓ · **No DB changes / no migration.** All changes
flow through the existing single schedule engine (`lib/schedule.ts`).

## 1 — Sidebar order  (DONE)
`components/layout/nav.ts` reordered: Dashboard, My Work, Active Projects,
**Calendar, Archive,** General Tasks, Staff, Notifications, Settings.

## 2 — Project Health redesign → On Schedule / Slipping / Behind  (DONE)
The schedule engine's health is now three states with clear, deterministic
definitions (`lib/schedule.ts`):
- **Behind** (already late): current phase past its end date, target completion date exceeded, ≥3 overdue tasks, or any overdue submittal.
- **Slipping** (early warning): ≥1 overdue task, a critical (high/urgent) task overdue, progress lagging the elapsed schedule, an upcoming deadline at risk with low progress, or workflow needs/urgent follow-up.
- **On Schedule** otherwise.

To do this the engine now also takes **tasks** (it previously only saw phases +
submittals), so overdue/critical-task signals are real. Every reason is surfaced
in a tooltip.

**Waiting removed from Project Health** — the dashboard already has the excellent
"Waiting on Others" widget, so the health section no longer duplicates it. The
dashboard "Project Schedule Health" card now shows exactly three metrics:
**On schedule · Slipping · Behind** (`getScheduleHealth` + `schedule-health.tsx`),
with short "Behind" and "Slipping" project lists.

## 3 — Health cards are now filtered pages  (DONE)
Each tile links to `/projects?health=on_track|slipping|behind` — the Active
Projects page filters by the computed schedule verdict (same engine), exactly
like Overdue / Due Today / Due This Week open a filtered view. Implemented as a
`health` filter on `getProjects` (computes per-project health for the result set,
only when the param is present — 3 extra grouped queries in that case).

## 4 — Gantt is now optional  (DONE)
The Timeline (editable phases) is the default. The Gantt no longer renders
automatically; a **"Generate Gantt Chart"** button reveals it on demand
(`timeline-tab.tsx`). "Generate" reuses the engine, which already estimates
missing durations and infers dates from the project start + target while
**preserving any manually entered phase dates** (estimated bars render lighter).
It's a planning aid, not required.

## 5 — Milestones removed from the scheduling engine  (DONE)
The schedule now revolves around **Phases → Tasks → Submittals**. Removed:
- `ScheduleMilestone`, milestone markers, `nextMilestone`/`daysUntilNextMilestone` from `computeSchedule`.
- The milestone fetch + `milestones` field from `getProjectDetail` (one fewer query).
- Milestone diamonds + legend from the Gantt.
- "Upcoming milestones" dashboard metric.
- Command Center "Next milestone" → **"Next submittal"** (`nextSubmittal`).

**Note:** the `calendar_events` `milestone` event type still exists and still
appears on the `/calendar` page — only the *scheduling engine* concept was
removed, per the directive. Nothing was dropped from the database.

## 6 — Design philosophy
Applied throughout: consolidated to one schedule engine, removed a duplicate
concept (milestones), removed a duplicate metric (waiting), and made the heavy
Gantt opt-in. No enterprise-for-its-own-sake features added.

## Files changed
`components/layout/nav.ts`, `lib/schedule.ts`, `lib/data/projects.ts`
(getProjectDetail milestones removed + getProjects health filter),
`components/projects/detail/{timeline-tab,project-tabs,schedule-gantt,command-center}.tsx`,
`lib/data/dashboard.ts` (getScheduleHealth), `components/dashboard/schedule-health.tsx`,
`app/(app)/projects/page.tsx`.

## Database changes / migrations
- **None.** Pure code/product changes. The `milestone` calendar event type and all data are untouched.

## Deployment order
1. Commit + push → Vercel. No migration, no env change.

## Rollback plan
- Revert the commit and redeploy. No schema to unwind. The schedule-engine change is contained to `lib/schedule.ts` + its consumers; reverting restores the previous health model.

## Regression review
- Health states changed (`at_risk` removed, `behind` added). Typecheck confirms **no** stale `at_risk`/`nextMilestone`/`detail.milestones` references remain across the app.
- `computeSchedule` signature gained a `tasks` arg; all four call sites updated (timeline, command center, dashboard aggregation, projects health filter).
- `getProjectDetail` makes one fewer query (milestones dropped). `getScheduleHealth` swapped its milestone query for a tasks query (same count). The health filter on `getProjects` adds queries only when `?health=` is set.
- Calendar, reviews, leadership, notifications, staff, reports untouched.

## Concerns / open (carried)
- Verified by code + build, not a live DB (MCP can't reach `grpfdtomncopqslrwpem`); confirm the dashboard health counts + `/projects?health=behind` after deploy.
- Still awaiting your input from prior sprints: **company domains/keys/colors** (PJO Surveying, Aquarii Lighting) for full multi-company support; and which specific surface you want de-colored (P2 of V4.2).
- Optional follow-ups: command-palette task search + general tasks in reports (flagged in V4.2).

## Caveats unchanged
Full node path for tooling; MCP can't reach the TDK DB.
