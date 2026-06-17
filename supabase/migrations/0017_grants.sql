-- 0017_grants.sql
-- ROOT CAUSE FIX for "dashboard shows zeros".
--
-- The schema migrations (0001–0016) never issued GRANTs and relied on Supabase's
-- automatic default privileges. On this project those privileges did not reach
-- the API roles, so the `authenticated` role had SELECT on `users`/`roles` only
-- (enough for login + role resolution) but NOT on the data tables. PostgREST
-- therefore returned Postgres error 42501 (permission denied) for every
-- projects/tasks/submittals/view query — BEFORE RLS or any row was evaluated —
-- and the dashboard's `?? 0` / `?? []` fallbacks turned those errors into zeros.
--
-- Row-level visibility is still enforced by the RLS policies in 0012. These
-- GRANTs only restore the table-level privileges PostgREST checks first.

grant usage on schema public to anon, authenticated, service_role;

-- Table + view privileges (ALL TABLES also covers views).
grant select on all tables in schema public to anon, authenticated, service_role;
grant insert, update, delete on all tables in schema public to authenticated, service_role;

-- Sequences + functions.
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Ensure objects created by FUTURE migrations inherit the same grants.
alter default privileges in schema public
  grant select on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
