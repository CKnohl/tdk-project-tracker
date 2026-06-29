// Pure scheduling engine. ONE place that turns a project's phases + tasks +
// submittals into a schedule model: resolved phase bars, dated submittal markers,
// a deterministic health verdict, the next submittal, and overall progress.
// Reused by the Gantt, the Command Center, and the dashboard. No I/O.
//
// V4.3 product direction: the schedule revolves around Phases → Tasks →
// Submittals. There is no separate milestone system. Health is On Schedule /
// Slipping (early warning) / Behind (already late).

import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { ProjectListItem } from '@/lib/types';
import type { ProjectPhaseRow, SubmittalStatus, TaskStatus, TaskPriority } from '@/types/database.types';

export type ScheduleHealth = 'on_track' | 'slipping' | 'behind';

/** Minimal submittal shape the engine needs (SubmittalWithProject satisfies it). */
export interface ScheduleSubmittal {
  id: string;
  status: SubmittalStatus;
  response_due_date: string | null;
  submission_type: string;
}

/** Minimal task shape the engine needs (TaskWithStaff satisfies it). */
export interface ScheduleTask {
  status: TaskStatus;
  due_date: string | null;
  priority: TaskPriority;
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
  kind: 'submittal';
}

export interface ProjectSchedule {
  rangeStart: string;
  rangeEnd: string;
  today: string;
  phases: PhaseBar[];
  submittals: ScheduleMarker[];
  health: ScheduleHealth;
  healthReasons: string[];
  criticalPhase: string | null;
  nextSubmittal: ScheduleMarker | null;
  daysUntilNextSubmittal: number | null;
  overallProgress: number; // 0–100
  hasDates: boolean;
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
  tasks: ScheduleTask[],
): ProjectSchedule {
  const today = new Date();
  const todayMs = today.getTime();
  const currentIdx = phases.findIndex((p) => p.is_current);
  const n = Math.max(1, phases.length);

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

  // Submittal markers (the schedule's important dated markers).
  const openSub = submittals.filter((s) => s.status !== 'approved' && s.status !== 'rejected');
  const submittalMarkers: ScheduleMarker[] = openSub
    .filter((s) => s.response_due_date)
    .map((s) => {
      const d = parseISO(s.response_due_date as string);
      return { id: s.id, label: s.submission_type, date: ymd(d), past: d.getTime() < todayMs, kind: 'submittal' as const };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Open tasks → overdue signals.
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const overdueTasks = openTasks.filter((t) => t.due_date && parseISO(t.due_date).getTime() < todayMs);
  const criticalOverdue = overdueTasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
  const overdueSubmittals = submittalMarkers.filter((m) => m.past).length;

  const allMs = [
    anchorStart.getTime(), anchorEnd.getTime(), todayMs,
    ...phaseBars.map((b) => parseISO(b.start).getTime()), ...phaseBars.map((b) => parseISO(b.end).getTime()),
    ...submittalMarkers.map((m) => parseISO(m.date).getTime()),
  ];
  const rangeStart = new Date(Math.min(...allMs));
  const rangeEnd = new Date(Math.max(...allMs));

  let weighted = 0;
  let totalDur = 0;
  for (const b of phaseBars) {
    const dur = Math.max(1, parseISO(b.end).getTime() - parseISO(b.start).getTime());
    weighted += b.progress * dur;
    totalDur += dur;
  }
  const overallProgress = totalDur ? Math.round(weighted / totalDur) : 0;

  const nextSubmittal = submittalMarkers.find((m) => !m.past) ?? null;
  const daysUntilNextSubmittal = nextSubmittal ? differenceInCalendarDays(parseISO(nextSubmittal.date), today) : null;
  const criticalPhase = project.current_phase_name ?? (currentIdx >= 0 ? phases[currentIdx].name : null);

  // ── Health: On Schedule / Slipping (early warning) / Behind (already late) ──
  const currentPhaseRow = currentIdx >= 0 ? phases[currentIdx] : null;
  const currentEndPast = !!currentPhaseRow?.end_date && parseISO(currentPhaseRow.end_date).getTime() < todayMs;
  const targetPast =
    !!project.target_completion_date && parseISO(project.target_completion_date).getTime() < todayMs && project.status === 'active';
  const elapsedFraction = clamp((todayMs - rangeStart.getTime()) / Math.max(1, rangeEnd.getTime() - rangeStart.getTime()), 0, 1) * 100;
  const behindSchedule = overallProgress + 15 < elapsedFraction;
  const deadlineSoon =
    (daysUntilNextSubmittal !== null && daysUntilNextSubmittal <= 7) ||
    (!!currentPhaseRow?.end_date && (() => { const x = differenceInCalendarDays(parseISO(currentPhaseRow.end_date), today); return x >= 0 && x <= 7; })());

  // Behind — already late.
  const behindReasons: string[] = [];
  if (currentEndPast) behindReasons.push(`${currentPhaseRow?.name ?? 'Current phase'} is past its end date`);
  if (targetPast) behindReasons.push('target completion date exceeded');
  if (overdueTasks.length >= 3) behindReasons.push(`${overdueTasks.length} overdue tasks`);
  if (overdueSubmittals > 0) behindReasons.push(`${overdueSubmittals} overdue submittal${overdueSubmittals === 1 ? '' : 's'}`);

  // Slipping — early warning.
  const slipReasons: string[] = [];
  if (overdueTasks.length > 0) slipReasons.push(`${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`);
  if (criticalOverdue > 0) slipReasons.push('a critical task is overdue');
  if (behindSchedule) slipReasons.push('progress is behind the elapsed schedule');
  if (deadlineSoon && overallProgress < 60) slipReasons.push('an upcoming deadline is at risk');
  if (project.workflow_state === 'urgent_follow_up') slipReasons.push('urgent follow-up');
  else if (project.workflow_state === 'needs_follow_up') slipReasons.push('needs follow-up');

  let health: ScheduleHealth = 'on_track';
  let healthReasons: string[] = [];
  if (project.status === 'inactive') {
    health = 'on_track';
  } else if (behindReasons.length > 0) {
    health = 'behind';
    healthReasons = behindReasons;
  } else if (slipReasons.length > 0) {
    health = 'slipping';
    healthReasons = slipReasons;
  }

  return {
    rangeStart: ymd(rangeStart),
    rangeEnd: ymd(rangeEnd),
    today: ymd(today),
    phases: phaseBars,
    submittals: submittalMarkers,
    health,
    healthReasons,
    criticalPhase,
    nextSubmittal,
    daysUntilNextSubmittal,
    overallProgress,
    hasDates: phases.some((p) => p.start_date || p.end_date) || !!project.target_completion_date,
  };
}
