# TDK Project Tracker — V3.1 Project Command Center Handoff

Adds an at-a-glance **Project Command Center** above the existing tabs on every
project page. Additive only — no tab, query, or schema was changed. TypeScript +
production build pass.

## What it is
A summary card (+ Upcoming / Recent Activity row) that sits between the project
header and the tab strip, so anyone opening a project understands its health in
~5 seconds without clicking into tabs:

- **Identity:** Company, Client, Municipality, Project Manager, assigned staff.
- **Health badge:** 🟢 Healthy / 🟡 Needs Attention / 🔴 At Risk, with a tooltip listing the reasons.
- **Progress bar:** % complete + current phase ("Phase: Municipal Review · 4 of 9").
- **KPI tiles (clickable → the right tab):** Open, Overdue, Due wk, Done, Submittals, Follow-ups.
- **Quick actions (role-gated):** New task, New submittal (deep-link to the tab), Generate Report. Waiting-on-client / waiting-on-municipality chips when relevant.
- **Upcoming:** next dated tasks + submittals merged and sorted.
- **Recent activity:** last 5 events with a link to full history.

## Health scoring (deterministic + explainable)
`lib/project-health.ts` → `computeProjectMetrics(detail)`:
- **At Risk** if: ≥3 overdue tasks, OR any overdue submittal, OR workflow = urgent_follow_up, OR no activity in >21 days.
- **Needs Attention** if: ≥1 overdue task, OR ≥5 due this week, OR workflow = needs_follow_up/awaiting_response, OR no activity in >14 days.
- **Healthy** otherwise. Archived projects render neutral/healthy.
- `healthReasons[]` powers the tooltip so the color is never a black box.

## Progress (deterministic)
`60% × (completed ÷ countable tasks) + 40% × (current phase position ÷ total phases)`. Completed projects = 100%. Falls back gracefully when a project has only tasks or only phases.

## Data sources (Client / Municipality / metrics)
- Client = first `project_contacts` with `role = 'client'`; Municipality = first with `role = 'municipal_reviewer'` (real fields — nothing invented).
- "Waiting on municipality" = submittals in `submitted`/`awaiting_response`; "waiting on client" = project `workflow_state = 'awaiting_response'`.
- **No "recent report" card** — `generateReadyReport()` is a *global* Ready Report, not project-scoped, so showing one per project would be misleading.

## Files changed
- `lib/project-health.ts` (new) — pure, deterministic metrics helper.
- `components/projects/detail/command-center.tsx` (new) — server component.
- `app/(app)/projects/[id]/page.tsx` — renders `<ProjectCommandCenter>` between header and tabs.

## Database changes
- **None.**

## Performance impact
- **Zero new queries / server actions.** Everything is computed in-memory from the data `getProjectDetail` already returns (tasks, submittals, phases, activity, contacts, staff).
- `/projects/[id]` First Load JS: 211 kB → 212 kB (+~1 kB) — the Command Center is a **server component**, so it ships almost no client JS (only the pre-existing `GenerateReportButton`).
- No new client state.

## Regression analysis
- Purely additive: the existing `ProjectHeader`, `OverviewTab`, and all nine tabs are unchanged and still work.
- Quick actions deliberately **omit Edit/Archive/Assign** (already in the header) to avoid duplicate controls.
- Health/progress are derived from existing rows; if a project has no tasks/phases the helper returns 0%/Healthy without error.
- KPI/Upcoming links use the existing `?tab=` deep-linking the tab strip already supports.

## Verification
- TypeScript: `tsc --noEmit` clean.
- Production build: `next build` clean (Next 15.5.19, 25/25 pages).
- Caveats unchanged: full node path for tooling; Supabase MCP can't reach the TDK DB (`grpfdtomncopqslrwpem`) — couldn't render live, so visuals are described, not screenshotted.

## Next-session backlog
- When a real per-project report list exists, add a "Recent report" tile.
- "New task/submittal" currently deep-links to the tab; opening the create dialog directly (lift tab dialog state or a `?new=task` query the tab honors) would save one more click.
- Optional: surface the same health badge on project cards / the projects list for portfolio-level triage.
- Carried: unsaved-changes guard on dialog forms; icon-button aria-label audit.
