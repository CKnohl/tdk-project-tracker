// Pure scheduling engine (V4.0). ONE place that turns a project's phases +
// submittals + milestones into a schedule model: resolved phase bars, dated
// markers, a deterministic health verdict, the next milestone, and overall
// progress. Reused by the Gantt, the Command Center, and the dashboard so the
// schedule logic never forks. No I/O.

import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { ProjectListItem } from '@/lib/types';
import type { ProjectPhaseRow, SubmittalStatus } from '@/types/database.types';

export type ScheduleHealth = 'on_track' | 'at_risk' | 'slipping';

/** Minimal milestone shape (a project-scoped calendar_event of type 'milestone'). */
export interface ScheduleMilestone {
  id: string;
  title: string;
  start_at: string;
}

/** Minimal submittal shape the engine needs (SubmittalWithProject satisfies it). */
export interface ScheduleSubmittal {
  id: string;
  status: SubmittalStatus;
  response_due_date: string | null;
  submission_type: string;
}

export interface PhaseBar {
  id: string;
  name: string;
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  derived: boolean; // dates interpolated rather than explicitly set
  progress: number; // 0–100 effective (completed phases render full)
  state: 'completed' | 'current' | 'upcoming';
}

export interface ScheduleMarker {
  id: string;
  label: string;
  date: string; // yyyy-MM-dd
  past: boolean;
  kind: 'milestone' | 'submittal';
}

export interface ProjectSchedule {
  rangeStart: string;
  rangeEnd: string;
  today: string;
  phases: PhaseBar[];
  milestones: ScheduleMarker[];
  submittals: ScheduleMarker[];
  health: ScheduleHealth;
  healthReasons: string[];
  criticalPhase: string | null;
  nextMilestone: ScheduleMarker | null;
  daysUntilNextMilestone: number | null;
  overallProgress: number; // 0–100
  hasDates: boolean; // any explicit phase dates or a target date exist
}

type ScheduleProject = Pick<
  ProjectListItem,
  'created_at' | 'target_completion_date' | 'status' | 'workflow_state' | 'current_phase_name' | 'inactive_reason'
>;

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computeSchedule(
  project: ScheduleProject,
  phases: ProjectPhaseRow[],
  submittals: ScheduleSubmittal[],
  milestonesIn: ScheduleMilestone[],
): ProjectSchedule {
  const today = new Date();
  const todayMs = today.getTime();
  const currentIdx = phases.findIndex((p) => p.is_current);
  const n = Math.max(1, phases.length);

  // Window used to interpolate phases that have no explicit dates yet.
  const anchorStart = parseISO(project.created_at);
  const anchorEnd = project.target_completion_date
    ? parseISO(project.target_completion_date)
    : addMonths(anchorStart, Math.max(6, phases.length));
  const span = Math.max(1, anchorEnd.getTime() - anchorStart.getTime());
  const projectDone = project.status === 'inactive' && project.inactive_reason === 'completed';

  const phaseBars: PhaseBar[] = phases.map((p, i) => {
    const explicitStart = p.start_date ? parseISO(p.start_date) : null;
    const explicitEnd = p.end_date ? parseISO(p.end_date) : null;
    const start = explicitStart ?? new Date(anchorStart.getTime() + span * (i / n));
    let end = explicitEnd ?? new Date(anchorStart.getTime() + span * ((i + 1) / n));
    if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + span / n);

    const completedByPosition = currentIdx >= 0 && i < currentIdx;
    const state: PhaseBar['state'] =
      projectDone || completedByPosition ? 'completed' : p.is_current ? 'current' : 'upcoming';
    const progress = state === 'completed' ? 100 : state === 'current' ? clamp(p.progress ?? 0, 0, 100) : 0;

    return { id: p.id, name: p.name, start: ymd(start), end: ymd(end), derived: !(explicitStart && explicitEnd), progress, state };
  });

  const milestones: ScheduleMarker[] = milestonesIn
    .filter((m) => m.start_at)
    .map((m) => {
      const d = parseISO(m.start_at);
      return { id: m.id, label: m.title, date: ymd(d), past: d.getTime() < todayMs, kind: 'milestone' as const };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const openSub = submittals.filter((s) => s.status !== 'approved' && s.status !== 'rejected');
  const submittalMarkers: ScheduleMarker[] = openSub
    .filter((s) => s.response_due_date)
    .map((s) => {
      const d = parseISO(s.response_due_date as string);
      return { id: s.id, label: s.submission_type, date: ymd(d), past: d.getTime() < todayMs, kind: 'submittal' as const };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const allMs = [
    anchorStart.getTime(), anchorEnd.getTime(), todayMs,
    ...phaseBars.map((b) => parseISO(b.start).getTime()), ...phaseBars.map((b) => parseISO(b.end).getTime()),
    ...milestones.map((m) => parseISO(m.date).getTime()), ...submittalMarkers.map((m) => parseISO(m.date).getTime()),
  ];
  const rangeStart = new Date(Math.min(...allMs));
  const rangeEnd = new Date(Math.max(...allMs));

  // Duration-weighted overall progress.
  let weighted = 0;
  let totalDur = 0;
  for (const b of phaseBars) {
    const dur = Math.max(1, parseISO(b.end).getTime() - parseISO(b.start).getTime());
    weighted += b.progress * dur;
    totalDur += dur;
  }
  const overallProgress = totalDur ? Math.round(weighted / totalDur) : 0;

  const nextMilestone = milestones.find((m) => !m.past) ?? null;
  const daysUntilNextMilestone = nextMilestone ? differenceInCalendarDays(parseISO(nextMilestone.date), today) : null;
  const criticalPhase = project.current_phase_name ?? (currentIdx >= 0 ? phases[currentIdx].name : null);

  // ── Deterministic, explainable schedule health ──
  const reasons: string[] = [];
  const currentBar = phaseBars.find((b) => b.state === 'current');
  const currentPhaseRow = currentIdx >= 0 ? phases[currentIdx] : null;
  const currentEndPast = !!currentPhaseRow?.end_date && parseISO(currentPhaseRow.end_date).getTime() < todayMs;
  const lateSubmittals = submittalMarkers.filter((m) => m.past).length;
  const overdueMilestones = milestones.filter((m) => m.past).length;
  const elapsedFraction = clamp((todayMs - rangeStart.getTime()) / Math.max(1, rangeEnd.getTime() - rangeStart.getTime()), 0, 1) * 100;
  const behind = overallProgress + 15 < elapsedFraction;

  if (currentEndPast) reasons.push(`${currentBar?.name ?? 'Current phase'} is past its end date`);
  if (lateSubmittals > 0) reasons.push(`${lateSubmittals} late submittal${lateSubmittals === 1 ? '' : 's'}`);
  if (behind) reasons.push('progress is behind the elapsed schedule');
  if (project.workflow_state === 'urgent_follow_up') reasons.push('urgent follow-up');
  else if (project.workflow_state === 'needs_follow_up') reasons.push('needs follow-up');
  else if (project.workflow_state === 'awaiting_response') reasons.push('awaiting a response');

  const slipping = currentEndPast || lateSubmittals > 0 || behind || project.workflow_state === 'urgent_follow_up';
  const dueSoon =
    (daysUntilNextMilestone !== null && daysUntilNextMilestone <= 7) ||
    submittalMarkers.some((m) => {
      const x = differenceInCalendarDays(parseISO(m.date), today);
      return x >= 0 && x <= 7;
    });
  const atRisk = dueSoon || overdueMilestones > 0 || project.workflow_state === 'needs_follow_up' || project.workflow_state === 'awaiting_response';

  let health: ScheduleHealth = 'on_track';
  if (project.status === 'inactive') health = 'on_track';
  else if (slipping) health = 'slipping';
  else if (atRisk) health = 'at_risk';

  return {
    rangeStart: ymd(rangeStart),
    rangeEnd: ymd(rangeEnd),
    today: ymd(today),
    phases: phaseBars,
    milestones,
    submittals: submittalMarkers,
    health,
    healthReasons: reasons,
    criticalPhase,
    nextMilestone,
    daysUntilNextMilestone,
    overallProgress,
    hasDates: phases.some((p) => p.start_date || p.end_date) || !!project.target_completion_date,
  };
}
