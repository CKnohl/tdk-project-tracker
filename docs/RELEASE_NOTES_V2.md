# TDK Project Tracker — Release Notes

**Version 2.0 · Release Date: June 2026 · Internal Distribution**

Version 2 focuses on day-to-day usability for project managers and staff: a place for office work that isn't tied to a project, repeating tasks, faster access to details, customizable project timelines, and a more accurate dashboard.

---

## New Features

- **General Tasks** — A new area in the sidebar for office and administrative work that doesn't belong to a specific project (filing, CAD/standards updates, ordering supplies, internal meetings). General tasks support assignment, due dates, completion tracking, and notifications — just like project tasks.
- **Recurring Tasks** — Any task can now be set to repeat **Daily, Weekly, Monthly, or Yearly**. When you complete a recurring task, the next one is created automatically, so routine work never falls off the list.
- **Task & Submittal Detail View** — Click any task or submittal card to open a clean, read-only details window showing the name, status, assigned staff, dates, description, notes, and history. You no longer have to open "Edit" just to read information. Editing remains a separate action.
- **Editable Project Timelines** — Each project's phases can now be customized directly on the **Timeline** tab: add, rename, reorder, delete, and mark the current phase. New projects still start from the standard 12-phase template.

## Improvements

- **Clearer submittal dates** — Labels were renamed for clarity: *Submitted → Date Submitted*, *Response Due → Due Date*, *Follow Up → Follow-Up Date*. The **Due Date** is now the most prominent date on each submittal card.
- **Dashboard includes submittals** — The Due Today, Due This Week, and Overdue cards now show both **tasks and submittals**, so nothing time-sensitive is missed.
- **View without edit rights** — Read-only users (and anyone) can now open full task and submittal details. Previously, reading the full description required edit access.

## Getting Started with New Features

- **General Tasks** are in the new **Tasks** tab in the left navigation.
- **Recurring Tasks** can be set when creating or editing a task — choose how often it repeats under "Repeats."
- **Tasks and Submittals** can now be **clicked to view full details** without entering Edit.
- **Project Timelines** can be edited directly from the **Timeline** tab on any project.

## Bug Fixes

- **Dashboard date filters corrected** — *Overdue* now shows items due before today, *Due Today* shows today's items, and *Due This Week* shows the next seven days. The cards no longer overlap or skip items.
- **New-user permissions fixed** — New accounts now default to **Read Only**. Previously, some new users were created with Project Manager access by mistake. Administrators grant higher access as needed.

## Database Changes

Three behind-the-scenes updates were applied to support the new features: project-less tasks, a "repeat" setting on tasks, and a per-project phase list. **All changes are additive** — no existing project, task, submittal, report, or user information was changed, moved, or deleted.

## User Impact

| Role | What changes |
|---|---|
| **Project Managers / Management** | New General Tasks area; click-to-view details; customizable project timelines; more accurate dashboard cards. |
| **Staff** | Can read full task/submittal details without edit rights; assigned general and recurring tasks appear in My Work and workload. |
| **Read Only** | Can now read full details (still cannot make changes). |
| **Everyone** | Sign-in is unchanged. No action required to start using the new features. |

## Administrator Notes

- **New users default to Read Only.** Promote people to Staff, Project Manager, or Admin under **Settings → Users**.
- **Email notifications remain paused** pending verification of the company email domain (a one-time IT/DNS step). In-app notifications are fully working in the meantime.
- The three database updates must be applied **in order, before the release goes live** (handled during deployment).
- After the update, confirm that a brand-new test sign-in lands as **Read Only**.

## Known Limitations

- **General Tasks do not yet appear on the Calendar.** They do appear on the Dashboard and in staff workload.
- **Recurring tasks need a due date** to schedule the next occurrence; the next date is calculated from the previous due date.
- **Email delivery is paused** until the company email domain is verified; this affects emailed notifications and reports only — in-app features are unaffected.

## What's Coming Next

- **Email Notifications** — delivery of assignment and report emails, pending company domain (DNS) verification.
- **Calendar integration for General Tasks** — so office tasks appear alongside project deadlines.
- **Additional workflow and reporting enhancements.**

## Document History

| Version | Date | Description |
|---|---|---|
| 2.0 | June 2026 | Initial Version 2 release |

---

*TDK Engineering Associates, PC — Internal & Confidential — Version 2.0*
