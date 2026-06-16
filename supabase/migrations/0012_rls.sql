-- 0012_rls.sql
-- Row Level Security. Internal ops tool: all authenticated app users may READ;
-- writes are gated by role rank (read_only=10, staff=20, project_manager=30, admin=40).

alter table companies          enable row level security;
alter table roles              enable row level security;
alter table staff              enable row level security;
alter table users              enable row level security;
alter table projects           enable row level security;
alter table project_staff      enable row level security;
alter table project_contacts   enable row level security;
alter table tasks              enable row level security;
alter table task_staff         enable row level security;
alter table project_submittals enable row level security;
alter table submittal_history  enable row level security;
alter table project_notes      enable row level security;
alter table project_files      enable row level security;
alter table notifications      enable row level security;
alter table activity_logs      enable row level security;
alter table calendar_events    enable row level security;
alter table settings           enable row level security;

-- ── companies ──────────────────────────────────────────────────────────────
create policy companies_select on companies for select to authenticated using (true);
create policy companies_write  on companies for all    to authenticated using (is_admin()) with check (is_admin());

-- ── roles ──────────────────────────────────────────────────────────────────
create policy roles_select on roles for select to authenticated using (true);
create policy roles_write  on roles for all    to authenticated using (is_admin()) with check (is_admin());

-- ── staff ──────────────────────────────────────────────────────────────────
create policy staff_select on staff for select to authenticated using (true);
create policy staff_insert on staff for insert to authenticated with check (has_min_rank(30));
create policy staff_update on staff for update to authenticated using (has_min_rank(30)) with check (has_min_rank(30));
create policy staff_delete on staff for delete to authenticated using (is_admin());

-- ── users ──────────────────────────────────────────────────────────────────
-- Readable by all authenticated (to render names); profile rows are created by
-- the SECURITY DEFINER trigger (bypasses RLS). Self may update own profile;
-- role/activation changes are blocked for non-admins by guard_user_role_change().
create policy users_select on users for select to authenticated using (true);
create policy users_update on users for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- ── projects ────────────────────────────────────────────────────────────────
create policy projects_select on projects for select to authenticated using (true);
create policy projects_insert on projects for insert to authenticated with check (has_min_rank(20));
create policy projects_update on projects for update to authenticated
  using      (has_min_rank(30) or (has_min_rank(20) and is_project_member(id)))
  with check (has_min_rank(30) or (has_min_rank(20) and is_project_member(id)));
create policy projects_delete on projects for delete to authenticated using (has_min_rank(30));

-- ── project_staff ───────────────────────────────────────────────────────────
create policy project_staff_select on project_staff for select to authenticated using (true);
create policy project_staff_write on project_staff for all to authenticated
  using      (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)))
  with check (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)));

-- ── project_contacts ────────────────────────────────────────────────────────
create policy contacts_select on project_contacts for select to authenticated using (true);
create policy contacts_insert on project_contacts for insert to authenticated with check (has_min_rank(20));
create policy contacts_update on project_contacts for update to authenticated
  using (has_min_rank(30) or created_by = auth.uid()) with check (has_min_rank(20));
create policy contacts_delete on project_contacts for delete to authenticated
  using (has_min_rank(30) or created_by = auth.uid());

-- ── tasks ───────────────────────────────────────────────────────────────────
create policy tasks_select on tasks for select to authenticated using (true);
create policy tasks_insert on tasks for insert to authenticated with check (has_min_rank(20));
create policy tasks_update on tasks for update to authenticated
  using      (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)))
  with check (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)));
create policy tasks_delete on tasks for delete to authenticated
  using (has_min_rank(30) or created_by = auth.uid());

-- ── task_staff ──────────────────────────────────────────────────────────────
create policy task_staff_select on task_staff for select to authenticated using (true);
create policy task_staff_write on task_staff for all to authenticated
  using (has_min_rank(20)) with check (has_min_rank(20));

-- ── project_submittals ──────────────────────────────────────────────────────
create policy submittals_select on project_submittals for select to authenticated using (true);
create policy submittals_insert on project_submittals for insert to authenticated with check (has_min_rank(20));
create policy submittals_update on project_submittals for update to authenticated
  using      (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)))
  with check (has_min_rank(30) or (has_min_rank(20) and is_project_member(project_id)));
create policy submittals_delete on project_submittals for delete to authenticated using (has_min_rank(30));

-- ── submittal_history (system-written via trigger; read-only to clients) ────
create policy submittal_history_select on submittal_history for select to authenticated using (true);

-- ── project_notes ───────────────────────────────────────────────────────────
create policy notes_select on project_notes for select to authenticated using (true);
create policy notes_insert on project_notes for insert to authenticated with check (has_min_rank(20));
create policy notes_update on project_notes for update to authenticated
  using (has_min_rank(30) or author_id = auth.uid()) with check (has_min_rank(20));
create policy notes_delete on project_notes for delete to authenticated
  using (has_min_rank(30) or author_id = auth.uid());

-- ── project_files (metadata) ────────────────────────────────────────────────
create policy files_select on project_files for select to authenticated using (true);
create policy files_insert on project_files for insert to authenticated with check (has_min_rank(20));
create policy files_delete on project_files for delete to authenticated
  using (has_min_rank(30) or uploaded_by = auth.uid());

-- ── notifications (owner-scoped) ────────────────────────────────────────────
create policy notif_select on notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on notifications for delete to authenticated using (user_id = auth.uid());

-- ── activity_logs (read-all; written only by SECURITY DEFINER triggers) ─────
create policy activity_select on activity_logs for select to authenticated using (true);

-- ── calendar_events ─────────────────────────────────────────────────────────
create policy calendar_select on calendar_events for select to authenticated using (true);
create policy calendar_insert on calendar_events for insert to authenticated with check (has_min_rank(20));
create policy calendar_update on calendar_events for update to authenticated
  using (has_min_rank(30) or created_by = auth.uid()) with check (has_min_rank(20));
create policy calendar_delete on calendar_events for delete to authenticated
  using (has_min_rank(30) or created_by = auth.uid());

-- ── settings ────────────────────────────────────────────────────────────────
create policy settings_select on settings for select to authenticated
  using (scope = 'global' or user_id = auth.uid());
create policy settings_insert on settings for insert to authenticated
  with check ((scope = 'global' and is_admin()) or (scope = 'user' and user_id = auth.uid()));
create policy settings_update on settings for update to authenticated
  using ((scope = 'global' and is_admin()) or (scope = 'user' and user_id = auth.uid()))
  with check ((scope = 'global' and is_admin()) or (scope = 'user' and user_id = auth.uid()));
create policy settings_delete on settings for delete to authenticated
  using ((scope = 'global' and is_admin()) or (scope = 'user' and user_id = auth.uid()));
