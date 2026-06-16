# Testing checklist

Run with **3 accounts** at different roles: you (Admin), Mike (Project Manager), Derek (Staff). Add a 4th Read Only if possible.

## Authentication & access
- [ ] Allowed domain (`@tdkengineering.com` / `@mpengineers.com`) signs in successfully.
- [ ] Disallowed domain is rejected (DB trigger blocks; lands on `/auth/auth-error?reason=domain`).
- [ ] First login provisions role **Project Manager** automatically.
- [ ] Admin can change another user's role and activation in Settings → Users.
- [ ] Deactivated user (`is_active=false`) loses access.

## Role permissions (RLS)
- [ ] **Read Only**: can view all pages; every "Add/Edit/Delete" control is hidden; direct write attempts fail.
- [ ] **Staff**: can create projects/tasks; can edit only projects they're a member of.
- [ ] **Project Manager**: can edit any project, archive/restore, delete tasks/submittals.
- [ ] **Admin**: can manage users, roles, companies, and staff.

## Projects
- [ ] Create project (valid number `2026099`); invalid number (`abc`, `123`) is rejected client + server.
- [ ] Duplicate project number is rejected (unique constraint).
- [ ] Edit project; `project_updated` notification reaches other team members (not the editor).
- [ ] Change phase → reflected in header + Timeline.
- [ ] Set workflow_state to `awaiting_response` / `needs_follow_up` / `urgent_follow_up` → team receives a follow-up notification; project shows in Awaiting/Follow-Up widgets.
- [ ] Archive (with reason) → leaves Active Projects, appears in Archive.
- [ ] Restore → returns to Active; History shows a `restored` entry.
- [ ] List search / status / company / phase / workflow filters / grouping / sorting all work.

## Tasks
- [ ] Add task with due date + assignees → assignee with a linked login gets a `task_assigned` notification.
- [ ] Quick status change; completing a task sets completion to 100% and `completed_at`.
- [ ] Overdue / Due Today / Due This Week widgets reflect due dates.
- [ ] Delete task (creator or PM).

## Submittals + history
- [ ] Add submittal → History shows the initial `→ status` entry.
- [ ] Change submittal status → History records `from → to`, timestamp, and the responsible user.
- [ ] Dates (submitted / response due / follow-up) display correctly and feed the calendar.

## Contacts
- [ ] Add one of each: Client, Contractor, Surveyor, Attorney, Municipal Reviewer → grouped under correct role headers with icons.
- [ ] Edit + delete contact. Email/phone links work.

## Files
- [ ] Upload a PDF → appears with size + uploader; stored under `project-files/<projectId>/...`.
- [ ] Download via signed URL works.
- [ ] Delete removes both the storage object and the metadata row.
- [ ] File > 50 MB is rejected.

## Calendar
- [ ] Add event (meeting/site visit/milestone) → shows on month grid + Scheduled events list.
- [ ] Edit event (time/type/project) persists.
- [ ] Delete event removes it.
- [ ] Month / Week / Agenda views render; tasks, submittal due/follow-up, and milestones all appear.

## Staff management
- [ ] Add staff member (initials auto-derive if blank).
- [ ] Edit staff; deactivate staff (greys out, drops from assignable lists).
- [ ] Transfer ownership from A → B: B inherits manager role, team membership, task + submittal assignments; A is removed.
- [ ] Staff workload page + drill-in reflect the changes.

## Notifications
- [ ] Unread count badge updates (polls ~60s).
- [ ] Mark read / mark all read / delete work.
- [ ] Daily cron creates task-due-tomorrow, overdue, and submittal-awaiting notifications without duplicates on a second run.

## My Work
- [ ] Shows only the signed-in user's tasks/overdue/upcoming/submittals/projects.
- [ ] Account with no linked staff sees the "no staff link" message.

## Global search
- [ ] ⌘K opens; typing a project number/name returns hits; Enter navigates.

## PWA / responsive
- [ ] Installable on iPhone, iPad, Android, Desktop.
- [ ] Offline shell shows when network is cut.
- [ ] Sidebar collapses to a drawer on mobile; all pages usable at 375px width.

## Data integrity
- [ ] `activity_logs` records create/update/status_changed/restored across entities.
- [ ] `last_activity_at` updates on activity (drives Recently Updated + stale detection).
- [ ] Inactive project without a reason is impossible (CHECK constraint).
