# TDK Project Tracker

Engineering operations platform for **TDK Engineering** and **M&P Engineers** — project tracking, deadlines, municipal submittals, team coordination, staff workload, client follow-ups, proposals, and a unified calendar. Installable PWA.

Built with **Next.js 15 (App Router)** · TypeScript · Tailwind · shadcn/ui · **Supabase** (Postgres + Auth + Storage) · React Query · Server Actions · Vercel.

---

## Features

- **Microsoft (Azure AD) sign-in**, restricted to `@tdkengineering.com` and `@mpengineers.com`. First login provisions a **Project Manager** account; admins manage roles.
- **Role-based access** (Admin / Project Manager / Staff / Read Only) enforced with Postgres **RLS**.
- **Projects** with status (Active / On Hold / Inactive), engineering **phase**, and a flexible **workflow state** (Normal / Awaiting Response / Needs Follow-Up / Urgent Follow-Up).
- **Tasks, Submittals, Contacts, Files, Notes, History, Timeline, Staff** per project.
- **Dashboard** widgets + month calendar, plus a personal **My Work** center.
- **Follow-Up Needed**, **Staff Workload**, **Awaiting Response**, **Activity Feed**, global ⌘K search.
- **Notifications** (daily cron) + activity logging via DB triggers.
- **PWA**: manifest, service worker, offline shell, installable on iPhone/iPad/Android/Desktop.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables (`.env.local`)

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (publishable/anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**server only**) |
| `NEXT_PUBLIC_SITE_URL` | e.g. `http://localhost:3000` |
| `CRON_SECRET` | any long random string |

---

## Database

Migrations live in `supabase/migrations` (`0001`–`0016`). Apply them with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

`0015`/`0016` seed companies, the 4 roles, the 16-person staff directory, and the initial 24-project portfolio. After your first login, promote the owner to **Admin** (see the commented statement in `0015_seed.sql`).

Regenerate types after schema changes:

```bash
npm run types:gen
```

---

## Microsoft OAuth

In **Supabase → Authentication → Providers → Azure**:

1. Register an app in Azure (multi-tenant or covering both directories).
2. Add redirect URL `https://<your-ref>.supabase.co/auth/v1/callback`.
3. Paste the Azure **Client ID** and **Client Secret** into Supabase, scopes `openid email profile`.

Domain restriction is enforced three ways: the login UI, the `/auth/callback` check, and the authoritative `handle_new_user()` DB trigger (which blocks account creation for other domains).

---

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add the environment variables above (Production + Preview).
3. `vercel.json` registers a daily cron at 12:00 UTC hitting `/api/cron/notifications` (authorized via `CRON_SECRET`).
4. Set the Supabase Auth **Site URL** and redirect URLs to your Vercel domain.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run types:gen` | Regenerate `types/database.generated.ts` (raw schema; `types/database.types.ts` derives the app-facing types from it) |
| `node scripts/gen-icons.mjs` | Regenerate PWA PNG icons |
