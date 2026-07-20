# Handwritten Notes — Backlog & Status

Source: `goodideas.pdf` (scanned handwritten notes, "Project Tracker Suggestions,"
dated 7/10/26). Every item is transcribed here with its disposition so nothing is
lost. **Shipped** items landed in the sprint recorded at the top of `CHANGELOG.md`;
**Pending apply** items are coded but need a migration run; **Deferred** items have a
written reason and a design sketch for a future focused sprint.

---

## Shipped this sprint

1. **Click a person's name on a project's team → their staff page.** Project team
   members are now links to `/staff/[id]`. *(components/projects/detail/staff-tab.tsx)*
2. **Red count badge on the My Work Inbox**, matching the bell/sidebar unread badge.
   *(components/dashboard/my-work-workspace.tsx)*
3. **Calendar events colored by category** (not "all red"). The month grid tints each
   chip by type via a shared `EVENT_TINTS` map alongside the existing `EVENT_COLORS`
   dots. *(lib/queries/calendar.ts, components/calendar/calendar-view.tsx)*
4. **Searchable project dropdown when making an event** (don't scroll 100+ projects).
   The event form's project picker is now the shared `Combobox`.
   *(components/calendar/event-form.tsx)*
5. **Clicking a calendar event opens an event editor** instead of jumping to the
   project. Hand-added events open the edit dialog in place; derived rows
   (task/submittal deadlines) still navigate to their project.
   *(components/calendar/calendar-view.tsx)*
6. **Optional note when a task is marked complete** ("did the appointment on time, but
   they stopped accepting oil-based paints — didn't return everything… not every task
   is black-and-white; sometimes context is required"). A skippable prompt appends a
   note to the task's timeline. *(components/tasks/completion-note-dialog.tsx)*
7. **General tasks: archive layer** — completed/cancelled office tasks collapse into a
   toggleable archive instead of cluttering the active list.
   *(components/tasks/general-tasks-view.tsx)*
8. **Assignee updates on a task** — anyone who can edit can append a written update to
   a task's timeline (project tasks and general tasks), shown in the detail dialog.
   *(components/projects/detail/task-detail-dialog.tsx)*
9. **Staff offboarding (page 4 of the notes, in full):**
   - "When I deactivate a staff, where do their assigned projects go?" → deactivation
     now opens an **offboarding checklist** showing everything they hold (managed
     projects, lead roles, open tasks, open submittals, pending reviews) with a
     one-step **Transfer & deactivate** (atomic `transfer_staff_ownership`) or
     **Deactivate only**.
   - "#2 … company admins/PMs receive an alert" → deactivating a manager fires a
     **project-needs-a-manager** notification to every admin/PM, and a **dashboard
     alert box** lists every leaderless active project until resolved.
   - "person w/ most tasks auto moves up to PM … make it a big deal" → implemented as a
     **suggested** new lead (active teammate with the most open tasks on that project)
     that a human confirms with one click — never automatic (charter: nothing changes
     without a human OK).
   - "notes/completed-by/past work stays in their name … but we shouldn't see them
     assigned" → deactivated staff are hidden from assignment displays (team lists,
     assignee stacks) while their history stays intact; open tasks assigned to them
     surface a **reassign** banner on the project's Tasks tab. Reactivating restores
     their open assignments. *(lib/actions/staff.ts, components/settings/offboarding-dialog.tsx,
     components/dashboard/leaderless-alert.tsx, components/projects/detail/tasks-tab.tsx)*

## Shipped, pending migration apply (in this sprint's code; run the SQL to activate)

10. **"Appointment" event type** ("Add an option for Appointment for the different
    types of events"). Migration `0042_appointment_event_type.sql` adds the enum
    value; the event form, colors, and tints already include it.
11. **Staff phone numbers** ("Have ppl's phone numbers"). Migration
    `0043_staff_phone.sql` adds `staff.phone`; the staff form captures it and the
    staff profile shows a click-to-call link.

## Deferred — each needs its own focused sprint (with reasons)

12. **Time-of-day on tasks + notification reminder** ("add time of day for task +
    notification reminder"; "start & end times should be added similar to the calendar
    assignments"). *Why deferred:* the reminder is the point, and firing a reminder at
    a wall-clock time needs a **sub-daily scheduler** — new infrastructure and a new
    failure domain beyond the existing once-a-day `/api/cron/notifications`. The
    charter's "one new failure domain per release" says this earns its own sprint.
    *Design sketch:* add nullable `start_time`/`due_time` (`time`) columns to `tasks`
    (additive; no timezone math — treat as wall-clock like `all_day` events); show them
    next to the date in the task forms and rows; add a reminder-window cron (e.g.
    every 15 min) that emits `task_due_tomorrow`-style notifications via the existing
    `lib/notify.ts`. No change to `due_date` semantics (avoids the date/timezone bug
    class fixed in 0040).
13. **In/out office board** ("Way to track when people are in/out of the office, when
    they arrive/leave"; statuses "Simple In & Out", "Working @ home", "On lunch", "In
    office", "On vacation"; "personal schedules"). *Why deferred:* this is a genuinely
    new **presence subsystem** — a self-service status each person sets for themselves,
    which needs an RLS policy letting a staff member update their *own* status columns
    (today `staff` writes are manager/admin only), a status history/`updated_at`, and a
    new board surface. That's a new owner and new write path that deserves a deliberate
    design pass, not a bolt-on. *Design sketch:* `staff.presence` (enum:
    in_office/wfh/on_lunch/out/vacation), `presence_note`, `presence_updated_at`; a
    self-update RLS policy scoped to those columns for the linked user; a compact board
    on the Staff directory; set-your-status control in the top bar. Phone numbers
    (item 11) were the easy, standalone half of this bullet and shipped now.
14. **Ajera timesheet → weekly per-project work summaries** ("is there a way to link
    people's timesheets from Ajera to write a summary per project on what has been
    worked on weekly? be honest"). *Honest answer:* not from inside this app today.
    Deltek Ajera has no open API on the firm's current plan; integration would mean a
    scheduled export/import (CSV or the Ajera API add-on) into a new read-only store,
    plus the same data-governance boundary the intake AI required. It's a real project,
    but an **external-integration** one — out of scope for a UI sprint and dependent on
    Ajera access the office would need to provision first.

## Struck-through in the notes (intentionally ignored)

- Page 3 top: "NYSDOT permit ROW and/or Driveway requirements (see if it applies)" and
  "Zone change? Was previously ammended?" — both crossed out by the author; not acted on.
