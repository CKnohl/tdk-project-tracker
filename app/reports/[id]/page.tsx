import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { PROJECT_STATUS, TASK_PRIORITY, WORKFLOW_STATE } from '@/lib/constants';
import { PrintButton } from '@/components/reports/print-button';
import type { ReportSnapshot } from '@/lib/data/reports';
import type { Json } from '@/types/database.types';

interface ReportRow {
  id: string;
  generated_at: string;
  report_type: string;
  summary: string | null;
  snapshot: Json;
  generator: { full_name: string | null } | null;
}

export const metadata = { title: 'Ready Report' };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!canManageProjects(user.role)) redirect('/dashboard');

  const supabase = await createClient();
  const { data: report } = await supabase
    .from('report_runs')
    .select('id, generated_at, report_type, summary, snapshot, generator:users(full_name)')
    .eq('id', id)
    .returns<ReportRow[]>()
    .maybeSingle();

  if (!report) notFound();

  const snap = report.snapshot as unknown as ReportSnapshot;
  const generatorName = report.generator?.full_name ?? 'Unknown';

  return (
    <div className="min-h-screen bg-slate-100 py-8 text-slate-900 print:bg-white print:py-0">
      <style
        dangerouslySetInnerHTML={{
          __html: '@media print { @page { margin: 14mm; } }',
        }}
      />

      {/* Toolbar — hidden when printing */}
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Header */}
        <header className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Ready Report</h1>
            <span className="text-sm font-semibold text-slate-500">TDK / M&amp;P Engineering</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Generated {formatDateTime(snap.generated_at)} by {generatorName}
            {snap.previous_report_at
              ? ` · Compared against the report from ${formatDate(snap.previous_report_at)}`
              : ' · First report (no prior report to compare against)'}
          </p>
        </header>

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-4 gap-3">
          <Kpi label="Active" value={snap.counts.active} prev={snap.previous_counts?.active} />
          <Kpi label="On Hold" value={snap.counts.on_hold} prev={snap.previous_counts?.on_hold} />
          <Kpi label="Waiting" value={snap.counts.awaiting} prev={snap.previous_counts?.awaiting} />
          <Kpi label="Inactive" value={snap.counts.inactive} prev={snap.previous_counts?.inactive} />
        </div>

        {/* 1. Executive Summary */}
        <Section n={1} title="Executive Summary">
          <p className="rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {snap.executive_summary}
          </p>
        </Section>

        {/* 2. Immediate Priorities */}
        <Section n={2} title="Immediate Priorities">
          <DataTable
            columns={['Task', 'Project', 'Due', 'Priority', 'Assigned']}
            empty="No overdue or due-today tasks."
            rows={snap.immediate.map((t) => [
              t.name,
              t.project ?? '—',
              t.due_date ? formatDate(t.due_date) : '—',
              TASK_PRIORITY[t.priority]?.label ?? t.priority,
              t.assignees.length ? t.assignees.join(', ') : '—',
            ])}
          />
        </Section>

        {/* 3. Needs Attention */}
        <Section n={3} title="Needs Attention">
          <DataTable
            columns={['Project', 'Name', 'Manager', 'State']}
            empty="Nothing flagged for follow-up."
            rows={snap.needs_attention.map((p) => [
              p.project_number,
              p.name,
              p.manager ?? '—',
              WORKFLOW_STATE[p.workflow_state]?.label ?? p.workflow_state,
            ])}
          />
        </Section>

        {/* 4. Waiting on Others */}
        <Section n={4} title="Waiting on Others">
          <DataTable
            columns={['Project', 'Name', 'Manager', 'Status']}
            empty="Not waiting on anyone."
            rows={snap.waiting.map((p) => [
              p.project_number,
              p.name,
              p.manager ?? '—',
              PROJECT_STATUS[p.status]?.label ?? p.status,
            ])}
          />
        </Section>

        {/* 5. Upcoming Deadlines */}
        <Section n={5} title="Upcoming Deadlines (next 14 days)">
          <DataTable
            columns={['Deadline', 'Project', 'Date']}
            empty="No deadlines in the next two weeks."
            rows={snap.upcoming.map((u) => [u.title, u.project ?? '—', u.start_at ? formatDate(u.start_at) : '—'])}
          />
        </Section>

        {/* 6. Staff Workload */}
        <Section n={6} title="Staff Workload">
          <DataTable
            columns={['Staff', 'Open', 'Overdue', 'Due This Week', 'Active Projects']}
            empty="No active workload."
            rows={snap.workload.map((w) => [
              w.full_name,
              String(w.open_tasks),
              w.overdue > 0 ? <span className="font-semibold text-red-600">{w.overdue}</span> : '0',
              String(w.due_this_week),
              String(w.active_projects),
            ])}
          />
        </Section>

        {/* 7. Workload Alerts */}
        <Section n={7} title="Workload Alerts">
          {snap.workload_alerts.length === 0 ? (
            <p className="text-sm text-slate-400">No workload alerts.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {snap.workload_alerts.map((a, i) => (
                <li key={`${a.staff_id}-${a.kind}-${i}`} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      a.kind === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {a.kind === 'overdue' ? 'Overdue' : 'High load'}
                  </span>
                  <span className="font-medium text-slate-700">{a.full_name}</span>
                  <span className="text-slate-500">— {a.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 8. Completed Since Last Report */}
        <Section n={8} title="Completed Since Last Report">
          <DataTable
            columns={['Task', 'Project', 'Completed']}
            empty="No tasks completed in this period."
            rows={snap.completed_since.map((t) => [
              t.name,
              t.project ?? '—',
              t.completed_at ? formatDate(t.completed_at) : '—',
            ])}
          />
        </Section>

        {/* 9. New Projects Since Last Report */}
        <Section n={9} title="New Projects Since Last Report">
          <DataTable
            columns={['Project', 'Name', 'Company', 'Manager']}
            empty="No new projects in this period."
            rows={snap.new_projects.map((p) => [p.project_number, p.name, p.company ?? '—', p.manager ?? '—'])}
          />
        </Section>

        {/* 10. Risk Summary */}
        <Section n={10} title="Risk Summary">
          <div className="grid grid-cols-2 gap-3">
            {snap.risks.map((r) => (
              <div key={r.label} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-700">{r.label}</span>
                  <span className={r.count > 0 ? 'text-lg font-bold text-red-600' : 'text-lg font-bold text-slate-400'}>
                    {r.count}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{r.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
          TDK Project Tracker — internal report. Generated {formatDateTime(snap.generated_at)}.
        </footer>
      </article>
    </div>
  );
}

function Kpi({ label, value, prev }: { label: string; value: number; prev?: number | null }) {
  let delta: React.ReactNode = null;
  if (prev != null) {
    const d = value - prev;
    delta = (
      <span className={d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-600' : 'text-slate-400'}>
        {d > 0 ? `+${d}` : d === 0 ? '±0' : d}
      </span>
    );
  }
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none">
        {value} {delta && <span className="text-xs font-semibold">{delta}</span>}
      </p>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-700">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c}
              className="border-b border-slate-300 py-1.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="break-inside-avoid align-top">
            {r.map((cell, j) => (
              <td key={j} className="border-b border-slate-100 py-1.5 pr-3 text-slate-700">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
