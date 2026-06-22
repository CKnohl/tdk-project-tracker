# Notifications, Email & Ready Reports

Two features added on top of the post-launch baseline:

1. **Notification + email infrastructure** — in-app notifications (already present) extended with project-manager fan-out, two new event types, per-user preferences, and email delivery via Resend.
2. **Ready Report** — a one-click operational PDF (print-to-PDF) for Admins and Project Managers, with stored history and period-over-period comparison.

---

## 1. Notification & Email System

### What changed

Previously, `task_assigned` and `project_assigned` in-app notifications were created by **database triggers** (`notify_task_assignment`, `notify_project_assignment`). Those triggers only notified the assigned staffer and couldn't send email. Migration `0018` **drops those triggers** and moves notification creation into the application layer (`lib/notify.ts`), called from the relevant server actions. This lets us fan out to project managers, exclude admins from task assignments, honor preferences, and send email.

### Events and recipients

| Event | Recipients | Email | Triggered from |
|---|---|---|---|
| `task_assigned` | Newly-assigned staff **+ project manager** (admins excluded) | ✅ | `createTask`, `updateTask`, workload assign/reassign |
| `task_completed` | Project manager(s) **+ admins + original task creator** (if different) | ✅ | `setTaskStatus`, `updateTask` (on completion transition) |
| `project_assigned` | Newly-assigned staff **+ project manager** | ✅ | `createProject`, `setProjectStaff`, workload add-to-project |
| `deadline_changed` | Affected staff (task assignees / project staff) + project manager | ✅ | `updateTask` (due date), `updateProject` (target date) |

"Project manager(s)" maps to the project's designated `project_manager_id` (the data model has one PM per project).

The actor (the person performing the action) is never notified of their own action. All delivery is **best-effort** — a failure never blocks the originating action.

### Preferences

`notification_preferences` (one row per user; a missing row = all defaults on):

- `inapp_enabled` — master in-app switch
- `email_enabled` — master email switch
- `email_task_assigned`, `email_task_completed`, `email_project_assigned`, `email_deadline_changed`

Managed by each user under **Settings → Profile → Notifications**.

### Email (Resend)

`lib/email.ts` posts to the Resend REST API with `fetch` (no SDK dependency). If `RESEND_API_KEY` is unset it **no-ops with a console warning** so local dev / CI / preview builds still pass. Email links use `NEXT_PUBLIC_SITE_URL`.

Env vars (see `.env.example`):

```
RESEND_API_KEY=...                 # from resend.com
RESEND_FROM=TDK Project Tracker <notifications@tdkengineering.com>   # sender on a verified domain
NEXT_PUBLIC_SITE_URL=https://tdk-project-tracker.vercel.app          # already required; used for email links
```

---

## 2. Ready Report

- **Button:** "Generate Ready Report" in the dashboard header, visible only to Admins and Project Managers (`canManageProjects`).
- **Flow:** the `generateReadyReport` action snapshots current operations, diffs against the most recent prior `report_runs` row, writes a new row, and redirects to `/reports/{id}`.
- **Output:** `/reports/{id}` is a light, print-styled page. Click **Print / Save as PDF** to produce the PDF via the browser. The page is a frozen render of the stored snapshot, so historical reports always show the data as it was at generation time.
- **Sections:** Executive Summary, Immediate Priorities, Needs Attention, Waiting on Others, Upcoming Deadlines, **Staff Workload** (now ranks each person by open / overdue / due-this-week + active projects), **Workload Alerts** (unusually high task load vs. the team average, and anyone with overdue work), Completed Since Last Report, New Projects Since Last Report, Risk Summary.
- **Comparison:** KPI deltas and the "Completed/New since last report" windows are measured against the previous report's `generated_at` (falling back to the last 7 days for the first report).
- **Future digest:** `gatherReadyReport(prev, client?)` accepts an optional Supabase client, so a future weekday-morning digest cron can reuse the identical logic with the service-role client (no user session).

### `report_runs`

| Column | Notes |
|---|---|
| `id` | uuid |
| `generated_by` | users.id |
| `generated_at` | timestamptz |
| `report_type` | `'ready_report'` |
| `pdf_path` | reserved for a future server-rendered+stored PDF |
| `summary` | executive summary text |
| `snapshot` | jsonb — full computed report payload |

RLS: only rank ≥ 30 (Project Manager / Admin) may read or create reports.

> The AI-generated executive summary (OpenAI) remains a future enhancement; the current summary is deterministic.

---

## 3. Staff Workload Management

The staff profile (`/staff/[id]`) is now a workload management center. The page is viewable by anyone signed in, but **management controls are gated to Admins + Project Managers** (`canManageProjects`); the underlying server actions independently enforce `requireManager`, and RLS enforces rank ≥ 30.

- **Workload Summary:** Open Tasks, Overdue, Due This Week, Assigned Projects, Waiting (awaiting response, active or on-hold), Needs Attention.
- **Assigned Projects:** project, role, status/workflow badges; managers can add a project (searchable picker) or remove one inline.
- **Assigned Tasks:** open tasks with project, priority, status, and due-date urgency. Managers can:
  - **Assign task** — dialog: pick a project → pick an open, unassigned task.
  - **Reassign** — check one or many tasks, pick a target staffer, apply (single = bulk with one row).
  - **Remove assignment** — per-row.
- **Assigned Submittals:** preserved read-only widget.

Server actions live in `lib/actions/workload.ts`; read model in `getStaffWorkloadDetail()` (`lib/data/staff.ts`). All assignment actions reuse the notification helpers, so reassigning a task notifies the new assignee + PM exactly like a normal assignment.

---

## Migration

**This round adds no schema changes** — staff management, the new notification recipients (task creator / PM), and the report additions all build on existing tables, columns, and RLS. The only migration in the project remains:

Apply `supabase/migrations/0018_notifications_email_reports.sql` (from the first feature round, if not already applied):

```bash
supabase db push          # against the linked project
# or paste the SQL into the Supabase SQL editor
```

It (1) adds enum values `task_completed` + `deadline_changed`, (2) creates `notification_preferences`, (3) creates `report_runs`, (4) drops the two assignment triggers/functions, (5) grants table privileges.

---

## Testing checklist

**Notifications**
- [ ] Assign a task to a staffer (not yourself) → they get an in-app notification; the project manager does too; an admin who is *not* the PM does **not**.
- [ ] Complete a task created by someone else → PM(s), admins, **and the original creator** get `task_completed`; the actor does not.
- [ ] Add a staffer to a project → the staffer **and the PM** get `project_assigned`.
- [ ] Change a task due date / project target date → assignees + PM get `deadline_changed`.
- [ ] With `RESEND_API_KEY` unset, none of the above throw; in-app still works.
- [ ] With a real `RESEND_API_KEY`, the matching emails arrive; toggling switches under Settings → Profile suppresses them.

**Staff Workload Management** (`/staff/[id]`)
- [ ] As Admin/PM: workload summary numbers match the lists below; add/remove project works; assign-task dialog lists only open, unassigned tasks; reassign one and reassign several both move the tasks and notify the new assignee; remove assignment works.
- [ ] As Staff/Read-Only: the page is viewable but shows **no** add/remove/assign/reassign controls.
- [ ] "Waiting" counts active **and** on-hold awaiting-response projects.

**Ready Report**
- [ ] Button shows for Admin/PM, hidden for Staff/Read-Only.
- [ ] Generate once → `/reports/{id}` renders all 9 sections; first-report note shows.
- [ ] Generate again → KPI deltas and "since last report" sections compare to the prior run.
- [ ] Staff Workload shows Open / Overdue / Due This Week / Active Projects; Workload Alerts flags high-load and overdue staff (empty state when none).
- [ ] Print / Save as PDF produces a clean, sidebar-free document.
- [ ] A Read-Only user navigating to `/reports/{id}` is redirected to the dashboard.

---

## Deployment steps

1. Run migration `0018` against production Supabase **if it isn't already applied** (the staff workload + notification-rule + report-additions round needs no new migration).
2. In Vercel, add `RESEND_API_KEY` and `RESEND_FROM`; confirm `NEXT_PUBLIC_SITE_URL` is the production URL.
3. Verify your sending domain in Resend (SPF/DKIM) so emails aren't spam-filtered.
4. Deploy (push to `main`).
5. Smoke-test using the checklist above.
