# TDK Project Tracker — Project Handoff

_Last updated: this session. Read this first when resuming work._

## 1. What this is
Internal engineering operations platform for **TDK Engineering** + **M&P Engineers**: projects, tasks, municipal submittals, contacts, files, notes, calendar, staff workload, notifications. Next.js 15 (App Router) + TypeScript + Tailwind + shadcn-style UI + Supabase (Postgres/Auth/Storage). Installable PWA.

## 2. Current state (working)
- Auth (Microsoft/Azure OAuth, domain-restricted to `@tdkengineering.com` / `@mpengineers.com`), roles, RLS — all working.
- **Supabase grants applied** (`0017_grants.sql`) — this was the "dashboard shows zeros" root cause (Postgres `42501`). If counts ever go to 0 again, check grants first.
- Dashboard live counts: Active 20 · Waiting on Others 5 · On Hold 2 · Inactive 2.
- Current user `cknohl@tdkengineering.com` linked to **Connor Knohl** staff record → My Work works.
- `tsc --noEmit` clean; `next build` green (22 routes).

## 3. Run it locally
Node is a **portable install at `C:\Users\ConnorKnohl\node`** (not on PATH). Prefix commands:
```powershell
$env:Path = "C:\Users\ConnorKnohl\node;" + $env:Path
npm install
npm run dev      # http://localhost:3000 (uses .env.local)
npm run build    # production build
npx tsc --noEmit # typecheck
```
`.env.local` holds the real Supabase URL/keys (already configured). `.env.example` documents all 5 vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`.

## 4. Git
- Branches: `main`, `development`, current working branch **`feature/project-creation`**. Tag **`v0.1.0`**.
- Not yet committed this UI session — **commit `feature/project-creation` before deploying.** Nothing is pushed for the v0.2–v0.4 UI work yet.

## 5. Architecture map
- `app/(app)/*` — authed pages (dashboard, my-work, projects, calendar, archive, staff, notifications, settings). Shell: `components/layout/app-shell.tsx` (client; collapsible sidebar state in localStorage) wraps `sidebar.tsx` + `topbar.tsx`.
- `app/(auth)/login`, `app/auth/callback` — auth flow. `middleware.ts` guards routes.
- `lib/data/*` — server data fetchers (dashboard, my-work, projects, staff, reference). `lib/actions/*` — server actions (mutations). `lib/supabase/{server,client,admin,middleware}.ts`.
- `lib/constants.ts` — badge metadata. `lib/status-rail.ts` — rail color/priority logic. `lib/utils.ts` — formatters, `cn`, `formatCompanyTag` (mp→M&P).
- `types/database.types.ts` — **hand-written** (regenerate with `npm run types:gen` once CLI is linked).
- `supabase/migrations/0001–0017` — schema, triggers, RLS, views, seed, **grants**.

## 6. Key gotchas (don't relearn these)
- **Grants:** every `public` table/view needs `GRANT SELECT` to `authenticated` (and service_role). `0017_grants.sql` does it. Missing = `42501` = silent zeros (data layer swallows errors via `?? 0/[]`).
- **supabase-js ↔ @supabase/ssr version mismatch:** `lib/supabase/{client,server}.ts` cast `as unknown as SupabaseClient<Database>` — leave it.
- **Embedded selects** use `.returns<T>()` because the hand-written `Database` type has no relationship metadata.
- **Logo swap:** master is `H:\Company Logos\TDK Logos\Current\TDK LOGO - STACKED\tdk_logo_RGB 2400dpi 4COLOR.jpg`. To replace: `node -e "require('sharp')('<path>').resize({width:700}).png().toFile('public/brand/tdk-logo.png')"`. `Logo` is className-driven; update `LOGO_W/LOGO_H` in `components/shared/logo.tsx` if aspect changes. Arrow mark (`public/brand/tdk-arrow.png`) drives icons + collapsed sidebar.
- **Icons:** `scripts/gen-app-icons.mjs` (sharp) generates favicon/Android/Apple/maskable from the arrow. Apple icons use navy `#081224` bg.
- **Diagnostics:** `scripts/{diagnose,audit}.mjs` query the live DB (read `.env.local`, print no secrets) — handy for permission/row-count debugging.

## 7. Done in the UI passes (v0.2–v0.4)
Logo system (master logo, favicon, PWA icons, splash, collapsible sidebar w/ arrow), M&P naming, dashboard simplification (KPIs → Priority focus → Needs Attention/Waiting on Others → Recently Completed; removed My Work/Recently Updated/Calendar/Activity/Workload from dashboard), conditional priority cards (calm when empty, red+pulse overdue, etc.), priority badges (badge-only color), Active "LIVE" pill, **project card status rail** (rail color = highest-priority state; on cards, archive, project rows, search), notification filters (unread + type), My Work tabs (Tasks/Projects/Deadlines/Submittals), project-form Scope field, hover/press polish.

## 8. Not implemented / pending (priority order)
1. **Vercel deploy** — checklist in `docs/DEPLOYMENT.md`. Verify env, OAuth redirect URLs, that `0017` is applied, cron, PWA audit.
2. **Notification expansion** (user approved DB changes) — design in `docs/` chat: `0018` enum values (task_completed, task_due_today, project_status_changed, submittal_due_soon/overdue, waiting_aging, attention_aging) + triggers + cron extensions + bell badge weighted to critical. **Filter UI already built.**
3. **Executive KPIs** — recommended set: Open Tasks, Upcoming Submittals, Overdue Submittals, Avg Follow-Up Age (`now − workflow_state_since`), Awaiting Municipal Review (`phase='municipal_review'`). Avg Response Time needs submittal_history math (phase 2).
4. **Real-device mobile testing** (iPhone SE→15 Pro Max, iPad). Likely tight spot: calendar month grid ≤375px.
5. Global search/quick actions expansion (currently projects-only ⌘K).

## 9. Known minor issues
- `lib/data/dashboard.ts` still fetches `upcoming`/`recentProjects`/`workload`/`activity` though the simplified dashboard no longer renders all of them — harmless extra queries; trim if desired.
- "Recently Completed → completed by" uses task **assignees** (no `completed_by` column). Add a column + populate in `setTaskStatus` if exact actor is needed.
- `react-hook-form` installed but unused (forms use manual state).
- Dark-mode sidebar logo sits on a white plate (official logo has white bg). Chroma-key to transparent if a plate-less look is preferred.
- No automated tests.

## 10. Deploy sequence (when ready)
Commit `feature/project-creation` → push → `npm run build` → merge to `development` → merge to `main` → import to Vercel → set env vars → set Supabase Site URL + redirect allowlist → verify OAuth + a dashboard query + cron + PWA install.
