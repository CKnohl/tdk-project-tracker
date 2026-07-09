# TDK Project Tracker — V5.1 Navigation & Workspace Cohesion Handoff

Cohesion-only sprint (no new business features). Makes the tracker behave like a
desktop app: inspect a record from anywhere and Back returns you to exactly where
you were. **TypeScript ✓ · Production build ✓ (26 routes) · No migrations.**

## The core: one shared navigation system (URL-as-state + origin stack)

Decision (as agreed): the **URL is the state**, `sessionStorage` is the breadcrumb —
not an in-memory service that dies on refresh.

- `lib/nav-history.ts` — a back-STACK of visited URLs in sessionStorage. `recordNav`
  behaves like real history: same-page filter changes *replace* the top (Back doesn't
  step through every tweak); a revisited URL *truncates* (proper back); otherwise
  *push*. `getBackTarget` returns the most recent URL whose pathname differs from the
  current page — i.e. the true origin — with a fallback for deep-links/refresh.
- `components/shared/route-history.tsx` — `<RouteHistoryTracker/>`, mounted once in
  the app shell ([app/(app)/layout.tsx](app/(app)/layout.tsx)), records every route.
- `components/shared/back-link.tsx` — `<BackLink fallbackHref fallbackLabel/>`. Returns
  to the real origin instead of a hard-coded route. **This kills the "Dashboard → open
  project → Back → Projects" bug** — the old back link was literally `href="/projects"`.

Wired into every detail page: project header ([project-header.tsx](components/projects/detail/project-header.tsx)),
staff detail, and the report viewer (both Ready + Self report).

## State preserved per surface

| Surface | Filters/sort/search | Tab | Scroll | Back → origin |
|---|---|---|---|---|
| Projects | URL ✓ | — | ✓ | ✓ |
| **My Work** | inbox filters client-only | **URL ✓ (new)** | ✓ (new) | ✓ |
| **Staff** | **URL ✓ (new — search/sort/filter)** | — | ✓ (new) | ✓ |
| Archive | URL ✓ | — | ✓ (new) | ✓ |
| Due / Priority Items | URL ✓ | — | ✓ (new) | ✓ |
| Activity | — | — | ✓ (new) | ✓ |
| General Tasks | client-only (see debt) | — | ✓ (new) | ✓ |
| Reports | — | — | — | ✓ |

- **Staff** (your marquee example) now keeps search/sort/filter in the URL — search
  "Mike", sort "Workload", open Mike, Back → all restored. Search still filters
  instantly (local input) and persists to the URL debounced.
- **My Work** tab lives in the URL (`?tab=`), so the active tab survives a round trip;
  scroll is restored via `ScrollRestoration`.
- Scroll restoration (`components/shared/scroll-restoration.tsx`) is now on every list,
  not just Projects.

## Notifications — bell is a productivity overlay, not a page

- `components/layout/notification-bell.tsx` rewritten as an **Outlook-style Popover**:
  scrollable panel (max ~420px) of the recent 20, unread badge, "Mark all read", and
  **"View Inbox →"** (→ `/my-work?tab=inbox`). It never navigates away — reference a
  notification mid-edit and keep working.
- **Poll 15s** (was 60s); **no realtime/WebSockets** (deferred by decision). A live
  touch on top of polling: the bell **pulses and toasts** the newest item when unread
  rises.
- **Badges** via one shared 15s poll (`lib/actions/badges.ts` → `getBadgeData`,
  `lib/hooks/use-badge-data.ts`): the **bell** shows unread; the **My Work nav item**
  shows **unread + pending reviews** (no double-count of assignments, which are already
  notifications). Icon/label maps are shared from the one `NotificationsList` (Rule 0).
- Model unchanged: Read / Unread / Delete only — no Archive lifecycle. `/notifications`
  still redirects to the Inbox.

## Files

**New:** `lib/nav-history.ts`, `components/shared/route-history.tsx`,
`components/shared/back-link.tsx`, `lib/actions/badges.ts`, `lib/hooks/use-badge-data.ts`.
**Changed:** app shell layout; `notification-bell.tsx`; `sidebar.tsx` (My Work badge);
`my-work-tabs.tsx` (URL tab); `staff-dashboard.tsx` (URL state); `notifications-list.tsx`
(export icon/label maps); project/staff/report detail (BackLink); and
`ScrollRestoration` added to my-work / staff / archive / due / activity / tasks.

## Regression analysis

- **Back navigation:** the old projects-only `backHref` (via `PROJECTS_QUERY_KEY`) is
  replaced by the shared stack, which now works from *any* origin. `PROJECTS_QUERY_KEY`
  is still exported by the projects toolbar but no longer read — dead, harmless (cleanup).
- **Bell:** now polls a server action (`getBadgeData`) every 15s instead of a 60s count
  query — slightly more server work, fine at office scale. Behavior is additive.
- **My Work / Staff:** tab and filters now write to the URL (via `router.replace`,
  `scroll:false`) — deep-linkable and no scroll jump. No data change.
- **No migrations, no env changes.** Pure client/UI + one read-only server action.

## Follow-up refinements (same sprint)

- **Intelligent Back — verified.** Filter/sort/search changes collapse to a single
  list entry, so Back returns *once* to the final filtered list, on both paths: our
  back-stack replaces same-pathname entries, and the Projects toolbar uses
  `router.replace` (so the browser Back button collapses too). Staff / My Work tabs
  use the same `replace` pattern.
- **Bell detail view.** Clicking a notification opens an Outlook-style detail pane
  *inside* the popover (icon + type, Title, Project, Date, Status, Message) with
  **Open Project**, **Open Task**, and **Mark Read/Unread** — it no longer navigates
  on click, so you can just reference it. (Open Task opens the project's Tasks tab;
  task details are dialogs, not routes — a `?task=<id>` deep-link is a later add.)
- **My Work → personal workspace.** A folder rail
  (**To Do · Inbox · Needs Review · Schedule · Projects · Reports**) + content pane, with
  **contextual Summary, Recently Viewed, and a command-center Search pinned** above.
  - **Resilient layout (no viewport lock).** The page grows naturally; the rail is
    `md:sticky`, and only long lists scroll internally (`max-h-[70vh]`) — no hard-coded
    `100dvh` heights, so it holds up on laptops, 24/32″ monitors, tablets, split-screen.
  - **Contextual Summary.** The four stat tiles change with the selected folder — Inbox
    shows unread / approvals / overdue / assignments; Projects shows assigned / waiting /
    needs-attention; Schedule shows deadlines / overdue / submittals / due-this-week; etc.
  - **Command-center Search** filters **all** folders at once — Tasks, Inbox, Needs Review,
    Schedule, Projects, Reports — with grouped results.
  - **Reports** is a documents area: a Generate button + reports grouped
    **Today / Yesterday / This Week / Older** (new `getMyReports`).
  - Active folder in the URL (`?tab=`, so the bell's "View Inbox" still lands right), so
    Back restores the folder.
  - `components/dashboard/my-work-tabs.tsx` is superseded/unused (kept one release per the
    "don't delete immediately" rule; remove in cleanup).

## Deployment

Just deploy — no DB changes. `npm run typecheck` + `npm run build` are green.

## Remaining polish (V5.1.x / next)

- **General Tasks** and the **Inbox (NotificationsList)** filters are still client-only;
  move them to the URL for full parity if desired.
- **Expanded/collapsed sections** aren't URL-persisted yet (few surfaces have them).
- **Calendar** doesn't restore scroll (fixed grid); view is already remembered (V5).
- Remove the now-unused `PROJECTS_QUERY_KEY` from the projects toolbar.
- **Global Quick Add** (`+`/`N` launcher) remains the top standalone usability win from
  the earlier review — still queued, still no new business logic.
- Realtime notifications when adoption grows (Supabase Realtime), per the deferral.
