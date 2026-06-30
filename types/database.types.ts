// Hand-authored to match supabase/migrations. After linking the project, this
// file can be regenerated with: npm run types:gen
//
// NOTE: Row/Insert/Update shapes use `type` aliases (not `interface`) on
// purpose — interfaces are not assignable to `Record<string, unknown>` and
// would fail supabase-js's GenericTable/GenericSchema constraint.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProjectStatus = 'active' | 'on_hold' | 'inactive';
export type ProjectPhase =
  | 'proposal' | 'survey' | 'existing_conditions' | 'concept_design'
  | 'engineering_design' | 'client_review' | 'municipal_review' | 'permitting'
  | 'bidding' | 'construction' | 'closeout' | 'completed';
export type WorkflowState = 'normal' | 'awaiting_response' | 'needs_follow_up' | 'urgent_follow_up';
export type InactiveReason = 'completed' | 'lost_bid' | 'cancelled' | 'fell_through';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'in_review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type SubmittalStatus =
  | 'drafting' | 'ready_to_submit' | 'submitted' | 'awaiting_response'
  | 'revision_required' | 'approved' | 'rejected';
export type NotificationType =
  | 'task_due_tomorrow' | 'task_overdue' | 'submittal_awaiting_too_long'
  | 'project_assigned' | 'task_assigned' | 'project_updated' | 'follow_up_due'
  | 'task_completed' | 'deadline_changed'
  | 'review_requested' | 'task_approved' | 'task_rejected';
export type ActivityEntity = 'project' | 'task' | 'submittal' | 'file' | 'note' | 'contact' | 'status';
export type ActivityAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'unassigned' | 'restored' | 'commented';
export type CalendarEventType =
  | 'deadline' | 'meeting' | 'submittal' | 'site_visit' | 'follow_up' | 'milestone' | 'custom'
  | 'presentation' | 'town_meeting' | 'inspection';
export type ContactRole =
  | 'client' | 'attorney' | 'contractor' | 'surveyor' | 'planner'
  | 'municipal_reviewer' | 'architect' | 'engineer' | 'inspector' | 'other';

type Timestamps = { created_at: string; updated_at: string };

export type CompanyRow = { id: number; key: string; name: string; domain: string; color: string | null; created_at: string };
export type RoleRow = { id: number; key: string; name: string; rank: number; description: string | null };
export type StaffRow = Timestamps & {
  id: string; full_name: string; first_name: string | null; last_name: string | null;
  initials: string | null; email: string | null; company_id: number | null; user_id: string | null; is_active: boolean;
};
export type UserRow = Timestamps & {
  id: string; email: string; full_name: string | null; avatar_url: string | null;
  role_id: number; company_id: number | null; staff_id: string | null; is_active: boolean;
};
export type ProjectRow = Timestamps & {
  id: string; project_number: string; name: string; company_id: number;
  status: ProjectStatus; phase: ProjectPhase; workflow_state: WorkflowState; workflow_state_since: string | null;
  description: string | null; scope: string | null; project_manager_id: string | null;
  target_completion_date: string | null; inactive_reason: InactiveReason | null;
  last_activity_at: string; created_by: string | null; current_phase_name: string | null;
};
export type ProjectStaffRow = { project_id: string; staff_id: string; role_on_project: string | null; assigned_at: string };
export type ProjectLeadRow = { project_id: string; staff_id: string; assigned_at: string };
export type ProjectContactRow = Timestamps & {
  id: string; project_id: string; name: string; company: string | null; email: string | null;
  phone: string | null; role: ContactRole; notes: string | null; created_by: string | null;
};
export type TaskRow = Timestamps & {
  id: string; project_id: string | null; name: string; description: string | null;
  priority: TaskPriority; status: TaskStatus; due_date: string | null; start_date: string | null; completion_pct: number;
  notes: string | null; created_by: string | null; completed_at: string | null;
  recurrence: TaskRecurrence;
  prior_status: TaskStatus | null; review_requested_at: string | null; review_requested_by: string | null;
};
export type TaskStaffRow = { task_id: string; staff_id: string };
export type TaskReviewAction = 'submitted' | 'approved' | 'rejected';
export type TaskReviewRow = {
  id: string; task_id: string; action: TaskReviewAction; actor_id: string | null;
  comment: string | null; prior_status: TaskStatus | null; created_at: string;
};
export type SubmittalRow = Timestamps & {
  id: string; project_id: string; submission_type: string; agency: string | null;
  submission_date: string | null; response_due_date: string | null; follow_up_date: string | null;
  assigned_staff_id: string | null; status: SubmittalStatus; notes: string | null; created_by: string | null;
};
export type SubmittalHistoryRow = {
  id: string; submittal_id: string; from_status: SubmittalStatus | null; to_status: SubmittalStatus;
  note: string | null; changed_by: string | null; created_at: string;
};
export type ProjectNoteRow = Timestamps & { id: string; project_id: string; body: string; author_id: string | null };
export type ProjectFileRow = {
  id: string; project_id: string; storage_path: string; file_name: string;
  mime_type: string | null; size_bytes: number | null; uploaded_by: string | null; created_at: string;
};
export type NotificationRow = {
  id: string; user_id: string; type: NotificationType; title: string; body: string | null;
  entity_type: ActivityEntity | null; entity_id: string | null; project_id: string | null;
  is_read: boolean; read_at: string | null; created_at: string;
};
export type ActivityLogRow = {
  id: string; actor_id: string | null; action: ActivityAction; entity_type: ActivityEntity;
  entity_id: string | null; project_id: string | null; summary: string | null; metadata: Json; created_at: string;
};
export type CalendarEventRow = Timestamps & {
  id: string; title: string; description: string | null; event_type: CalendarEventType;
  start_at: string; end_at: string | null; all_day: boolean; project_id: string | null;
  task_id: string | null; submittal_id: string | null; created_by: string | null;
};
export type SettingRow = { id: string; scope: string; user_id: string | null; key: string; value: Json; updated_at: string };
export type NotificationPreferenceRow = Timestamps & {
  user_id: string;
  email_enabled: boolean;
  inapp_enabled: boolean;
  email_task_assigned: boolean;
  email_task_completed: boolean;
  email_project_assigned: boolean;
  email_deadline_changed: boolean;
};
export type ProjectPhaseRow = {
  id: string; project_id: string; name: string; position: number; is_current: boolean; created_at: string;
  start_date: string | null; end_date: string | null; progress: number;
};
export type ReportRunRow = {
  id: string; generated_by: string | null; generated_at: string;
  report_type: string; pdf_path: string | null; summary: string | null;
  snapshot: Json; created_at: string; subject_staff_id: string | null;
};

export type CalendarFeedRow = {
  feed_id: string; source: string; event_type: CalendarEventType; project_id: string | null;
  project_number: string | null; project_name: string | null; title: string;
  start_at: string | null; end_at: string | null; all_day: boolean | null;
  status: string | null; entity_id: string | null;
};
export type FollowUpNeededRow = ProjectRow & { reason: string };
export type StaffWorkloadRow = { staff_id: string; full_name: string; initials: string | null; open_tasks: number; active_projects: number };
export type ProjectStatsRow = {
  project_id: string; open_tasks: number; overdue_tasks: number;
  awaiting_submittals: number; team_size: number; next_due_date: string | null;
};

type TableDef<R, I = Partial<R>, U = Partial<R>> = { Row: R; Insert: I; Update: U; Relationships: [] };
type ViewDef<R> = { Row: R; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      companies: TableDef<CompanyRow>;
      roles: TableDef<RoleRow>;
      staff: TableDef<StaffRow>;
      users: TableDef<UserRow>;
      projects: TableDef<ProjectRow>;
      project_staff: TableDef<ProjectStaffRow>;
      project_leads: TableDef<ProjectLeadRow>;
      project_contacts: TableDef<ProjectContactRow>;
      tasks: TableDef<TaskRow>;
      task_staff: TableDef<TaskStaffRow>;
      task_reviews: TableDef<TaskReviewRow>;
      project_submittals: TableDef<SubmittalRow>;
      submittal_history: TableDef<SubmittalHistoryRow>;
      project_notes: TableDef<ProjectNoteRow>;
      project_files: TableDef<ProjectFileRow>;
      notifications: TableDef<NotificationRow>;
      activity_logs: TableDef<ActivityLogRow>;
      calendar_events: TableDef<CalendarEventRow>;
      settings: TableDef<SettingRow>;
      notification_preferences: TableDef<NotificationPreferenceRow>;
      report_runs: TableDef<ReportRunRow>;
      project_phases: TableDef<ProjectPhaseRow>;
    };
    Views: {
      v_calendar_feed: ViewDef<CalendarFeedRow>;
      v_awaiting_response_projects: ViewDef<ProjectRow>;
      v_follow_up_needed: ViewDef<FollowUpNeededRow>;
      v_staff_workload: ViewDef<StaffWorkloadRow>;
      v_project_stats: ViewDef<ProjectStatsRow>;
    };
    Functions: {
      transfer_staff_ownership: { Args: { p_from: string; p_to: string }; Returns: undefined };
    };
    Enums: {
      project_status: ProjectStatus; project_phase: ProjectPhase; workflow_state: WorkflowState;
      inactive_reason: InactiveReason; task_status: TaskStatus; task_priority: TaskPriority;
      submittal_status: SubmittalStatus; notification_type: NotificationType; task_recurrence: TaskRecurrence;
      activity_entity: ActivityEntity; activity_action: ActivityAction;
      calendar_event_type: CalendarEventType; contact_role: ContactRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
