# Changelog

Notable changes to the TDK Project Tracker, newest first. This supersedes the
per-sprint `docs/HANDOFF_V*.md` files going forward — those stay as history; new
changes are recorded here. Reserve a dedicated design doc only for large
architectural changes.

## Fix — restore app types after first real `types:gen` (types architecture)

Applying migrations 0017–0040 and running `npm run types:gen` for the first time overwrote
`types/database.types.ts` — until now hand-authored and the owner of the app's helper-type
surface (`ProjectStatus`, `ProjectRow`, `CalendarFeedRow`, …) — producing ~540 type errors.
The generated schema is kept as the source of truth; the app surface is restored as a
derivation layer. **One owner per concern:**

- **`types/database.generated.ts` (new)** — the raw `supabase gen` output. `npm run types:gen`
  now writes here (package.json). Never hand-edited; safe to regenerate any time.
- **`types/database.types.ts` (rewritten)** — the app-facing surface with the same exports as
  before, so all ~50 importing files are unchanged. Every type is now *derived* from the
  generated schema (`Tables<'projects'>`, `Enums<'project_status'>`), so schema changes flow
  through regeneration automatically. Hand-narrowing remains only where the generator cannot
  express the truth: text columns constrained by CHECK constraints (`task_reviews.action`,
  intake document/proposal status unions) and view columns the view definition guarantees
  non-null (`v_project_stats`, `v_calendar_feed`, `v_staff_workload`).
- The three `v_project_stats` queries (`lib/data/projects.ts` ×2, `lib/data/my-work.ts`)
  attach `.returns<ProjectStatsRow[]>()` — the data layer's existing idiom for typed results —
  because generated view rows are all-nullable.

No migration, no new tables, no runtime change (`.returns` is type-only). `npm run typecheck`
and `npm run build` pass. **Do not hand-edit `types/database.generated.ts`; after future
migrations run `npm run types:gen`, then reconcile only the CHECK-constraint unions / view
narrowings in `database.types.ts` if the migration changed them.**

## Fix — calendar / "Upcoming" off-by-one date

Date-only due dates (`yyyy-MM-dd`) were being turned into a `Date` at midnight UTC and then
rendered in Eastern time, showing the **day before** (e.g., a 7/23 due date appeared as 7/22).
- **`describeDue()`** (`lib/utils.ts`) now treats date-only values as floating calendar dates
  in the office timezone — fixes the project **Upcoming** widget, `TaskRow`, and `DueItemRow`.
- **`0040_calendar_feed_date_fix.sql`** re-anchors the date-derived rows in `v_calendar_feed`
  at noon UTC so the **/calendar** page and dashboard **Today's Schedule** show the correct day.
  *(Apply via `supabase db push` and verify on the live calendar.)*

## V6 — Phase 1.3: Operations Center polish & hardening

A friction-removal sprint before daily use — no new workflows, no OCR, no AI, no redesign.

### Intake Queue
- Renamed the **New** tab to **Needs Filing** (clearer status wording).
- **Document multi-select + bulk lifecycle:** per-row checkboxes, Select all, and bulk
  **Start / Reopen / Archive** (never bulk filing). Keyboard `x` selects the highlighted row,
  `Esc` clears.
- **Duplicate detection:** documents with the same filename + size are flagged "possible
  duplicate" (no AI, no server call).

### Proposal Review
- **Search box** across title / project / assignee / reasoning / category / source document.
- **Sort** (Newest / Confidence / Due date) alongside the existing grouping.
- **Restore** on rejected/archived proposals (undo an accidental dismiss → editable again).
- Guided empty state that points to the Intake Queue.

### Consistency / a11y
- Operations Center tabs are proper `role="tab"` with `aria-selected`; selection checkboxes
  carry aria-labels; statuses and button color-hierarchy made consistent across both views.

### Reused — no new tables, no new write paths
- Bulk document status reuses the same `intake_documents` update; Restore reuses the proposal
  store; display helpers are shared between the inline list and the workspace. No migration.

## V6 — Phase 1.2: PM review workspace

Turns the proposal list into a real review workspace for processing dozens of documents a
day. **No change to interpretation or the Apply Engine** — this is purely the human review
experience.

### Added
- **Operations Center is now two tabs:** *Intake Queue* (documents + interpret, unchanged)
  and *Proposal Review* (a cross-document workspace with a "needs review" count).
- **Filter** (All · Needs review · High confidence · Tasks · Submittals · Notes · Calendar ·
  Unknown · Applied · Rejected · Archived) and **group** (Document · Project · Type ·
  Confidence · Status).
- **Multi-select** (per-row checkboxes, Select all of the current filter, `a` to select-all,
  `Esc` to clear) + **bulk Approve / Reject / Archive / Delete**.
- **Bulk Approve shows a confirmation summary** ("You are about to create: 8 Tasks, 2 Notes,
  …") and a **per-item results dialog** ("13 applied · 2 failed") with expandable error
  details. The batch **never stops on a failure** — each proposal is applied independently.
- New **archived** proposal state (dismiss without rejecting).

### Reused — no new write path
- **Bulk Approve loops the existing `approveProposal`** (the Phase 1.1 Apply Engine), so
  every created record still goes through the existing server actions, activity logging, and
  notifications. **Reject/Archive/Delete touch only the proposal store** — never a tracker
  table; applied proposals are left untouched so their audit link is preserved. Display
  helpers are shared between the inline list and the workspace (one definition).

### Migrations
Apply `0039_proposal_archived_state.sql` via `supabase db push`, then `npm run types:gen`.
Additive/idempotent: allows the `archived` proposal state. No tracker tables touched.

## V6 — Phase 1.1: Proposal Apply Engine

Turns an **approved** proposal into a real tracker record — by calling the **existing**
server actions, never by writing tracker tables directly. This is the one place proposals
cross into the tracker, and it does so through the same doors a human uses.

### Added
- **Approve** on a proposal → the Apply Engine calls the matching existing action:
  task → `createTask`, general task → `createGeneralTask`, note → `createNote`,
  submittal → `createSubmittal`, calendar → `createCalendarEvent`. Approve is **gated** on a
  valid destination (project-scoped types need a matched project; calendar needs a date), so
  the PM edits first instead of failing.
- After apply, the proposal records **applied_at / applied_by / resulting object type + id**
  and keeps its original reasoning + source text (nothing is deleted). The card shows
  **"Applied — created a Task", a "View created →" jump-link, and Undo**.
- **Undo** removes the created object via the existing delete action and returns the proposal
  to an editable state (the proposal itself is never deleted).

### Reused (no new write path, no duplication)
- **Server actions** are the only write path — so validation, permissions, **activity logging
  (the "created" entry is written by the existing triggers, attributed to the approving PM)**,
  and **notifications** all come from the existing systems. No new notification path; no
  manual activity insert.

### Migrations
Apply `0038_proposal_apply.sql` via `supabase db push`, then `npm run types:gen`. Additive/
idempotent: adds `applied_at/applied_by/applied_entity_type/applied_entity_id` to
`intake_proposals` and allows the `approved` state. No tracker tables are touched.

## V6 — Phase 1: interpretation → proposals *(no writes, no approvals)*

Second V6 phase. A PM clicks **Interpret** on an intake document and gets **proposed
changes to review** — like a junior engineer's recommendations. **Nothing is written to
any project, task, submittal, note, or the calendar.** Approve/apply, automatic filing, and
project updates are explicitly out of this phase.

### Added
- **Interpret** action on each intake document → proposals stored in a new
  `intake_proposals` table (the single owner of pending AI suggestions; it never touches
  tracker tables). Proposals can be **Edited / Rejected / Commented** — all on the proposal
  row only.
- Each proposal shows **type + category, a confidence *band* (never a number), reasoning,
  a verbatim source quote, suggested destination (existing / new-candidate / unknown
  project), assignee, due date, and uncertainties** — with a persistent "Interpreted —
  nothing has been changed" framing.
- **Text-only interpretation** (per the frozen spec — OCR stays Phase 2): interprets pasted
  text and text-extractable files. A scanned file prompts "paste the text to interpret now,"
  so it's useful before OCR lands.

### Notes
- **Interpretation is gated OFF by default** (charter SEC-2). No document text leaves the
  building unless **both** `OPENAI_API_KEY` is set **and** `INTAKE_INTERPRET_ENABLED=true`,
  after you sign off on the data-governance boundary. Reuses the existing `lib/ai.ts` OpenAI
  pattern; the document is treated as untrusted data (prompt-injection hardened) and — because
  nothing is ever auto-applied — an injected instruction can't cause a tracker change.

### Migrations
Apply `0037_intake_proposals.sql` via `supabase db push`, then `npm run types:gen`.
Additive/idempotent: new `intake_proposals` table (RLS rank ≥ 30, dedupe unique index). No
existing data changes; writes nothing to tracker tables.

## V6 — Phase 0: Operations Center intake *(shell, no AI)*

First V6 phase, governed by `docs/V6_DEVELOPMENT_CHARTER.md`. Adds an **office-level
intake surface** where documents land before they're on a project. **No AI yet** —
documents are viewed and **manually** filed to a project through the existing note/task
actions. Nothing changes a project until a PM deliberately files a document.

### Added
- **Operations Center** page at `/operations`, **PM/Admin only** (rank ≥ 30). Engineers
  never see it — the sidebar **and** the ⌘K palette hide it, and the page guards a typed URL.
- **Intake queue:** a Gmail/Outlook-style processing queue for the dozens of documents a
  PM handles each morning. Upload (multi-file **and** drag-drop) → documents land in the
  private `intake` bucket + `intake_documents` rows. **Status tabs** New / In Progress /
  Filed / Archived with live counts; **keyboard navigation** (↑/↓ move, `f` file, `o` open,
  `e` archive); per-row **View / File / Start / Archive / Reopen**. **File to a project** as
  a note or task (reusing `createNote` / `createTask`) — records who filed it and when.
  Rich metadata: type icon, size, source, uploader, timestamps.

### Changed
- Sidebar nav **and ⌘K** are now **role-aware** (`minRank` on nav items; role threaded via
  AppShell/Topbar) — the mechanism the Operations Center uses to stay PM/Admin-only.
- Firm-wide activity is **not** duplicated inside the Operations Center — it keeps its one
  home at `/activity` (visible to all roles), so the Operations Center stays focused on intake.

### Migrations
Apply `0036_intake_documents.sql` via `supabase db push`, then `npm run types:gen`.
Additive/idempotent: new `intake_documents` table (RLS rank ≥ 30) + private `intake`
storage bucket; lifecycle `received → in_progress → filed → archived` (reopenable), with
`filed_at` / `filed_by` for quick display. No existing data changes. Does **not** trigger
`activity_logs` — filing creates project activity through the existing note/task triggers,
so activity stays single-sourced.

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
