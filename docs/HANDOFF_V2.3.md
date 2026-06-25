# TDK Project Tracker — V2.3 Stabilization & Polish Handoff

For the next Claude session. This documents the V2.3 sprint: every priority was
**verified against the actual code first**, then fixed. TypeScript and the
production build both pass.

## TL;DR

- **No database changes this sprint. No migration required.** (0023 is already applied in prod.)
- Several "bugs" in the brief were already fixed in V2.2 and verified still-correct here (P1 wiring, P2 sync, P5 start date). The real remaining work was: surfacing a silent failure (P1), making the **dashboard** read the timeline phase (P2), dashboard rail/accent polish (P6), and scroll restoration (P7).
- P3 (nav) and P4 (back button) were fixed in the prior batch (commit `ca5b2f3`) and re-verified; root causes documented below.

## Environment / build (unchanged, important)

- npm shim is broken locally — run tools via the full node path:
  - Typecheck: `& "C:\Program Files\nodejs\node.exe" node_modules/typescript/bin/tsc --noEmit`
  - Build: `& "C:\Program Files\nodejs\node.exe" node_modules/next/dist/bin/next build`
- **The Supabase MCP in this workspace cannot reach the TDK database.** TDK is project ref `grpfdtomncopqslrwpem`; the MCP is scoped to a different org (a fishing app + a finance app). Apply migrations via the TDK project's SQL editor, or re-scope the MCP token. Do **not** run TDK migrations against `fish-prophet-dev`.

---

## Root-cause analysis & fixes, per priority

### P1 — Project editing / staff assignment  ✅ verified + hardened
- **Verified correct:** `updateProject` already persists Assigned Staff through the single shared `syncProjectStaff()` (also used by `createProject` and `setProjectStaff`). PM is always force-included; existing staff are never dropped. This is the V2.2 fix and it is present and correct (`lib/actions/projects.ts`).
- **Real root cause if it still fails in prod:** RLS `project_staff_write` (`0012_rls.sql`) requires `rank ≥ 30` **or** (`rank ≥ 20` **and** `is_project_member(project_id)`). `updateProject` only requires `requireEditor` (rank ≥ 20). A staff-rank editor who is **not** a member of the project (or whose user has no linked `staff_id`, so `current_staff_id()` is null) has the `project_staff` write **silently rejected** — and the old code swallowed the error and returned success.
- **Fix:** `syncProjectStaff` now checks the insert/delete results and throws on error, so the action returns a real failure (toast) instead of a false success.
- **If a PM/admin still can't save staff:** confirm their `users → staff` link exists. Admins (rank ≥ 30) bypass the membership check, so for them it should always work. If you want rank-20 staff to manage *any* project's staff, that's an **additive RLS policy change** (permissions decision — not done here).
- **PM auto-assign / no duplicates / no drops / instant UI:** all satisfied — `syncProjectStaff` adds the PM to the desired set (no dup, reconciles), and `revalidatePath` + the form's `router.refresh()` refresh the UI.

### P2 — Timeline as single source of truth  ✅ closed the last gap
- **Verified:** `project_phases` + `syncCurrentPhaseName` drive `projects.current_phase_name` on add/rename/reorder/delete/set-current (`lib/actions/phases.ts`). Header dropdown, project cards, and project list rows already read `current_phase_name` with an enum fallback.
- **Gap found & fixed:** the dashboard's "Waiting on Others" widget read from `v_awaiting_response_projects`, a `select p.*` view created **before** `current_phase_name` existed, so it showed the legacy enum. Recreating the view was rejected on purpose — prod's copy carries a manual `active`/`on_hold` rule we must not clobber.
- **Fix (no schema change):** `getDashboardData` now backfills `current_phase_name` for the awaiting rows from the base `projects` table via one keyed lookup. No view touched.

### P3 — Navigation polish  ✅ done in `ca5b2f3`, re-verified
- `getProjectDetail` wrapped in React `cache()` — the detail route's `generateMetadata` + page body no longer double-fetch (~10 queries were running twice).
- `experimental.staleTimes` (`dynamic: 30`, `static: 180`) in `next.config.mjs` — returning to `/projects` within 30s reuses the client Router Cache instead of a full server re-render. Mutations still call `router.refresh()`, which busts it, so edits stay fresh.
- `<Link>` prefetch is on by default; no `router.back()` anywhere (Back is a real `<Link>`).
- **Did NOT** blanket-remove `router.refresh()` — each runs after a mutation and is *more* necessary now that segments are cached.

### P4 — Back button "multiple clicks"  ✅ root cause found, guard in place
- **Root cause:** Radix modal primitives (`Dialog`/`DropdownMenu`/`Select`) set `pointer-events: none` on `<body>` while open (via `react-remove-scroll`) and restore it on close. When one modal closes while another opens — or closes during a navigation — the restore can race and the style stays stuck, swallowing the next click anywhere (the "click twice" symptom).
- **Concrete trigger in this codebase:** `components/projects/detail/tasks-tab.tsx` hands off from `TaskDetailDialog` straight into the edit `Dialog` (`onEdit` → `setEditing`) — one modal closing as another opens.
- **Fix:** `components/layout/pointer-events-guard.tsx` (mounted in `AppShell`) clears the stuck style on route change and on `pointerdown` (capture phase) — but only when no Radix layer is actually open, so it never breaks a live modal. Clearing on `pointerdown` lets the *same* click land instead of needing a second.
- **Note:** can't be reproduced headlessly here (OAuth-gated). If it ever recurs, the next lever is delaying the dialog→dialog handoff by a tick, or upgrading Radix.

### P5 — Task start date  ✅ already complete, verified
- `start_date` is wired through `validators`, `tasks` + `general-tasks` actions, both data selects, and all three forms (project task, general task, staff create-task). Recurrence shifts start+due together (`lib/tasks-shared.ts` `maybeCreateRecurrence`). Optional/nullable, so existing tasks are unaffected. **No work needed.**

### P6 — Dashboard polish  ✅ done
- Rail palette already matched spec (`lib/status-rail.ts`): overdue `#ef4444` red, needs-attention `#f97316` orange, waiting `#2563eb` blue.
- "Needs Attention" card accent changed `yellow` → `orange`.
- Added a colored **left accent rail** (`border-l-4`) to `WidgetCard` (per accent) and to `PriorityCard` populated states (overdue red / today orange / week blue) for a consistent "desktop app" look.
- "Waiting on Others" rows now force the blue `waiting` rail (`ProjectRowItem railState="waiting"`) so the widget is uniformly blue regardless of each project's own state.
- Card spacing/padding/typography/icon sizes were already consistent across `WidgetCard`/`PriorityCard` — left as-is (no redesign).

### P7 — Project list restoration  ✅ done
- Filters/search/company/status/sort were already restored: the project Back link rebuilds the last `/projects` query from `sessionStorage` (`PROJECTS_QUERY_KEY`, set by the toolbar; consumed by `project-header.tsx`).
- **Added scroll position:** `components/shared/scroll-restoration.tsx` saves `window.scrollY` (debounced) keyed by full URL and restores it on return, mounted on the projects page. Best-effort (retries briefly while streamed content settles).

### P8 — QA sweep
- **Dead code / unnecessary queries (fixed):** `getDashboardData` fetched `recentProjects`, `workload`, `activity`, and `upcoming` but the dashboard page renders none of them — 4 dead queries (incl. the `v_staff_workload` and `v_calendar_feed` views) on every load. Removed. Net dashboard query change: **−4 removed, +1 small enrichment = −3 per load.**
- **Silent failures (fixed):** `syncProjectStaff` swallowed write errors (P1).
- **Loading / disable-on-save / duplicate clicks:** every form uses the `pending` pattern (`disabled={pending}` + `Loader2` spinner) — consistent. Page loads use the `(app)/loading.tsx` skeleton.
- **Dialogs / keyboard / outside-click / focus trap:** handled by Radix defaults across the app.
- **Still open (not addressed — flagged):**
  - No "unsaved changes" warning on any form (no dirty-tracking / `beforeunload`). Product decision.
  - `setProjectPhase` (legacy enum setter) in `lib/actions/projects.ts` is now unused — safe to delete later.
  - General tasks still excluded from the calendar feed (`v_calendar_feed` inner-joins projects); My Work links a general task to `#`. Pre-existing.

---

## Files changed this sprint (8)

Modified:
- `lib/actions/projects.ts` — P1: `syncProjectStaff` surfaces write errors.
- `lib/data/dashboard.ts` — P2: backfill `current_phase_name` for awaiting rows; removed 4 unused queries + their interface fields/imports.
- `app/(app)/dashboard/page.tsx` — P6: Needs Attention accent `orange`; awaiting rows `railState="waiting"`.
- `components/dashboard/widget-card.tsx` — P6: left accent rails per accent.
- `components/dashboard/priority-card.tsx` — P6: left accent rails on populated states.
- `components/dashboard/rows.tsx` — P6: optional `railState` on `ProjectRowItem`.
- `app/(app)/projects/page.tsx` — P7: mount `ScrollRestoration`.

New:
- `components/shared/scroll-restoration.tsx` — P7.

(Prior batch `ca5b2f3`, already deployed: `next.config.mjs` staleTimes, `lib/data/projects.ts` cache, `components/layout/pointer-events-guard.tsx`, `app-shell.tsx`, `projects-toolbar.tsx`, `project-header.tsx`.)

## Database changes / migration requirements
- **None.** No schema changes, no new migration. Fully additive/code-only.

## Regression analysis
- **Dashboard dead-query removal:** removed fetches weren't rendered → no output change. Build passes (no consumers). If those widgets were planned, the fields are trivially re-addable.
- **P1 error surfacing:** a `project_staff` write that previously *appeared* to succeed but was RLS-blocked will now show an error toast. This is correct (it never actually saved); no functional regression.
- **P6 rails:** `border-l-4` widens the left border 1px→4px — a few px visual shift, no layout break.
- **P2 enrichment:** one extra keyed query only when the awaiting widget is non-empty; net fewer dashboard queries.
- **P7 scroll restore:** best-effort; on uncached (>30s) loads the scroll may land slightly off. No functional impact.

## Performance improvements
- Dashboard: **−3 net queries** per load (removed `recentProjects`, `v_staff_workload`, `activity_logs`, `v_calendar_feed`; added 1 small phase lookup).
- (Prior batch, deployed) `getProjectDetail` deduped (halves detail-page DB work); `staleTimes` warm Router Cache for back-navigation.

## Production deployment checklist
1. **No migration to apply.**
2. Commit + push the 8 files → Vercel auto-deploys.
3. Smoke-check after deploy:
   - Dashboard: "Needs Attention" = orange rail, "Waiting on Others" = blue rail + shows the **timeline** phase (not enum), "Overdue" = red.
   - Edit a project's Assigned Staff as a PM/admin → saves. If it now shows an **error toast**, that's the RLS path — fix by ensuring the editor is rank ≥ 30 or a project member (or relax `project_staff_write`).
   - Open a project, click Back → returns to the same filters + scroll position.
4. Confirm: **TypeScript passes ✅**, **Production build passes ✅** (verified locally, Next 15.5.19, 25/25 pages).

## What the next Claude should pick up
- Optional: add an "unsaved changes" warning hook to the dialog forms (P8 gap).
- Optional: delete the unused `setProjectPhase` legacy action.
- Optional: include general tasks in the calendar feed (recreate `v_calendar_feed` with a left join) — needs a migration; coordinate with the MCP-access caveat above.
- If staff assignment errors in prod: decide the `project_staff_write` RLS policy (keep PM+ gate, or allow rank-20 broadly) — additive migration.
