-- 0029_guard_staff_link.sql
-- V4.4 P2-1 (HIGH) — close the self-service privilege-escalation hole.
--
-- RLS users_update (0012) lets a user update their OWN row (id = auth.uid()), and
-- guard_user_role_change() (0011) previously blocked ONLY role_id and is_active.
-- staff_id was unguarded, so a non-admin could PATCH /users?id=eq.<self> and set
-- their staff_id to another person's (e.g. a Project Manager's). Because
-- current_staff_id() resolves users.staff_id, that grants is_project_member /
-- can_manage_project / Lead powers and reroutes notifications — a real escalation
-- through the PostgREST layer even though the UI never exposes it.
--
-- Fix: the guard trigger now also rejects staff_id and company_id changes by
-- non-admins. The admin path linkUserStaff() (requireAdmin) and the SECURITY
-- DEFINER provisioning trigger (handle_new_user, INSERT — not covered by this
-- BEFORE UPDATE trigger) are unaffected: an admin caller satisfies is_admin().
--
-- IDEMPOTENT: replaces the function body in place; the existing trg_guard_user_role
-- trigger keeps calling it by name. Safe to run multiple times.

create or replace function guard_user_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role_id is distinct from old.role_id and not is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  if new.is_active is distinct from old.is_active and not is_admin() then
    raise exception 'Only admins can change user activation';
  end if;
  -- V4.4: staff_id drives current_staff_id() (project membership, lead/PM powers,
  -- notification routing) — only admins may (re)link a user to a staff profile.
  if new.staff_id is distinct from old.staff_id and not is_admin() then
    raise exception 'Only admins can change a user''s staff link';
  end if;
  -- company_id participates in scoping/branding and is admin-managed; lock it too.
  if new.company_id is distinct from old.company_id and not is_admin() then
    raise exception 'Only admins can change a user''s company';
  end if;
  return new;
end;
$$;
