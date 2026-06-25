-- 0024_project_leads.sql
-- V3.2 Phase A — Project Leadership.
--
-- A project keeps ONE Project Manager (projects.project_manager_id) and now also
-- has zero or more Project Leads (this table). A Project Lead receives
-- project-manager permissions for THAT project only — their global role never
-- changes.
--
-- Permission model (important): the application adds every Lead to project_staff
-- (exactly like it already does for the PM), so Leads become project MEMBERS and
-- inherit the existing, tested member-level write policies on tasks, submittals,
-- project_phases, project_staff and projects. This migration therefore changes
-- NO existing RLS policy — it only adds the leadership table plus two helper
-- functions used by the app permission engine and by Phase B (task reviews).
--
-- Additive + IDEMPOTENT.

create table if not exists project_leads (
  project_id  uuid not null references projects(id) on delete cascade,
  staff_id    uuid not null references staff(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (project_id, staff_id)
);

create index if not exists idx_project_leads_staff on project_leads (staff_id);

alter table project_leads enable row level security;

-- Is the current user a Lead on project p?
create or replace function is_project_lead(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_leads pl
    where pl.project_id = p and pl.staff_id = current_staff_id()
  );
$$;

-- Can the current user manage project p? admin / PM-rank globally, the project's
-- PM, or a Lead on that project. (Used by Phase B task_reviews RLS + mirrored by
-- the app permission engine.)
create or replace function can_manage_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select has_min_rank(30)
      or exists (select 1 from public.projects pr where pr.id = p and pr.project_manager_id = current_staff_id())
      or is_project_lead(p);
$$;

-- Everyone authenticated reads leadership; only managers of the project edit it.
drop policy if exists project_leads_select on project_leads;
create policy project_leads_select on project_leads for select to authenticated using (true);

drop policy if exists project_leads_write on project_leads;
create policy project_leads_write on project_leads for all to authenticated
  using      (can_manage_project(project_id))
  with check (can_manage_project(project_id));

grant select, insert, update, delete on project_leads to authenticated, service_role;
