# Deployment checklist

Work top to bottom. Nothing here is automated — each step needs your accounts/credentials.

## 1. Supabase project
- [ ] Create a Supabase project (region close to Upstate NY, e.g. `us-east-1`).
- [ ] Copy **Project URL**, **anon/publishable key**, **service_role key** (Settings → API).
- [ ] Install CLI: `npm i -g supabase`, then `supabase login`.
- [ ] `supabase link --project-ref <ref>`.

## 2. Apply schema + seed
- [ ] `supabase db push` (applies migrations `0001`–`0016`).
- [ ] Confirm in the dashboard: 17 tables, 5 views, the `project-files` storage bucket, RLS enabled on every table.
- [ ] Verify seed: `select count(*) from projects;` → **24**, `select count(*) from staff;` → **16**, `roles` → **4**, `companies` → **2**.
- [ ] `npm run types:gen` to replace the hand-written `types/database.types.ts` with the generated one.

## 3. Microsoft (Azure AD) OAuth
- [ ] Azure Portal → App registrations → New registration (multi-tenant or both directories).
- [ ] Add redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
- [ ] Create a client secret; copy value.
- [ ] Supabase → Authentication → Providers → **Azure**: enable, paste Client ID + Secret, scopes `openid email profile`.
- [ ] Supabase → Authentication → URL Configuration: set **Site URL** to your Vercel domain; add `http://localhost:3000` + the Vercel domain to redirect allow-list.

## 4. Admin bootstrap
- [ ] Sign in once with the owner's `@tdkengineering.com` account (provisions as Project Manager).
- [ ] Run the commented `UPDATE` in `0015_seed.sql` with the real email to promote to **Admin**.
- [ ] In the app: Settings → Users & Roles → link each login to its staff directory entry (required for My Work + assignment notifications).

## 5. Environment variables (Vercel → Project → Settings → Environment Variables)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Production + Preview only; never client-exposed)
- [ ] `NEXT_PUBLIC_SITE_URL` = your Vercel URL
- [ ] `CRON_SECRET` = long random string
- [ ] Mirror these in `.env.local` for local dev.

## 6. Deploy
- [ ] Push to GitHub, import into Vercel.
- [ ] Confirm build passes (`next build`).
- [ ] `vercel.json` registers the daily cron `0 12 * * *` → `/api/cron/notifications`; confirm it appears under Project → Cron Jobs.
- [ ] Trigger the cron once manually (`curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/notifications`) and confirm a JSON `{created: n}` response.

## 7. Branding (optional but recommended)
- [ ] Replace `public/icons/icon-192.png` / `icon-512.png` / `icon.svg` with the real TDK logo (or re-run `node scripts/gen-icons.mjs` after editing it).

## 8. Production smoke test
- [ ] Sign in with an allowed domain → lands on `/dashboard`.
- [ ] Sign in attempt with a non-allowed domain → blocked at `/auth/auth-error`.
- [ ] Install as a PWA on one phone + one desktop.
- [ ] Run the full testing checklist (`docs/TESTING.md`) with 3 accounts.
