-- 0032_companies_multi.sql
-- V5 — multi-company as a SHARED pool (not isolated tenants).
--
-- (1) Add the two sister firms. They exist only so their staff can sign in and
--     collaborate on the shared project pool — they own no projects of their own.
-- (2) Make the sign-in allowlist DATA-DRIVEN: handle_new_user() now permits any
--     email whose domain maps to a `companies` row, instead of a hardcoded list.
--     Onboarding firm #5 becomes a single INSERT — no code change ever again.
--
-- Visibility is unchanged: RLS stays `select using (true)`; everyone keeps seeing
-- and collaborating on every project. Company only drives branding / filtering /
-- reporting / ownership / dashboards.
--
-- Additive + IDEMPOTENT.

-- ── 1. Sister companies (sign-in domains only) ──────────────────────────────
insert into companies (key, name, domain, color) values
  ('pjo', 'PJO Surveying',    'pjosurvey.com',   '#6dacde'),
  ('aqi', 'Aquarii Lighting', 'aquariitech.com', '#b794e6')
on conflict do nothing;

-- ── 2. Data-driven sign-in allowlist ────────────────────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_domain text := lower(split_part(new.email, '@', 2));
  v_company_id smallint;
  v_role_id smallint;
begin
  -- The email domain must map to a known company. Adding a company row is the
  -- ONLY step needed to admit a new firm's staff — no code change.
  select id into v_company_id from public.companies where domain = v_domain;
  if v_company_id is null then
    raise exception 'Email domain % is not permitted', v_domain
      using errcode = 'check_violation';
  end if;

  -- New users default to Read Only; admins promote via Settings → Users.
  select id into v_role_id from public.roles where key = 'read_only';

  insert into public.users (id, email, full_name, avatar_url, role_id, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role_id,
    v_company_id
  );

  return new;
end;
$$;
