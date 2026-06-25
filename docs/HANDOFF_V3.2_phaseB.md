# TDK Project Tracker — V3.2 Phase B Handoff (Task Approval Workflow)

Builds the engineering QA/QC-style task review workflow on top of Phase A
(Project Leadership). TypeScript ✓ · Production build ✓.

## Workflow
`Not Started / In Progress / Waiting → Send for Review → Waiting for Review (in_review) → Approve → Completed`
and `Reject → restores the prior active status`. Completed tasks gain **Undo Complete**.

## Root cause / why
Tasks jumped straight to Completed with no QA gate and no record of who signed
off. This adds an explicit review step, an immutable review log, and restoration
(reject / undo) that never loses data.

## Architecture (how it leverages existing systems)
- **Status snapshot:** "Send for Review" records the active status in `tasks.prior_status`. Reject and Undo restore from it. Priority / start / due / assignees / notes / description are never touched, so they always survive.
- **`completed_at` is left to the existing `set_task_completion()` trigger** — Approve sets `status='completed'` and the trigger stamps `completed_at`; Reject/Undo set an active status and the trigger clears it. No manual completion bookkeeping.
- **Activity feed:** the existing `log_child_activity()` trigger already logs every task status change as `status_changed`, so submit/approve/reject/undo all appear in Activity automatically — no duplicate inserts, and the hot trigger is left untouched. The detailed Reviewer/Decision/Comment record lives in the new `task_reviews` "Review History" panel.
- **Permissions** reuse Phase A: submitting needs `requireEditor` (staff+); approve/reject use `requireProjectManager(projectId)` (the PM, a Project Lead, or admin/PM-rank). The detail-page passes a project-scoped `canReview` to the tasks tab so only reviewers see Approve/Reject.

## Files changed
**Migrations (additive, apply in order):**
- `supabase/migrations/0025_review_enums.sql` — `task_status += 'in_review'`; `notification_type += 'review_requested' | 'task_approved' | 'task_rejected'`. (Separate file so the enum values commit before use.)
- `supabase/migrations/0026_task_reviews.sql` — `tasks.prior_status`, `tasks.review_requested_at`, `tasks.review_requested_by`; `task_reviews` table (append-only) + RLS + index.

**Types:** `types/database.types.ts` (`TaskStatus`/`NotificationType` values, task columns, `TaskReviewRow`, register `task_reviews`), `lib/types.ts` (`ReviewItem`).

**Logic:**
- `lib/actions/reviews.ts` (new) — `sendTaskForReview`, `approveTask`, `rejectTask`, `undoComplete`.
- `lib/notify.ts` — `notifyReviewRequested` (PM + Leads only), `notifyTaskApproved`, `notifyTaskRejected` (assignees); `projectLeadUserIds` helper.
- `lib/constants.ts`, `lib/validators.ts` — `in_review` status.
- `lib/data/projects.ts` — `getProjectDetail.taskReviews` (grouped, newest-first).
- `lib/data/my-work.ts` — `getReviewQueue(user)` + `ReviewQueueItem`.

**UI:**
- `components/projects/detail/tasks-tab.tsx` — Send for Review / Approve / Reject (comment dialog) / Undo Complete; `in_review` excluded from the manual status dropdown; confetti on approve.
- `components/projects/detail/task-detail-dialog.tsx` — "Review History" (reviewer · decision · date · comment, newest first).
- `components/dashboard/review-queue.tsx` (new) + `app/(app)/my-work/page.tsx` — "Awaiting your review" queue (Task · Project · Submitted By · Submitted Date · Priority · Days Waiting).
- `components/projects/detail/project-tabs.tsx`, `app/(app)/projects/[id]/page.tsx` — thread `canReview` + `taskReviews`.
- `components/notifications/notifications-list.tsx` — icons/labels for the 3 new notification types.
- `components/tasks/general-tasks-view.tsx` — passes `reviews={[]}` (general tasks have no project review).

## Permission changes
- Submit: any editor (staff+). Approve / Reject: `requireProjectManager(projectId)` (PM / Lead / admin / PM-rank). Undo Complete: editor.
- `task_reviews` RLS: read = all authenticated; insert = `has_min_rank(20)` (append-only; the app enforces who may submit vs approve/reject).

## Notification flow (all in-app; email remains paused)
- **Submit →** project Manager + Project Leads ONLY (no staff, no admins, no global fan-out).
- **Approve →** the original assignee(s).
- **Reject →** the original assignee(s), body includes the reviewer's comment.

## Regression analysis
- `in_review` is additive; existing filters treat it as open (not completed/cancelled), so dashboard/command-center/health counts and My Work continue to work. Project-health `openTaskList` already includes it.
- Existing **Complete-via-dropdown** still works (escape hatch); the green Complete button is replaced by Send for Review. Directly-completed tasks (no snapshot) Undo to `in_progress`.
- **General tasks, timeline, reports, command center, notifications** untouched except additive wiring. The activity trigger and completion trigger are unchanged.
- `getProjectDetail` adds one `task_reviews` query (cached with the detail fetch); My Work adds the review-queue query.

## QA checklist
- [ ] Staff sees **Send for Review** on active tasks; clicking → status **Waiting for Review**, PM + Leads notified (only).
- [ ] Reviewer (PM/Lead) sees **Approve / Reject**; non-reviewer sees "Waiting for review".
- [ ] **Approve** → Completed + confetti; assignee notified; recurrence still spawns next occurrence.
- [ ] **Reject** requires a comment; task returns to its prior status with priority/dates/assignees/notes intact; assignee notified with the comment.
- [ ] **Undo Complete** on a completed task restores the prior active status.
- [ ] Task Details shows **Review History** newest-first with reviewer, decision, date, comment.
- [ ] My Work shows **Awaiting your review** for PMs/Leads with the right columns and "days waiting".
- [ ] A Lead only sees/approves reviews for their own projects.

## Deployment checklist
1. Apply `0025_review_enums.sql`, then `0026_task_reviews.sql` to the TDK DB (`grpfdtomncopqslrwpem`), in that order. Verify: `task_reviews` exists; `select unnest(enum_range(null::task_status));` includes `in_review`; `notification_type` includes the 3 new values.
2. Commit + push → Vercel deploys.
3. Smoke test the QA checklist above on one project.

## Notes / future
- Approve/Reject are available on the project Tasks tab; the My Work review queue links there. Inline approve/reject from the queue is a possible enhancement.
- Activity feed shows generic "status changed" entries; if you want literal "Connor submitted task for review" wording, enrich `log_child_activity()` to set `summary` (deferred — it's a hot trigger and can't be tested here).
- Remaining V3.2: Phase C (Staff page management dashboard with the review queue) and #8 Companies (needs Aquarii/PJO email domains).
- Caveats unchanged: full node path for tooling; Supabase MCP can't reach the TDK DB.
