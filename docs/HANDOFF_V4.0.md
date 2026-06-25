# TDK Project Tracker — V4.0 Project Scheduling Engine Handoff

Turns the editable timeline into a lightweight scheduling engine: phase
schedules, a Gantt, milestones + submittals as dated markers, critical-path /
schedule-health, surfaced in the Command Center and a new dashboard section.
Built around ONE pure engine so the logic never forks. TypeScript ✓ · Build ✓.

## Architecture (the important part)
`lib/schedule.ts` → `computeSchedule(project, phases, submittals, milestones)` is
the single source of truth. It's **pure** (no I/O) and returns a complete model:
resolved phase bars, milestone/submittal markers, a date window, deterministic
schedule health + reasons, the next milestone (+ days), overall progress, and the
critical phase. The Gantt, the Command Center, and the dashboard all read from
it, so a project's schedule verdict is identical everywhere.

**Dates without data-entry friction:** phases with explicit `start_date`/`end_date`
use them; phases without are interpolated across `[project.created_at → target
completion]` by position, so the Gantt is useful immediately and sharpens as real
dates are entered (estimated bars render at reduced opacity).

**Deterministic schedule health:** `slipping` if the current phase is past its
end date, a submittal is overdue, progress lags elapsed time by >15 points, or
workflow is urgent. `at_risk` if something is due ≤7 days, a milestone has passed,
or workflow is needs-follow-up/awaiting. Else `on_track`. Every verdict carries a
human-readable reason.

## What was built
- **Phase schedule:** `project_phases` gains `start_date`, `end_date`, `progress`. Editable inline in the Timeline tab's edit mode (PM/Lead) via `setPhaseSchedule`.
- **Timeline view (Gantt):** `schedule-gantt.tsx` — phase bars (completed/current/upcoming, current shows a progress fill), a Today line, milestone diamonds, submittal-due dots, a month axis, a legend, and open tasks grouped beneath the phase whose window contains their due date. CSS-positioned (no chart library).
- **Milestones:** reuse `calendar_events` with `event_type='milestone'` (already creatable per project) — surfaced on the timeline + Command Center. No new table.
- **Submittals:** open submittals with a response-due date appear as dated markers (red if past).
- **Critical path / health** (Command Center): a schedule strip with schedule-health badge (+ reasons tooltip), critical phase, next milestone (+ days), and overall schedule %, linking to the Timeline.
- **Dashboard "Project Schedule Health":** counts of on-schedule / slipping / waiting-municipality / waiting-client / upcoming-milestones, plus short lists of slipping projects (with reason) and upcoming milestones. Aggregated across active projects with the same engine.

## Files changed
- `supabase/migrations/0027_phase_schedule.sql` (new) — additive phase columns.
- `types/database.types.ts` — `ProjectPhaseRow` += `start_date`/`end_date`/`progress`.
- `lib/schedule.ts` (new) — the engine.
- `lib/actions/phases.ts` — `setPhaseSchedule` (PM/Lead-gated via `requireProjectManager`).
- `lib/data/projects.ts` — `getProjectDetail` now returns `milestones`.
- `components/projects/detail/schedule-gantt.tsx` (new); `timeline-tab.tsx` (Gantt + schedule editing, old "Key dates" list replaced); `project-tabs.tsx` (pass milestones); `command-center.tsx` (schedule strip).
- `lib/data/dashboard.ts` — `getScheduleHealth()`; `components/dashboard/schedule-health.tsx` (new); `app/(app)/dashboard/page.tsx` (render).

## Database changes / migration
- `0027_phase_schedule.sql` — `alter table project_phases add column start_date date, end_date date, progress smallint default 0`. Additive + idempotent. **Dependencies intentionally deferred** (critical path is derived from phase end dates + submittals, not a dependency graph) to keep V4 simple.

## Regression analysis
- All schema is additive; existing phases get null dates (→ interpolated) + 0 progress. The Timeline tab keeps its phase add/rename/reorder/delete/set-current behavior; the Gantt sits above it.
- `getProjectDetail` adds one small `calendar_events` query (cached with the detail fetch); the dashboard adds the schedule-health aggregation (3 set-based queries). No existing query changed.
- Command Center, Tasks, Submittals, Review workflow, Staff dashboard untouched except additive wiring. The new schedule strip reuses existing project data + milestones.

## Performance impact
- Project detail: +1 small query (milestones). Dashboard: +4 queries (projects + phases + submittals + milestones) aggregated in memory — fine at office scale; revisit with a view if projects reach the high hundreds.
- Schedule math is pure/in-memory; no client chart library (bundle unchanged materially).

## QA checklist
- [ ] Timeline tab shows a Gantt with phase bars, Today line, milestone/submittal markers, legend, and tasks grouped under phases.
- [ ] In edit mode (PM/Lead), setting a phase's start/end/progress updates the Gantt; bars without dates render lighter (estimated).
- [ ] Command Center shows schedule health, critical phase, next milestone (+ days), schedule %.
- [ ] Dashboard "Project Schedule Health" shows the five counts + slipping/upcoming lists; tiles link sensibly.
- [ ] A project with an overdue current-phase end date or a late submittal reads "Slipping" with a reason.
- [ ] No regression on dashboard, command center, tasks, submittals, review workflow.

## Deployment checklist
1. Apply `0027_phase_schedule.sql` to the TDK DB (`grpfdtomncopqslrwpem`). Verify `project_phases` has `start_date`/`end_date`/`progress`.
2. Commit + push → Vercel deploys.
3. Smoke-test the QA checklist on one project (set phase dates + add a milestone calendar event).

## Five highest-impact improvements before this is "complete"
1. **Phase dependencies + auto-shift** — let a phase depend on another so moving one cascades. The column is deferred; this is the natural V4.1.
2. **Drag-to-edit the Gantt** — drag bar edges to set start/end instead of date inputs; the single biggest UX upgrade for the schedule.
3. **Milestone management on the timeline** — add/complete milestones inline (today they're created via the calendar); add a "done" flag so "overdue milestone" is precise.
4. **Baseline vs actual** — snapshot a baseline schedule to visualize slippage over time (what PMs report to clients).
5. **Email/digest for schedule slippage** — once the Resend domain is verified, alert PMs/Leads when a project tips into "Slipping".

## Caveats unchanged
Full node path for tooling; Supabase MCP can't reach the TDK DB.
