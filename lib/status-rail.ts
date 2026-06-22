import type { ProjectStatus, WorkflowState } from '@/types/database.types';

export type RailState =
  | 'overdue'
  | 'needs_attention'
  | 'waiting'
  | 'on_hold'
  | 'active'
  | 'inactive';

/**
 * Highest-priority state drives the rail color:
 *   overdue → needs_attention → waiting → on_hold → active → inactive
 * (Inactive/completed projects stay neutral gray regardless of tasks.)
 */
export function projectRailState(p: {
  status: ProjectStatus;
  workflow_state?: WorkflowState | null;
  overdueTasks?: number | null;
}): RailState {
  if (p.status === 'inactive') return 'inactive';
  if ((p.overdueTasks ?? 0) > 0) return 'overdue';
  if (p.workflow_state === 'needs_follow_up' || p.workflow_state === 'urgent_follow_up') return 'needs_attention';
  if (p.workflow_state === 'awaiting_response') return 'waiting';
  if (p.status === 'on_hold') return 'on_hold';
  if (p.status === 'active') return 'active';
  return 'inactive';
}

export const RAIL: Record<RailState, { color: string; anim: string; glow: string; label: string }> = {
  overdue:         { color: '#ef4444', anim: 'animate-rail-pulse',   glow: '0 0 8px rgba(239,68,68,0.55)',  label: 'Overdue' },
  needs_attention: { color: '#f97316', anim: '',                     glow: '0 0 6px rgba(249,115,22,0.40)', label: 'Needs Attention' },
  waiting:         { color: '#2563eb', anim: '',                     glow: '0 0 6px rgba(37,99,235,0.40)',  label: 'Waiting on Others' },
  on_hold:         { color: '#eab308', anim: '',                     glow: '0 0 6px rgba(234,179,8,0.40)',  label: 'On Hold' },
  active:          { color: '#10b981', anim: 'animate-rail-breathe', glow: '0 0 6px rgba(16,185,129,0.45)', label: 'Active' },
  inactive:        { color: '#94a3b8', anim: '',                     glow: 'none',                          label: 'Inactive / Completed' },
};
