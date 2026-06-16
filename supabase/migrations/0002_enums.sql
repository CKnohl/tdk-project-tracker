-- 0002_enums.sql
-- Enumerated domain types.

-- Project lifecycle status (spec: Active=Green, On Hold=Yellow, Inactive=Gray)
create type project_status as enum ('active', 'on_hold', 'inactive');

-- Engineering phase the project is currently in (independent of status)
create type project_phase as enum (
  'proposal',
  'survey',
  'existing_conditions',
  'concept_design',
  'engineering_design',
  'client_review',
  'municipal_review',
  'permitting',
  'bidding',
  'construction',
  'closeout',
  'completed'
);

-- Flexible workflow signal that coexists with an ACTIVE status
-- (replaces the original awaiting_response boolean).
create type workflow_state as enum (
  'normal',
  'awaiting_response',
  'needs_follow_up',
  'urgent_follow_up'
);

-- Why a project became inactive (required when status = inactive)
create type inactive_reason as enum ('completed', 'lost_bid', 'cancelled', 'fell_through');

-- Task lifecycle
create type task_status as enum ('not_started', 'in_progress', 'waiting', 'completed', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

-- Submittal lifecycle
create type submittal_status as enum (
  'drafting',
  'ready_to_submit',
  'submitted',
  'awaiting_response',
  'revision_required',
  'approved',
  'rejected'
);

-- Notifications
create type notification_type as enum (
  'task_due_tomorrow',
  'task_overdue',
  'submittal_awaiting_too_long',
  'project_assigned',
  'task_assigned',
  'project_updated',
  'follow_up_due'
);

-- Activity log dimensions
create type activity_entity as enum ('project', 'task', 'submittal', 'file', 'note', 'contact', 'status');
create type activity_action as enum (
  'created',
  'updated',
  'deleted',
  'status_changed',
  'assigned',
  'unassigned',
  'restored',
  'commented'
);

-- Calendar feed sources
create type calendar_event_type as enum (
  'deadline',
  'meeting',
  'submittal',
  'site_visit',
  'follow_up',
  'milestone',
  'custom'
);

-- External project contact classification
create type contact_role as enum (
  'client',
  'attorney',
  'contractor',
  'surveyor',
  'planner',
  'municipal_reviewer',
  'architect',
  'engineer',
  'inspector',
  'other'
);
