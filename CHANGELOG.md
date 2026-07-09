# Changelog

Notable changes to the TDK Project Tracker, newest first. This supersedes the
per-sprint `docs/HANDOFF_V*.md` files going forward — those stay as history; new
changes are recorded here. Reserve a dedicated design doc only for large
architectural changes.

## V5.1 — Polish: navigation & My Work cleanup

### Changed
- **Recently Viewed removed** from My Work — it consumed vertical space without helping
  people get work done (⌘K search is faster to reopen something). The orphaned
  `recently-viewed.tsx` / `recent-tracker.tsx` and every `<RecentTracker/>` drop were
  deleted with it.
- **Count badges standardized to `9+`** — a shared `formatBadgeCount()` helper caps the
  compact nav badges (sidebar My Work, notification bell, My Work folder rail) at `9+`
  once the count passes 9. Canonical figures (dashboard Priority tiles, My Work Summary
  tiles, section headers) still show the real number.
- **Notifications removed from the sidebar** — Notifications live in the bell popover and
  the My Work **Inbox**. `/notifications` is kept only as a redirect for old bookmarks.
- **Dashboard pared to one screen** — the "Upcoming Meetings" strip was removed (it lives
  on the Calendar); "Today's Schedule" is now a single full-width strip. Priority Focus →
  health/attention → Today's Schedule → Office Summary, no scrolling, no duplicate lists.
  The now-dead `upcomingMeetings` query was dropped from `getOfficeOverview`.

### Fixed
- **Due / Priority Items navigation** audited end-to-end: opening a project from Overdue /
  Due Today / Due This Week / High Priority now returns to the **exact filtered Due view**
  (in-app Back *and* browser Back), with filter + scroll restored — via the shared
  origin-aware back-stack, no hard-coded `/projects`. Priority Items also gained a
  `BackLink` to its origin so it fully participates in the shared navigation system.

## V5 — Workflow, UX & navigation

### Added
- **Multi-company (shared pool):** PJO Surveying + Aquarii Lighting as sign-in-only
  firms; the sign-in allowlist is data-driven (`handle_new_user` reads
  `companies.domain`), so a new firm is one row. *(0032)*
- **Self Report:** a personal workload PDF for any linked, non-read-only user; admins
  and PMs can generate for anyone. *(0031)*
- **Office Dashboard command center:** Priority Focus tiles (Overdue / Due Today / Due
  This Week / High Priority), health + attention buttons, Today's Schedule + Upcoming
  Meetings, Office Summary — every count links to its one canonical list.
- **My Work personal workspace:** folder rail (To Do · Inbox · Review · Schedule ·
  Projects · Reports), a **contextual Summary** (tiles change per folder), Recently
  Viewed, a **command-center Search** across all folders, **project-inbox rows** (open
  tasks / overdue / next deadline / workflow), and a Reports **documents area** grouped
  Today / Yesterday / This Week / Older.
- **Firm-wide Activity feed** over `activity_logs`. *(0034)*
- **Notification bell → productivity overlay:** a popover with a per-notification
  detail view (Open Project / Open Task / Mark Read); unread badge on the bell and the
  My Work nav item (unread + pending reviews); 15s poll (no realtime yet).
- **Shared navigation state:** origin-aware Back (`BackLink` + a sessionStorage
  back-stack that collapses filter/sort/search) and scroll restoration on every list.
- **Calendar:** week/day views, presentation / town_meeting / inspection event types
  *(0033)*, and it remembers the user's last view.

### Changed
- Task text consolidated to one `description` field. *(0035; column drop deferred)*
- Notifications merged into the My Work Inbox (bell + Inbox; the standalone page redirects).
- Project completion / archiving is gated to the project's Manager / Lead / Admin.

### Fixed
- **Privilege escalation:** `users.staff_id` / `company_id` are now admin-only. *(0029)*
- Review-workflow race conditions (status-guarded, transactional updates).
- Silent write failures — task assignment now surfaces errors; ownership transfer is an
  atomic RPC. *(0030, also: actor/author FKs → `ON DELETE SET NULL`)*

### Migrations
Apply `0029` → `0035` in order via `supabase db push`. All additive/idempotent.

### Deferred / roadmap
- **Staff offboarding workflow** (next big operational feature). Deactivating a staff
  member should be gated on their live ownership: block until **projects they lead**,
  **tasks assigned**, **pending reviews**, **general tasks**, and **calendar events** are
  reassigned or explicitly cleared, with inline "Assign new lead / Bulk reassign / Assign
  reviewer" actions. Completed & historical work **stays attributed** to them (audit
  history never changes); they simply drop out of assignment pickers. A prominent PM
  alert fires if a project is left without responsible leadership.
- Weekly & Monthly report generators; Reports as a broader documents area (meeting
  minutes, field reports, exports).
- Schedule → full "where do I have to be?" (meetings, inspections, town meetings,
  presentations) via calendar integration.
- Global cross-entity search (projects · tasks · inbox · reports · people) in the ⌘K palette.
- Project-inbox "Behind" signal (needs the per-project schedule verdict).
- "Good morning" panel (greeting + today's counts; weather needs an external API).
- Drop the deprecated `tasks.notes` column; realtime notifications at higher concurrency.
- Cleanup: remove superseded `my-work-tabs.tsx`, unused `getDashboardData`, `PROJECTS_QUERY_KEY`.
