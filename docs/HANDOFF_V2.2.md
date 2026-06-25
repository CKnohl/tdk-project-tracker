# TDK Project Tracker — Handoff (after the V2.2 sprint)

> For the next Claude session. Read this first; it captures everything needed to continue with zero lost context.

## Current architecture
- **Framework:** Next.js 15 (App Router, RSC + server actions), TypeScript, Tailwind + shadcn/ui. Deployed on **Vercel**.
- **Database:** Supabase Postgres. Types are **hand-authored** in `types/database.types.ts` (no codegen — update them by hand when schema changes). RLS on all tables; helper fns `is_admin()`, `has_min_rank()`, `is_project_member()`, `current_staff_id()` from migration 0011. Table grants from 0017.
- **Auth:** Microsoft (Azure) OAuth via Supabase. `/auth/callback` only exchanges the code + checks the email domain; the DB trigger `on_auth_user_created → handle_new_user()` creates the `public.users` row and assigns the role. Roles: admin(40) / project_manager(30) / staff(20) / read_only(10).
- **Notifications:** in-app `notifications` table + per-user `notification_preferences`. Fan-out in `lib/notify.ts` (service-role). Email via Resend (`lib/email.ts`) — **currently paused** (domain not DNS-verified); in-app works. Daily Ready Report cron at `/api/cron/daily-report`; AI exec summary via OpenAI (`lib/ai.ts`, optional, graceful fallback).
- **Timeline system (P4 — now single source of truth):** `project_phases` table is authoritative for a project's phases and its current phase. `projects.current_phase_name` is a **denormalized cache** of the current phase name, kept in sync by `lib/actions/phases.ts` (`syncCurrentPhaseName`). The legacy `projects.phase` enum is kept only for `createProject` seeding + as a display fallback. Phase edits are **PM+ only** (`requireManager` + RLS).
- **General Tasks:** project-less tasks (`tasks.project_id` nullable). Page `/tasks`, actions in `lib/actions/general-tasks.ts`, data in `lib/data/general-tasks.ts`. Recurrence + start date supported.
- **Staff workflow:** `/staff/[id]` workload center. `getStaffWorkloadDetail` (read), `lib/actions/workload.ts` (assign/reassign/remove + add/remove project). **Create Task** and **Assign Task** dialogs both present (manager-gated).

## Features completed THIS session (V2.2)
1. **P1 Project navigation** — verified already correct: `project-header.tsx` uses explicit `<Link href="/projects">` (no browser history). No change.
2. **P2 Project staff assignment fixed** — root cause: `updateProject` never synced `project_staff`, so the Edit Project form's Assigned Staff silently didn't save. Introduced ONE shared `syncProjectStaff()` in `lib/actions/projects.ts` used by `createProject`, `updateProject`, and `setProjectStaff`. Single source of truth.
3. **P3 PM auto-assigned as staff** — `syncProjectStaff` always includes the project's `project_manager_id` in the assigned set (never duplicates, never drops others). Fires wherever PM changes (create/update).
4. **P4 Timeline single source of truth** — added `projects.current_phase_name` (denormalized); phase actions keep it in sync; the header phase dropdown now lists `project_phases` and calls `setCurrentPhase` (same as Timeline); header badge, project cards, and project list rows display the current phase name. The Edit-Project form's enum Phase field is hidden on edit (shown on create as "Starting Phase").
5. **P5 Start Date** — additive `tasks.start_date date` (optional). Added to validators (`taskSchema`, `generalTaskSchema`), all four task actions, both task selects, and all task forms (project, general, staff Create Task). Recurring tasks shift `start_date` alongside `due_date`.
6. **UX — Completed tasks** (already shipped in V2.1, verified): strikethrough + hidden priority/due; originals preserved (never nulled); reopening restores everything.
7. **UX — Project links** — verified project names are already clickable across dashboard rows, due page, staff tasks/projects cards, search, notifications. No change needed.

## Exactly which files changed (uncommitted working tree)
**Modified (19):**
`app/(app)/projects/[id]/page.tsx` (pass phases to header), `components/dashboard/rows.tsx` (current phase label), `components/projects/detail/project-header.tsx` (phase dropdown → project_phases), `components/projects/project-card.tsx` (current phase label), `components/projects/project-form.tsx` (hide Phase on edit), `components/projects/task-form.tsx` (start date), `components/staff/create-task-dialog.tsx` (start date), `components/tasks/general-task-form.tsx` (start date), `lib/actions/general-tasks.ts` (start date), `lib/actions/phases.ts` (current_phase_name sync + broader revalidate + PM+), `lib/actions/projects.ts` (syncProjectStaff: P2+P3+P4 seed), `lib/actions/tasks.ts` (start date), `lib/data/dashboard.ts` (NOTE: current_phase_name deliberately NOT added — view-safe), `lib/data/general-tasks.ts` (start date select), `lib/data/my-work.ts` (current_phase_name select), `lib/data/projects.ts` (current_phase_name + start date selects), `lib/tasks-shared.ts` (recurrence shifts start date), `lib/validators.ts` (start date), `types/database.types.ts` (TaskRow.start_date, ProjectRow.current_phase_name).

**New (1):** `supabase/migrations/0023_start_date_and_current_phase.sql`.

## Migrations added
- **0023_start_date_and_current_phase.sql** — `alter table tasks add column if not exists start_date date;` + `alter table projects add column if not exists current_phase_name text;` + backfill `current_phase_name` from the current `project_phases` row. **Additive, idempotent.**

## Database changes
- New columns only: `tasks.start_date`, `projects.current_phase_name`. No drops/renames/type changes. No view changes (intentionally — see Known issues).

## Environment variable changes
- **None this session.** Existing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `OPENAI_API_KEY` (+ optional `OPENAI_MODEL`).

## What still needs deployment / manual production steps
1. **Apply migration 0023** to production (SQL editor or `supabase db push`). It's additive + idempotent.
2. **Confirm earlier migrations are applied:** 0019 (read-only default), 0020 (reports bucket), 0021 (✅ applied — task visibility works), 0022 (project_phases). The migration-history table historically lags actual state (some were applied manually), so verify by checking columns/tables, not just history.
3. **Commit + push** the 20 working-tree files to `main` → Vercel auto-deploys.
4. Resend domain DNS verification is still the gate for email delivery (unrelated to this sprint).

## Known bugs / limitations remaining
- **Phase name on two dashboard widgets:** "Waiting on Others" and "Needs Attention" rows show the **enum** phase label, not the custom `current_phase_name`. Reason: they read from views `v_awaiting_response_projects` / `v_follow_up_needed`, which are `select p.*` views that do NOT expose newer columns. We intentionally did **not** recreate those views because production's `v_awaiting_response_projects` reportedly carries a manual `status IN ('active','on_hold')` "Waiting on Others" fix that must be preserved. **Next step (if desired):** recreate both views to include `current_phase_name`, carefully preserving the active+on-hold rule. Everywhere else (cards, list, header, detail) shows the custom name correctly.
- **General tasks not on Calendar** — `v_calendar_feed` inner-joins projects; project-less tasks are excluded. They appear on dashboard due buckets + workload.
- **My Work `TaskRow`** links a general task to `#` (component assumes a project).
- **Start Date is captured/stored/shown in forms only** — not yet surfaced on dashboard/cards/timeline (the spec said "later"). Good next task.
- `lib/actions/projects.ts` still exports `setProjectPhase` (legacy enum setter) — now unused; safe to remove later.

## UI polish ideas remaining
- Surface Start Date on task rows / dashboard (e.g., "starts in 3 days" / gray out not-yet-started tasks).
- Recreate the two views to unify phase-name display (above).
- Unify count-badge styling across KPI vs widget cards.
- Optional: color the timeline "current phase" badge by a per-phase color instead of neutral slate.

## Git status
- **Branch:** `main`.
- **Uncommitted:** 19 modified + 1 new migration (the entire V2.2 sprint). Nothing committed yet this session.
- **Latest commits:** `3a0fb88 V2.1 UX improvements…`, `d17ed52 Fix Priority Focus View All…`, `a56d0e7 Version 2 release`.
- **Production vs local:** production is **behind** local — it has V2.1 (through `3a0fb88`) but none of the V2.2 work above. Deploy = apply 0023 + push these files.

## What the next Claude must know before writing code
- **Build/typecheck:** the project's `npm` shim is broken locally (a vendored npm was pruned). Run tools via full node path: `& "C:\Program Files\nodejs\node.exe" node_modules/typescript/bin/tsc --noEmit` and `… node_modules/next/dist/bin/next build`. Vercel is unaffected.
- **Types are hand-authored** — edit `types/database.types.ts` whenever you touch the schema.
- **`select p.*` views don't gain new columns** — when adding a projects column that dashboard widgets need, either recreate the relevant view OR keep it out of any select used against a view (see `lib/data/dashboard.ts` note).
- **One source of truth, already established:** project staff → `syncProjectStaff`; task assignment/recurrence → `lib/tasks-shared.ts`; phases/current phase → `project_phases` + `syncCurrentPhaseName`. Extend these, don't fork them.
- Phase edits are PM+ (`requireManager`); most task/project edits are `requireEditor` (staff+). RLS mirrors this.
- Don't touch `v_awaiting_response_projects`'s status filter without confirming the production active+on-hold rule.
