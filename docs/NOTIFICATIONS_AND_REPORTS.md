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

## 4. Email delivery, automated daily reports, AI summary & PDF storage

### Email (Resend) — setup
1. Create an account at [resend.com](https://resend.com) and add + verify your sending domain (SPF/DKIM DNS records).
2. Create an API key.
3. Set `RESEND_API_KEY` and `RESEND_FROM` (an address on the verified domain) in Vercel + `.env.local`.
4. Confirm `NEXT_PUBLIC_SITE_URL` is the production URL (used for email links).

The reusable service is [lib/email.ts](../lib/email.ts) (`sendEmail`, now with optional `attachments`). The four event emails (`task_assigned`, `task_completed`, `project_assigned`, `deadline_changed`) are already wired through [lib/notify.ts](../lib/notify.ts) and respect `notification_preferences`. If `RESEND_API_KEY` is unset, email is skipped and in-app notifications are unaffected.

### Automated daily Ready Report
- Route: [app/api/cron/daily-report/route.ts](../app/api/cron/daily-report/route.ts), Node runtime, guarded by `CRON_SECRET`.
- Schedule: [vercel.json](../vercel.json) → `0 12 * * 1-5` (weekday mornings, ~7–8am ET).
- It calls the shared orchestrator `runReadyReport()` ([lib/reports/run.ts](../lib/reports/run.ts)) with the **service-role client**, which reuses `gatherReadyReport()` verbatim (no duplicated report logic), then emails **active Admins + Project Managers** a link plus the **PDF attached**.
- The daily run is stored with `report_type = 'daily_digest'`; manual runs use `'ready_report'`. "Previous report" is the most recent run of *any* type, so manual + daily chain together.

### AI Executive Summary (OpenAI)
- [lib/ai.ts](../lib/ai.ts) `generateExecutiveSummary(snapshot)` calls the OpenAI Chat Completions API (`OPENAI_API_KEY`, default model `gpt-4o-mini`) via `fetch`.
- Highlights overdue work, workload issues, waiting projects, and changes since the previous report.
- **Graceful fallback:** if the key is missing or the call fails, the report uses the existing deterministic summary. The AI text flows through `snapshot.executive_summary`, so the web report and PDF render it with no extra fields.

### PDF → Supabase Storage
- [lib/reports/pdf.tsx](../lib/reports/pdf.tsx) renders the snapshot to a real PDF with `@react-pdf/renderer` (server-only, Node runtime — never imported by client code).
- [lib/reports/storage.ts](../lib/reports/storage.ts) uploads it to the private `reports` bucket as `{report_id}.pdf` (service-role) and stores the path in `report_runs.pdf_path`. The id is generated up front so `pdf_path` is set in the same insert.
- Both manual generation and the daily cron produce + store a PDF. The report page shows a **Download PDF** button (server-generated signed URL). PDF + AI are best-effort: a failure never blocks report creation.

---

## Migration

This round adds **one** additive migration: a private Storage bucket for report PDFs (`report_runs.pdf_path` already existed from 0018, so no table change).

```bash
supabase db push          # against the linked project
# or paste each SQL file into the Supabase SQL editor
```

Migrations in play:
- `0018_notifications_email_reports.sql` — enum values `task_completed`/`deadline_changed`, `notification_preferences`, `report_runs`, drops the old assignment triggers, grants. *(idempotent)*
- `0019_default_role_read_only.sql` — new OAuth users default to **Read Only** (was Project Manager).
- `0020_reports_storage.sql` — **new this round**: creates the private `reports` Storage bucket + a rank ≥ 30 read policy. *(idempotent)*

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
- [ ] After generating, a **Download PDF** button appears and downloads the stored PDF.
- [ ] With `OPENAI_API_KEY` set, the Executive Summary reads as AI prose; without it, the deterministic summary still renders.

**Automated daily report / email / PDF**
- [ ] `GET /api/cron/daily-report` with `Authorization: Bearer $CRON_SECRET` returns `{ id, recipients, emailed, pdf }`; without the header it returns 401.
- [ ] A `report_runs` row with `report_type = 'daily_digest'` is created and has a non-null `pdf_path`.
- [ ] Active Admins + PMs receive the email with the PDF attached and a working "View the full report" link.
- [ ] The `reports` Storage bucket contains `{id}.pdf` and is **private** (no public URL).

---

## Deployment steps

1. Apply migrations to production Supabase (idempotent): `0018` (if not already), `0019` (role default), and **`0020` (reports bucket)**.
2. In Vercel, set env vars: `RESEND_API_KEY`, `RESEND_FROM`, **`OPENAI_API_KEY`** (optional `OPENAI_MODEL`), `CRON_SECRET`; confirm `NEXT_PUBLIC_SITE_URL` is the production URL and `SUPABASE_SERVICE_ROLE_KEY` is set (used by the cron + PDF upload).
3. Verify your sending domain in Resend (SPF/DKIM) so emails aren't spam-filtered.
4. Deploy (push to `main`). Vercel registers the new `daily-report` cron from `vercel.json` (note: the Hobby plan allows ≤ once-per-day crons — both crons qualify).
5. Smoke-test: trigger `/api/cron/daily-report` manually with the Bearer secret, then run the checklist above.
