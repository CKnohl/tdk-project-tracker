import type {
  ProjectStatus,
  ProjectPhase,
  WorkflowState,
  TaskStatus,
  TaskPriority,
  SubmittalStatus,
  ContactRole,
} from '@/types/database.types';

export type BadgeTone =
  | 'green' | 'yellow' | 'gray' | 'blue' | 'orange' | 'red' | 'slate' | 'purple';

interface Meta<T extends string> {
  value: T;
  label: string;
  tone: BadgeTone;
}

export const PROJECT_STATUS: Record<ProjectStatus, Meta<ProjectStatus>> = {
  active: { value: 'active', label: 'Active', tone: 'green' },
  on_hold: { value: 'on_hold', label: 'On Hold', tone: 'yellow' },
  inactive: { value: 'inactive', label: 'Inactive', tone: 'gray' },
};

export const WORKFLOW_STATE: Record<WorkflowState, Meta<WorkflowState>> = {
  normal: { value: 'normal', label: 'Normal', tone: 'slate' },
  awaiting_response: { value: 'awaiting_response', label: 'Waiting on Others', tone: 'blue' },
  needs_follow_up: { value: 'needs_follow_up', label: 'Needs Attention', tone: 'orange' },
  urgent_follow_up: { value: 'urgent_follow_up', label: 'Urgent Attention', tone: 'red' },
};

export const PROJECT_PHASE: Record<ProjectPhase, Meta<ProjectPhase>> = {
  proposal: { value: 'proposal', label: 'Proposal', tone: 'slate' },
  survey: { value: 'survey', label: 'Survey', tone: 'slate' },
  existing_conditions: { value: 'existing_conditions', label: 'Existing Conditions', tone: 'slate' },
  concept_design: { value: 'concept_design', label: 'Concept Design', tone: 'blue' },
  engineering_design: { value: 'engineering_design', label: 'Engineering Design', tone: 'blue' },
  client_review: { value: 'client_review', label: 'Client Review', tone: 'purple' },
  municipal_review: { value: 'municipal_review', label: 'Municipal Review', tone: 'purple' },
  permitting: { value: 'permitting', label: 'Permitting', tone: 'orange' },
  bidding: { value: 'bidding', label: 'Bidding', tone: 'orange' },
  construction: { value: 'construction', label: 'Construction', tone: 'green' },
  closeout: { value: 'closeout', label: 'Closeout', tone: 'green' },
  completed: { value: 'completed', label: 'Completed', tone: 'gray' },
};

export const PHASE_ORDER: ProjectPhase[] = [
  'proposal', 'survey', 'existing_conditions', 'concept_design', 'engineering_design',
  'client_review', 'municipal_review', 'permitting', 'bidding', 'construction', 'closeout', 'completed',
];

export const TASK_STATUS: Record<TaskStatus, Meta<TaskStatus>> = {
  not_started: { value: 'not_started', label: 'Not Started', tone: 'slate' },
  in_progress: { value: 'in_progress', label: 'In Progress', tone: 'blue' },
  waiting: { value: 'waiting', label: 'Waiting', tone: 'yellow' },
  completed: { value: 'completed', label: 'Completed', tone: 'green' },
  cancelled: { value: 'cancelled', label: 'Cancelled', tone: 'gray' },
};

export const TASK_PRIORITY: Record<TaskPriority, Meta<TaskPriority>> = {
  low: { value: 'low', label: 'Low', tone: 'slate' },
  medium: { value: 'medium', label: 'Medium', tone: 'blue' },
  high: { value: 'high', label: 'High', tone: 'orange' },
  urgent: { value: 'urgent', label: 'Urgent', tone: 'red' },
};

export const SUBMITTAL_STATUS: Record<SubmittalStatus, Meta<SubmittalStatus>> = {
  drafting: { value: 'drafting', label: 'Drafting', tone: 'slate' },
  ready_to_submit: { value: 'ready_to_submit', label: 'Ready to Submit', tone: 'blue' },
  submitted: { value: 'submitted', label: 'Submitted', tone: 'purple' },
  awaiting_response: { value: 'awaiting_response', label: 'Awaiting Response', tone: 'orange' },
  revision_required: { value: 'revision_required', label: 'Revision Required', tone: 'yellow' },
  approved: { value: 'approved', label: 'Approved', tone: 'green' },
  rejected: { value: 'rejected', label: 'Rejected', tone: 'red' },
};

export const CONTACT_ROLE: Record<ContactRole, string> = {
  client: 'Client',
  attorney: 'Attorney',
  contractor: 'Contractor',
  surveyor: 'Surveyor',
  planner: 'Planner',
  municipal_reviewer: 'Municipal Reviewer',
  architect: 'Architect',
  engineer: 'Engineer',
  inspector: 'Inspector',
  other: 'Other',
};

export const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  gray: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  blue: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900',
  red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
  purple: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900',
};

export const ALLOWED_DOMAINS = ['tdkengineering.com', 'mpengineers.com'] as const;

export const FOLLOW_UP_REASON_LABEL: Record<string, string> = {
  urgent_follow_up: 'Marked urgent',
  needs_follow_up: 'Marked needs attention',
  awaiting_over_14d: 'Waiting on others > 14 days',
  no_activity_14d: 'No activity in 14+ days',
  no_follow_up_date: 'No follow-up date set',
};
