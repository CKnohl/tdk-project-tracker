-- 0010_indexes.sql
-- Secondary indexes for common query paths.

create index idx_projects_status         on projects (status);
create index idx_projects_company        on projects (company_id);
create index idx_projects_phase          on projects (phase);
create index idx_projects_workflow       on projects (workflow_state) where workflow_state <> 'normal';
create index idx_projects_manager        on projects (project_manager_id);
create index idx_projects_last_activity  on projects (last_activity_at);

create index idx_project_staff_staff     on project_staff (staff_id);
create index idx_project_contacts_project on project_contacts (project_id);

create index idx_tasks_project           on tasks (project_id);
create index idx_tasks_due               on tasks (due_date) where status not in ('completed', 'cancelled');
create index idx_tasks_status            on tasks (status);
create index idx_task_staff_staff        on task_staff (staff_id);

create index idx_submittals_project      on project_submittals (project_id);
create index idx_submittals_status       on project_submittals (status);
create index idx_submittals_followup     on project_submittals (follow_up_date);
create index idx_submittals_response_due on project_submittals (response_due_date);
create index idx_submittal_history_sub   on submittal_history (submittal_id, created_at desc);

create index idx_notes_project           on project_notes (project_id, created_at desc);
create index idx_files_project           on project_files (project_id, created_at desc);

create index idx_notifications_user_unread on notifications (user_id) where is_read = false;
create index idx_notifications_user_time on notifications (user_id, created_at desc);

create index idx_activity_project_time   on activity_logs (project_id, created_at desc);
create index idx_activity_actor_time     on activity_logs (actor_id, created_at desc);

create index idx_calendar_start          on calendar_events (start_at);
create index idx_calendar_project        on calendar_events (project_id);
