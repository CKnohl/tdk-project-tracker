# TDK Project Tracker — V3.4 Product Polish Handoff

Polish only — no new features, no redesign, no DB changes. Focused on the
highest-certainty, app-wide wins (accessibility + shared-primitive animation),
with an audit of the subjective items. TypeScript ✓ · Production build ✓.

## Root cause / approach
The design system is already mature (tokens, dark mode, `PageHeader`, button
variants, `MetaBadge`, status rails, `card-hover`, reduced-motion-aware
keyframes, page transitions). The remaining gaps that are **objective and
verifiable** were (1) accessibility — many icon-only buttons had no accessible
name — and (2) two shared overlay primitives animated with a plain fade. Both
fix app-wide from a small, low-risk surface. Subjective spacing/density tuning
is documented rather than guessed at blind (can't render the app here).

## Implemented

### P7 — Accessibility: accessible names on icon-only buttons
~24 icon buttons that previously announced nothing now have `aria-label`:
- Project detail tabs: tasks (edit/delete), submittals (edit/delete), contacts (edit/delete), files (download/delete), notes (delete), timeline (save/cancel/move-up/move-down/rename/delete phase).
- General tasks (edit/delete), calendar events (edit/delete), settings → staff (edit), notifications (mark read·unread/delete), project header (more actions), review queue (approve/reject), staff workload cards (remove assignment/remove from project).
- Verified existing labels are correct: theme toggle, mobile menu, notification bell, calendar prev/next.

### P2 — Animation polish (shared primitives → app-wide)
- `components/ui/dialog.tsx`: dialogs now `zoom-in-95` / `zoom-out-95` on open/close (subtle scale, the standard shadcn dialog feel) on top of the existing fade.
- `components/ui/dropdown-menu.tsx`: dropdowns now `zoom` + directional `slide-in` (`data-[side=…]`), matching the shadcn default. Every `DropdownMenu` and the project actions menu benefit.
- (Already present and verified: button `active:scale-[0.98]`, `card-hover` lift, `motion-safe` page transitions, rail pulses, Radix tab/dialog state animations.)

## Files changed
`components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, and aria-labels in:
`components/projects/detail/{tasks,submittals,contacts,files,notes,timeline}-tab.tsx`, `components/projects/detail/project-header.tsx`, `components/tasks/general-tasks-view.tsx`, `components/calendar/events-list.tsx`, `components/settings/staff-manager.tsx`, `components/notifications/notifications-list.tsx`, `components/dashboard/review-queue.tsx`, `components/staff/staff-tasks-card.tsx`, `components/staff/staff-projects-card.tsx`.

## Audit findings (P1, P3–P6, P8, P9)
- **P1 Consistency:** strong baseline; dialogs/dropdowns are now consistently animated. Remaining items (exact page paddings/shadows) are subjective and best tuned with the app visible — no blind changes made.
- **P3 Microinteractions:** autofocus present (⌘K palette, reject dialogs, timeline rename); scroll restoration on Projects (V2.3); sort/filter persistence (V3.3). **Gap:** expanded-section/tab state isn't remembered across navigation → recommendation.
- **P4 Density / P5 Dashboard:** the dashboard is calm-until-work with a Priority-Focus row (Overdue/Today/Week) + Needs Attention + Waiting; the Command Center gives 5-second project health. Reasonable for all four roles; no layout change needed.
- **P6 Mobile/tablet:** sidebar→Sheet, responsive grids, dialogs use `max-w` + `max-h-[90vh]` + scroll. **Note:** icon hit targets are 28–32px (below the 44px touch ideal) — acceptable for desktop-primary; flag for a future tablet pass.
- **P8 Performance:** `getProjectDetail` cached, `staleTimes` warm nav, dead queries already trimmed. No new duplication. Bundle unchanged (these edits add only attributes/classes).
- **P9 Product review:** the a11y + animation fixes are the concrete "feels finished" wins this pass.

## Regression analysis
- All changes are **additive attributes / utility classes** — no logic, props, data, or layout structure changed. `aria-label` is invisible to sighted users; the zoom/slide classes are tailwindcss-animate utilities already used elsewhere. Build confirms no impact.

## Performance impact
- None measurable (no JS/query changes; a few extra static classes).

## Accessibility impact
- Significant: screen readers now announce every icon-only action. Focus-visible rings and `motion-safe` page transitions already in place. (Note: the Radix dialog/dropdown `animate-in` classes are not `prefers-reduced-motion`-gated — consistent with prior behavior; a global reduced-motion gate is a recommended follow-up.)

## QA checklist
- [ ] Tab to each icon button (edit/delete/move/approve/etc.) — a screen reader announces a meaningful name.
- [ ] Open any dialog / dropdown — subtle zoom/slide, no flicker; closes cleanly.
- [ ] Reduced-motion OS setting: page transitions don't animate (existing behavior preserved).
- [ ] No visual regressions on Projects, Project detail tabs, Staff, Calendar, Notifications, Settings.

## Deployment checklist
1. No migration / env changes. Commit + push → Vercel deploys.
2. Spot-check the QA checklist.

## Five highest-impact improvements remaining before Version 4.0
1. **Turn on email / digest delivery (verify the Resend domain).** A commercial product must reach users outside the app — review requests, approvals, and deadline changes should arrive by email/daily digest. The layer exists and is paused on DNS only.
2. **Unified project timeline / Gantt** (phases + submittals + municipal/permit deadlines on one axis). The signature civil-engineering view; the biggest situational-awareness gain and a clear demo differentiator.
3. **Complete multi-company support + scoping** (Aquarii, PJO — pending domains). Needed before the product can be sold to or run for more than the two founding firms.
4. **Make general tasks first-class** (calendar feed + My Work links). Today they're excluded from the calendar and link to `#` — a visible rough edge for a daily tool.
5. **Accessibility/compliance pass to a stated bar** (global `prefers-reduced-motion` gating, WCAG AA contrast audit on muted text + 44px touch targets, automated a11y checks in CI). Required to credibly claim accessibility for a commercial sale.

## Caveats unchanged
Full node path for tooling; Supabase MCP can't reach the TDK DB (`grpfdtomncopqslrwpem`).
