// Deterministic, explainable project health + progress + KPI metrics.
//
// Pure (no I/O) so it can be computed in a server component straight from the
// data getProjectDetail already fetched — NO extra queries. Every number here is
// derived from tasks / submittals / phases / activity already on the page.

import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { ProjectDetail } from '@/lib/data/projects';

export type HealthLevel = 'healthy' | 'attention' | 'at_risk';

export interface ProjectMetrics {
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
  submittalsPending: number;
  followUpsNeeded: number;
  overdueSubmittals: number;
  waitingOnMunicipality: number;
  waitingOnClient: boolean;
  daysSinceActivity: number | null;
  progress: number; // 0–100
  health: HealthLevel;
  healthReasons: string[]; // why it's yellow/red, for the tooltip
  currentPhaseName: string | null;
  phaseIndex: number; // 0-based index of the current phase, -1 if none
  phaseCount: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function computeProjectMetrics(detail: ProjectDetail): ProjectMetrics {
  const { project, tasks, submittals, phases } = detail;
  const today = new Date();
  // Future = positive, past = negative.
  const dayDiff = (d: string | null) => (d ? differenceInCalendarDays(parseISO(d), today) : null);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const openTaskList = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const countableTasks = tasks.filter((t) => t.status !== 'cancelled').length;
  const openTasks = openTaskList.length;
  const overdueTasks = openTaskList.filter((t) => {
    const x = dayDiff(t.due_date);
    return x !== null && x < 0;
  }).length;
  const dueThisWeek = openTaskList.filter((t) => {
    const x = dayDiff(t.due_date);
    return x !== null && x >= 0 && x <= 7;
  }).length;

  // ── Submittals ──────────────────────────────────────────────────────────────
  const openSubmittals = submittals.filter((s) => s.status !== 'approved' && s.status !== 'rejected');
  const submittalsPending = openSubmittals.length;
  const overdueSubmittals = openSubmittals.filter((s) => {
    const x = dayDiff(s.response_due_date);
    return x !== null && x < 0;
  }).length;
  // Submitted / awaiting a reviewer = waiting on the municipality/agency.
  const waitingOnMunicipality = submittals.filter(
    (s) => s.status === 'submitted' || s.status === 'awaiting_response',
  ).length;
  const followUpsNeeded = openSubmittals.filter((s) => {
    const x = dayDiff(s.follow_up_date);
    return x !== null && x <= 0;
  }).length;
  // Project-level "awaiting response" flag = waiting on the client.
  const waitingOnClient = project.workflow_state === 'awaiting_response';

  const daysSinceActivity = project.last_activity_at
    ? Math.max(0, differenceInCalendarDays(today, parseISO(project.last_activity_at)))
    : null;

  // ── Progress: 60% tasks done + 40% pipeline position; completed = 100% ──────
  const phaseCount = phases.length;
  const phaseIndex = phases.findIndex((p) => p.is_current);
  const taskRatio = countableTasks > 0 ? completedTasks / countableTasks : null;
  const phaseRatio = phaseCount > 0 ? (phaseIndex >= 0 ? (phaseIndex + 1) / phaseCount : 0) : null;
  let progress: number;
  if (project.status === 'inactive' && project.inactive_reason === 'completed') {
    progress = 100;
  } else if (taskRatio !== null && phaseRatio !== null) {
    progress = Math.round(100 * (0.6 * taskRatio + 0.4 * phaseRatio));
  } else {
    progress = Math.round(100 * (taskRatio ?? phaseRatio ?? 0));
  }
  progress = Math.min(100, Math.max(0, progress));

  // ── Health: deterministic tiers with explainable reasons ────────────────────
  const reasons: string[] = [];
  if (overdueTasks > 0) reasons.push(plural(overdueTasks, 'overdue task'));
  if (overdueSubmittals > 0) reasons.push(plural(overdueSubmittals, 'overdue submittal'));
  if (daysSinceActivity !== null && daysSinceActivity > 21) reasons.push(`no activity in ${daysSinceActivity} days`);
  else if (daysSinceActivity !== null && daysSinceActivity > 14) reasons.push(`quiet for ${daysSinceActivity} days`);
  if (project.workflow_state === 'urgent_follow_up') reasons.push('urgent follow-up');
  else if (project.workflow_state === 'needs_follow_up') reasons.push('needs follow-up');
  else if (project.workflow_state === 'awaiting_response') reasons.push('awaiting client response');

  const atRisk =
    overdueTasks >= 3 ||
    overdueSubmittals >= 1 ||
    project.workflow_state === 'urgent_follow_up' ||
    (daysSinceActivity !== null && daysSinceActivity > 21);
  const attention =
    overdueTasks >= 1 ||
    dueThisWeek >= 5 ||
    project.workflow_state === 'needs_follow_up' ||
    project.workflow_state === 'awaiting_response' ||
    (daysSinceActivity !== null && daysSinceActivity > 14);

  let health: HealthLevel = 'healthy';
  if (project.status === 'inactive') health = 'healthy'; // archived/closed — neutral
  else if (atRisk) health = 'at_risk';
  else if (attention) health = 'attention';

  return {
    openTasks,
    completedTasks,
    overdueTasks,
    dueThisWeek,
    submittalsPending,
    followUpsNeeded,
    overdueSubmittals,
    waitingOnMunicipality,
    waitingOnClient,
    daysSinceActivity,
    progress,
    health,
    healthReasons: reasons,
    currentPhaseName: project.current_phase_name ?? (phaseIndex >= 0 ? phases[phaseIndex].name : null),
    phaseIndex,
    phaseCount,
  };
}
