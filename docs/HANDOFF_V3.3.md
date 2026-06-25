# TDK Project Tracker — V3.3 Office Workflow & Productivity Handoff

Daily-workflow improvements. Implemented the bounded, high-value items (P1, P2,
P4) and audited the broad "review everything" items (P5–P9). #3 (Companies) is
held pending the email domains. TypeScript ✓ · Production build ✓ · No DB changes.

## Implemented

### P1 — Project sorting + remembered selection
- **Root cause:** sort existed but lacked descending-number / oldest options and didn't persist across fresh visits.
- `lib/data/projects.ts`: `ProjectFilters.sort` + query handle `number_desc` and `oldest`.
- `components/projects/projects-toolbar.tsx`: dropdown now offers the five spec options (Recently updated, Oldest updated, Project # ascending/descending, Project name); the last choice is saved to `localStorage` (`tdk-projects-sort`) and re-applied on a fresh `/projects` visit when the URL has no `sort`. (Back-navigation already restores the exact query via the V2.2 sessionStorage key.)

### P4 — Review queue inline quick approve/reject
- **Root cause:** the My Work review queue only linked out; reviewers had to open the project to act.
- `components/dashboard/review-queue.tsx` is now a client component with per-row **Approve** (confetti) and **Reject** (required-comment dialog), reusing the Phase B `approveTask` / `rejectTask` actions. Each row shows task, project, submitted-by, submitted-date, days-waiting, and priority. General tasks (no project) show no quick actions (review is project-scoped).

### P2 — Staff management dashboard
- **Root cause:** the Staff page was a flat list (open tasks + project count only).
- `lib/data/staff.ts` → `getStaffDashboard()`: a handful of set-based reads aggregated in memory (no per-staff fan-out, no new view) producing per-person: active projects, general tasks, **review queue** (in_review tasks on projects they PM or lead), workload (open tasks), overdue, due-this-week, **completion rate**, and **leadership roles** (PM ×N / Lead ×M).
- `components/staff/staff-dashboard.tsx` (new): client cards with **search**, **sort** (name/workload/overdue/review/completion), and **filters** (all / has-overdue / awaiting-review / leadership).
- `app/(app)/staff/page.tsx`: renders the dashboard. Removed the now-dead `getStaffWithWorkload()` (P9 cleanup).

## Audited (P5–P9) — findings

- **P5 Notifications:** reviewed `lib/notify.ts` end-to-end. No duplicate fan-out (direct-complete uses `notifyTaskCompleted`, approval uses `notifyTaskApproved` — never both); timestamps render via `formatRelative`, now Eastern (V3.2 timezone fix); icons/labels consistent (the 3 review types were added in Phase B). No change needed.
- **P6 Search:** ⌘K palette (keyboard-driven), projects search (debounced→URL), staff search (instant client). Consistent and appropriate per context. **Gap:** no match highlighting anywhere → recommendation #8.
- **P7 Tables:** the app is card-list-first; the few real tables (settings/users, staff manager) are consistent. Broad standardization deferred → recommendation.
- **P8 Navigation:** filters/sort/search/scroll restoration already shipped (V2.2 back-link query restore, V2.3 scroll restore, P1 sort persistence). In good shape.
- **P9 Performance:** removed dead code (`getStaffWithWorkload`). No new duplicate queries; `getProjectDetail` cached; dashboard dead queries already trimmed (V2.3). **Watch:** `getStaffDashboard` reads all `task_staff` rows — fine at office scale, revisit with a view/cache at hundreds of projects → recommendation #9.

## Held
- **P3 Companies (Aquarii, PJO):** not started — waiting on the email domains you'll provide. When ready: insert `companies` rows + add domains to `ALLOWED_DOMAINS` and the `handle_new_user` mapping; filters/dashboard/creation/reports are already data-driven and will pick them up automatically. (Additive migration + auth update.)

## Files changed
`lib/data/projects.ts`, `components/projects/projects-toolbar.tsx`, `components/dashboard/review-queue.tsx`, `lib/data/staff.ts`, `components/staff/staff-dashboard.tsx` (new), `app/(app)/staff/page.tsx`.

## Database changes / migrations
- **None.**

## Regression analysis
- Sorting is additive; existing `?sort=` URLs and the Back-link restore still work; `target` sort is kept in the query layer for any stale URL even though it left the dropdown.
- The review queue keeps the same data shape (`ReviewQueueItem`); only presentation + actions changed. Approve/reject reuse audited Phase B actions and their permission checks.
- The Staff page replaced its body but kept the same route and the per-staff detail page (`/staff/[id]`) untouched. Metrics are read-only aggregation; no writes.
- Removing `getStaffWithWorkload` is safe (verified it had no other callers).

## QA checklist
- [ ] Projects sort offers the 5 options; changing it re-orders the list; leaving and returning to `/projects` keeps the chosen sort.
- [ ] Review queue Approve completes + confetti + notifies assignee; Reject requires a comment, restores prior status, notifies assignee.
- [ ] Staff cards show all 8 metrics; search/sort/filter work; cards link to `/staff/[id]`.
- [ ] Dashboard, command center, notifications, timeline, reports still render (no regression).

## Deployment checklist
1. No migration. Commit + push → Vercel deploys.
2. Smoke-test the QA checklist above.

## Caveats unchanged
- Full node path for tooling; Supabase MCP can't reach the TDK DB (`grpfdtomncopqslrwpem`).
- See the ranked top-10 recommendations in the session summary / below.
