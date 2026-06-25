import Link from 'next/link';
import {
  Building2, User, Users, Landmark, Briefcase, Plus, ListChecks, AlertTriangle,
  CalendarClock, CircleCheckBig, FileText, BellRing, Clock, ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StaffStack } from '@/components/shared/staff-avatar';
import { GenerateReportButton } from '@/components/reports/generate-report-button';
import { computeProjectMetrics, type HealthLevel } from '@/lib/project-health';
import { computeSchedule, type ScheduleHealth } from '@/lib/schedule';
import { describeDue, formatRelative, cn, humanize } from '@/lib/utils';
import type { ProjectDetail } from '@/lib/data/projects';

const HEALTH: Record<HealthLevel, { dot: string; text: string; ring: string; bar: string; label: string }> = {
  healthy:   { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-500/30', bar: 'bg-emerald-500', label: 'Healthy' },
  attention: { dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     ring: 'ring-amber-500/30',   bar: 'bg-amber-500',   label: 'Needs Attention' },
  at_risk:   { dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',         ring: 'ring-red-500/30',     bar: 'bg-red-500',     label: 'At Risk' },
};

const SCHEDULE_HEALTH: Record<ScheduleHealth, { text: string; dot: string; label: string }> = {
  on_track: { text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'On schedule' },
  at_risk:  { text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-500',   label: 'Schedule at risk' },
  slipping: { text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500',     label: 'Slipping' },
};

function SchedFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </span>
  );
}

function Identity({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'default', href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; tone?: 'default' | 'red' | 'amber' | 'emerald'; href: string;
}) {
  const toneCls =
    tone === 'red' && value > 0 ? 'text-red-600 dark:text-red-400'
    : tone === 'amber' && value > 0 ? 'text-amber-600 dark:text-amber-400'
    : tone === 'emerald' && value > 0 ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-foreground';
  return (
    <Link href={href} className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', toneCls)}>{value}</div>
    </Link>
  );
}

/**
 * Project Command Center — an at-a-glance health summary above the existing tabs.
 * 100% derived from the data getProjectDetail already loads (no extra queries).
 */
export function ProjectCommandCenter({
  detail, canEdit, canManage,
}: {
  detail: ProjectDetail;
  canEdit: boolean;
  canManage: boolean;
}) {
  const { project, contacts, activity } = detail;
  const id = project.id;
  const m = computeProjectMetrics(detail);
  const h = HEALTH[m.health];
  const sched = computeSchedule(project, detail.phases, detail.submittals, detail.milestones);
  const sh = SCHEDULE_HEALTH[sched.health];

  const members = detail.staff.map((s) => s.staff).filter(Boolean) as { id: string; full_name: string; initials: string | null }[];
  const client = contacts.find((c) => c.role === 'client');
  const municipality = contacts.find((c) => c.role === 'municipal_reviewer');

  const tasksHref = `/projects/${id}?tab=tasks`;
  const submittalsHref = `/projects/${id}?tab=submittals`;

  // Upcoming = next dated tasks + submittals, merged and sorted by date.
  const upcoming = [
    ...detail.tasks
      .filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date)
      .map((t) => ({ key: `t-${t.id}`, label: t.name, kind: 'Task', when: t.due_date as string, href: tasksHref })),
    ...detail.submittals
      .filter((s) => s.status !== 'approved' && s.status !== 'rejected' && (s.response_due_date || s.follow_up_date))
      .map((s) => ({ key: `s-${s.id}`, label: s.submission_type, kind: 'Submittal', when: (s.response_due_date ?? s.follow_up_date) as string, href: submittalsHref })),
  ]
    .sort((a, b) => (a.when < b.when ? -1 : 1))
    .slice(0, 5);

  const recent = activity.slice(0, 5);

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        {/* Identity + health */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
            <Identity icon={Building2} label="Company" value={project.company?.name ?? '—'} />
            <Identity icon={Briefcase} label="Client" value={client ? client.company || client.name : '—'} />
            <Identity icon={Landmark} label="Municipality" value={municipality ? municipality.company || municipality.name : '—'} />
            <Identity icon={User} label="Project Manager" value={project.manager?.full_name ?? 'Unassigned'} />
            {detail.leads.length > 0 && (
              <Identity icon={Users} label="Project Leads" value={detail.leads.map((l) => l.full_name).join(', ')} />
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              title={m.healthReasons.length ? m.healthReasons.join(' · ') : 'No issues detected'}
              className={cn('inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-semibold ring-1', h.text, h.ring)}
            >
              <span className={cn('h-2 w-2 rounded-full', h.dot)} /> {h.label}
            </span>
            <span className="text-[11px] text-muted-foreground">Updated {formatRelative(project.last_activity_at)}</span>
            {members.length > 0 && <StaffStack members={members} max={6} />}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {m.currentPhaseName ? <>Phase: <span className="font-medium text-foreground">{m.currentPhaseName}</span></> : 'No phase set'}
              {m.phaseCount > 0 && m.phaseIndex >= 0 && <span className="text-muted-foreground"> · {m.phaseIndex + 1} of {m.phaseCount}</span>}
            </span>
            <span className="font-semibold tabular-nums">{m.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-[width] duration-500', h.bar)} style={{ width: `${m.progress}%` }} />
          </div>
        </div>

        {/* Schedule (V4.0) — critical path + next milestone + schedule health */}
        <Link
          href={`/projects/${id}?tab=timeline`}
          className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-card p-3 text-sm transition-colors hover:bg-accent"
        >
          <span title={sched.healthReasons.join(' · ') || 'On schedule'} className={cn('inline-flex items-center gap-1.5 font-semibold', sh.text)}>
            <span className={cn('h-2 w-2 rounded-full', sh.dot)} /> {sh.label}
          </span>
          <SchedFact label="Critical phase" value={sched.criticalPhase ?? '—'} />
          <SchedFact
            label="Next milestone"
            value={sched.nextMilestone ? `${sched.nextMilestone.label}${sched.daysUntilNextMilestone != null ? ` · ${sched.daysUntilNextMilestone}d` : ''}` : 'None scheduled'}
          />
          <SchedFact label="Schedule" value={`${sched.overallProgress}%`} />
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={ListChecks} label="Open" value={m.openTasks} href={tasksHref} />
          <Kpi icon={AlertTriangle} label="Overdue" value={m.overdueTasks} tone="red" href={tasksHref} />
          <Kpi icon={CalendarClock} label="Due wk" value={m.dueThisWeek} tone="amber" href={tasksHref} />
          <Kpi icon={CircleCheckBig} label="Done" value={m.completedTasks} tone="emerald" href={tasksHref} />
          <Kpi icon={FileText} label="Submittals" value={m.submittalsPending} href={submittalsHref} />
          <Kpi icon={BellRing} label="Follow-ups" value={m.followUpsNeeded} tone="amber" href={submittalsHref} />
        </div>

        {/* Quick actions (role-gated). Edit/Archive/Assign live in the header to
            avoid duplicate controls. */}
        {(canEdit || canManage) && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {canEdit && (
              <>
                <Button asChild variant="outline" size="sm"><Link href={tasksHref}><Plus className="h-4 w-4" /> New task</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href={submittalsHref}><Plus className="h-4 w-4" /> New submittal</Link></Button>
              </>
            )}
            {canManage && <GenerateReportButton />}
            {m.waitingOnClient && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Waiting on client</span>
            )}
            {m.waitingOnMunicipality > 0 && (
              <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', !m.waitingOnClient && 'ml-auto')}>
                <Clock className="h-3.5 w-3.5" /> {m.waitingOnMunicipality} awaiting municipality
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Upcoming + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-muted-foreground" /> Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <div className="-mx-2 divide-y divide-border/50">
              {upcoming.map((u) => {
                const due = describeDue(u.when);
                return (
                  <Link key={u.key} href={u.href} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{u.label}</div>
                      <div className="text-xs text-muted-foreground">{u.kind}</div>
                    </div>
                    <span className={cn('shrink-0 whitespace-nowrap text-xs', due.tone === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{due.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Recent activity</span>
            <Link href={`/projects/${id}?tab=history`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">All <ArrowRight className="h-3 w-3" /></Link>
          </h3>
          {recent.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((a) => (
                <div key={a.id} className="text-sm">
                  <span className="font-medium">{a.actor?.full_name ?? 'System'}</span>{' '}
                  <span className="text-muted-foreground">{a.summary ?? `${humanize(a.action)} ${a.entity_type}`}</span>
                  <span className="text-muted-foreground"> · {formatRelative(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
