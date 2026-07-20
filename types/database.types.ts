// App-facing database types, derived from the generated schema.
//
// `types/database.generated.ts` is the OUTPUT of `npm run types:gen` — never
// hand-edit it; it is overwritten wholesale on every regeneration. This file
// is the hand-authored surface the app imports from: stable names for rows and
// enums, all DERIVED from the generated `Database` so a regen keeps them in
// sync automatically.
//
// Hand-narrowing happens here ONLY where Postgres cannot express the truth and
// the generator therefore types too loosely:
//  - text columns constrained by CHECK constraints (typed `string` when
//    generated) are narrowed back to their literal unions, mirroring the
//    constraints in supabase/migrations;
//  - view columns are all nullable when generated (Postgres cannot mark view
//    output NOT NULL), so columns the view definition guarantees are narrowed
//    to non-null.
// If a migration changes one of those constraints or views, update the
// matching union/narrowing below in the same sprint.
export type { Json, Database } from './database.generated';
import type { Tables, Enums } from './database.generated';

// ---------------------------------------------------------------------------
// Postgres enums (derived — regenerating picks up new values automatically).
// ---------------------------------------------------------------------------
export type ProjectStatus = Enums<'project_status'>;
export type ProjectPhase = Enums<'project_phase'>;
export type WorkflowState = Enums<'workflow_state'>;
export type InactiveReason = Enums<'inactive_reason'>;
export type TaskStatus = Enums<'task_status'>;
export type TaskPriority = Enums<'task_priority'>;
export type TaskRecurrence = Enums<'task_recurrence'>;
export type SubmittalStatus = Enums<'submittal_status'>;
export type NotificationType = Enums<'notification_type'>;
export type ActivityEntity = Enums<'activity_entity'>;
export type ActivityAction = Enums<'activity_action'>;
export type CalendarEventType = Enums<'calendar_event_type'>;
export type ContactRole = Enums<'contact_role'>;

// ---------------------------------------------------------------------------
// CHECK-constraint unions (hand-maintained — mirror supabase/migrations).
// ---------------------------------------------------------------------------
export type TaskReviewAction = 'submitted' | 'approved' | 'rejected';
export type IntakeSourceType = 'upload' | 'email' | 'meeting' | 'scan' | 'other';
export type IntakeStatus = 'received' | 'in_progress' | 'filed' | 'archived';
export type ProposalType = 'task' | 'general_task' | 'note' | 'submittal' | 'calendar_event';
export type ProjectMatchVerdict = 'existing' | 'new_candidate' | 'unknown';
export type ProposalState = 'proposed' | 'edited' | 'rejected' | 'approved' | 'archived';

// Narrow specific columns of a generated row (keeps every other column, and
// any future schema change, flowing through from the generated type).
type Narrow<T, O extends { [K in keyof T]?: unknown }> = Omit<T, keyof O> & O;

// ---------------------------------------------------------------------------
// Table rows.
// ---------------------------------------------------------------------------
export type CompanyRow = Tables<'companies'>;
export type RoleRow = Tables<'roles'>;
export type StaffRow = Tables<'staff'>;
export type UserRow = Tables<'users'>;
export type ProjectRow = Tables<'projects'>;
export type ProjectStaffRow = Tables<'project_staff'>;
export type ProjectLeadRow = Tables<'project_leads'>;
export type ProjectContactRow = Tables<'project_contacts'>;
export type TaskRow = Tables<'tasks'>;
export type TaskStaffRow = Tables<'task_staff'>;
export type SubmittalRow = Tables<'project_submittals'>;
export type SubmittalHistoryRow = Tables<'submittal_history'>;
export type ProjectNoteRow = Tables<'project_notes'>;
export type ProjectFileRow = Tables<'project_files'>;
export type NotificationRow = Tables<'notifications'>;
export type ActivityLogRow = Tables<'activity_logs'>;
export type CalendarEventRow = Tables<'calendar_events'>;
export type SettingRow = Tables<'settings'>;
export type NotificationPreferenceRow = Tables<'notification_preferences'>;
export type ProjectPhaseRow = Tables<'project_phases'>;
export type ReportRunRow = Tables<'report_runs'>;

export type TaskReviewRow = Narrow<Tables<'task_reviews'>, { action: TaskReviewAction }>;
export type IntakeDocumentRow = Narrow<
  Tables<'intake_documents'>,
  { source_type: IntakeSourceType; status: IntakeStatus }
>;
export type IntakeProposalRow = Narrow<
  Tables<'intake_proposals'>,
  {
    proposal_type: ProposalType;
    project_match: ProjectMatchVerdict | null;
    state: ProposalState;
    applied_entity_type: ProposalType | null;
  }
>;

// ---------------------------------------------------------------------------
// View rows. Attach these via `.returns<T>()` on view queries — the generated
// view types are all-nullable, so the narrowed shape lives here, once.
// ---------------------------------------------------------------------------
export type CalendarFeedRow = Narrow<
  Tables<'v_calendar_feed'>,
  { feed_id: string; source: string; event_type: CalendarEventType; title: string }
>;
export type StaffWorkloadRow = Narrow<
  Tables<'v_staff_workload'>,
  { staff_id: string; full_name: string; open_tasks: number; active_projects: number }
>;
export type ProjectStatsRow = Narrow<
  Tables<'v_project_stats'>,
  { project_id: string; open_tasks: number; overdue_tasks: number; awaiting_submittals: number; team_size: number }
>;
// v_follow_up_needed is `select p.*, reason` over projects, so project columns
// keep their table nullability. NOTE: the view predates current_phase_name and
// does not return it — consumers backfill it from the base table (dashboard.ts).
export type FollowUpNeededRow = ProjectRow & { reason: string };
