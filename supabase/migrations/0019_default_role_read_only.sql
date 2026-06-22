-- 0019_default_role_read_only.sql
-- FIX: new first-time Microsoft OAuth users must default to Read Only.
--
-- The original handle_new_user() (migration 0011) assigned every new user the
-- 'project_manager' role. This replaces it so new users get 'read_only'.
-- Admins promote people afterward via Settings → Users.
--
-- Safe / idempotent: CREATE OR REPLACE only redefines the function. It does NOT
-- touch any existing rows — current users keep their roles. The
-- on_auth_user_created trigger (0011) already points at this function, so no
-- trigger changes are needed.

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_domain text := lower(split_part(new.email, '@', 2));
  v_company_id smallint;
  v_role_id smallint;
begin
  if v_domain not in ('tdkengineering.com', 'mpengineers.com') then
    raise exception 'Email domain % is not permitted', v_domain
      using errcode = 'check_violation';
  end if;

  select id into v_company_id from public.companies where domain = v_domain;
  -- Default role is now Read Only (was 'project_manager').
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
