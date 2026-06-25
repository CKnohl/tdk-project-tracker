# TDK Project Tracker — V3 Product Polish Handoff

A product-polish pass (not a redesign). The app's design system was already
mature, so this sprint added a few high-leverage, low-risk improvements and
documents a prioritized backlog for the rest. TypeScript + production build pass.

## Philosophy
Changes were made at the **shared-primitive / app-shell** level so the whole app
benefits at once, rather than editing dozens of page files blind (the app is
OAuth-gated and can't be run/screenshotted here, so subjective per-pixel visual
tweaks are deferred to recommendations rather than guessed at).

## What shipped this sprint (4 files)

### 1. Global command palette (⌘K) — flagship
- **File:** `components/layout/search-command.tsx` (upgraded in place; no new deps).
- **Before:** ⌘K opened a project-only search.
- **After:** ⌘K is a true command palette with grouped, keyboard-driven results:
  - **Actions** — New project, New general task.
  - **Projects** — live search (name/number) with status rail + label.
  - **Staff** — live "jump to staff member" search.
  - **Go to** — every nav destination (Dashboard, My Work, Projects, Tasks, Calendar, Archive, Staff, Notifications, Settings).
  - Footer key hints (↑↓ navigate · ↵ open · esc close); active row auto-scrolls into view.
- **Reasoning:** at 300–500 projects, keyboard-first navigation is dramatically faster than menu-clicking and is the single biggest "premium SaaS" signal. Built dependency-free (no `cmdk`) to avoid an install step (the local npm shim is broken).
- **Regression:** same public component name/usage in the topbar; toggle and project-search behavior preserved, only extended. No data writes.

### 2. Subtle page transitions
- **Files:** `components/layout/page-transition.tsx` (new), `components/layout/app-shell.tsx` (wraps `{children}`).
- **Before:** route changes swapped content instantly.
- **After:** each page entrance plays a 300ms fade + 4px rise, keyed on `pathname` (so in-page filtering does **not** re-animate). Gated behind `motion-safe:` (respects `prefers-reduced-motion`).
- **Reasoning:** smooth, professional motion without flash; matches the existing tasteful animation language (`card-hover`, button `active:scale`).
- **Regression:** keying on pathname remounts the content subtree per navigation — pages are server-rendered fresh anyway, so no state is lost. Reduced-motion users get no animation.

### 3. Project-detail breadcrumb
- **File:** `components/projects/detail/project-header.tsx`.
- **Before:** a lone "← Projects" back link.
- **After:** `← Projects / <project_number>` breadcrumb (`<nav aria-label="Breadcrumb">`). The "Projects" crumb keeps the filter-restoring `backHref` from V2.2.
- **Reasoning:** answers "can users always tell where they are?" and reads more like a SaaS app; near-zero risk.
- **Regression:** none — same link target, added a non-interactive current crumb.

## Verification
- **TypeScript:** `tsc --noEmit` clean.
- **Production build:** `next build` clean (Next 15.5.19, 25/25 pages).
- Build/run caveats unchanged: use the full node path for tools; Supabase MCP cannot reach the TDK DB (`grpfdtomncopqslrwpem`).

## Senior-designer review — current state & prioritized backlog
The product is already well above "internal tool" baseline: solid token system +
dark mode, consistent `PageHeader`, button variants for hierarchy, `MetaBadge`
chips, the signature status-rail system, calm-until-work dashboard, reduced-motion
support, responsive sidebar→Sheet. Backlog (highest value first), none started:

1. **Command-palette reach** — add "create task in <project>" and "assign work" once a project context exists; optional `c` shortcut to create. (Now that the palette exists, these are cheap.)
2. **Unsaved-changes guard** — still no dirty-tracking/`beforeunload` on dialog forms (carried from V2.3). Product decision.
3. **Icon-button affordances** — audit icon-only buttons for `aria-label` + tooltips (some have them, e.g. sidebar collapse; tabs/row actions are inconsistent).
4. **Empty states** — `EmptyState` is used widely; standardize a CTA in each (e.g. "Add the first task") for consistency.
5. **Active-nav polish** — sidebar active item is a solid primary block; a thin left accent indicator would feel more Linear-like (subjective — verify live).
6. **Contrast pass** — `muted-foreground` on subtle backgrounds is borderline for WCAG AA in a few dense rows; verify with a contrast checker on the running app.
7. **Density** — dashboard/list spacing is comfortable; a future "compact" density toggle would suit power users with many projects.

These are deliberately left as recommendations because they're either subjective
(need the app visibly running) or product decisions — implementing them blind
risks the "do not redesign / keep subtle" constraint.

## Files changed
- `components/layout/search-command.tsx` (palette upgrade)
- `components/layout/page-transition.tsx` (new)
- `components/layout/app-shell.tsx` (mount PageTransition)
- `components/projects/detail/project-header.tsx` (breadcrumb)

## Database / migrations
- **None.** No schema or query changes this sprint.
