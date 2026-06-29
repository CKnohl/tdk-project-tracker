import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { canManageProjects } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { PROJECT_STATUS, SUBMITTAL_STATUS, TASK_PRIORITY, WORKFLOW_STATE } from '@/lib/constants';
import { PrintButton } from '@/components/reports/print-button';
import { getReportPdfSignedUrl } from '@/lib/reports/storage';
import type { ReportSnapshot } from '@/lib/data/reports';
import type { SelfReportSnapshot } from '@/lib/data/self-report';
import type { Json } from '@/types/database.types';

interface ReportRow {
  id: string;
  generated_at: string;
  report_type: string;
  subject_staff_id: string | null;
  summary: string | null;
  snapshot: Json;
  pdf_path: string | null;
  generator: { full_name: string | null } | null;
}

export const metadata = { title: 'Report' };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: report } = await supabase
    .from('report_runs')
    .select('id, generated_at, report_type, subject_staff_id, summary, snapshot, pdf_path, generator:users(full_name)')
    .eq('id', id)
    .returns<ReportRow[]>()
    .maybeSingle();

  if (!report) notFound();

  // Authorize: managers/admins see all; a staff member may view only their OWN
  // self report. RLS already enforces this at the row level (a forbidden id
  // returns no row → notFound above); this is the friendly in-app guard.
  const isManager = canManageProjects(user.role);
  const ownSelfReport = report.report_type === 'self_report' && report.subject_staff_id === user.staff_id;
  if (!isManager && !ownSelfReport) redirect('/dashboard');

  const generatorName = report.generator?.full_name ?? 'Unknown';
  const pdfUrl = report.pdf_path ? await getReportPdfSignedUrl(report.pdf_path) : null;

  if (report.report_type === 'self_report') {
    return (
      <SelfReportView
        snap={report.snapshot as unknown as SelfReportSnapshot}
        generatorName={generatorName}
        pdfUrl={pdfUrl}
      />
    );
  }

  const snap = report.snapshot as unknown as ReportSnapshot;

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
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          )}
          <PrintButton />
        </div>
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

// ── Self Report (personal) ────────────────────────────────────────────────────

function SelfKpi({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold leading-none', danger && value > 0 ? 'text-red-600' : '')}>{value}</p>
    </div>
  );
}

function SelfReportView({
  snap,
  generatorName,
  pdfUrl,
}: {
  snap: SelfReportSnapshot;
  generatorName: string;
  pdfUrl: string | null;
}) {
  const taskRows = (rows: SelfReportSnapshot['overdue']) =>
    rows.map((t) => [
      t.name,
      t.project ?? '—',
      t.due_date ? formatDate(t.due_date) : '—',
      TASK_PRIORITY[t.priority]?.label ?? t.priority,
    ]);

  return (
    <div className="min-h-screen bg-slate-100 py-8 text-slate-900 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: '@media print { @page { margin: 14mm; } }' }} />

      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link href="/my-work" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to My Work
        </Link>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          )}
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-3xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Self Report</h1>
            <span className="text-sm font-semibold text-slate-500">TDK / M&amp;P Engineering</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {snap.subject.full_name} · Generated {formatDateTime(snap.generated_at)} by {generatorName}
          </p>
        </header>

        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <SelfKpi label="Open Tasks" value={snap.counts.open_tasks} />
          <SelfKpi label="Overdue" value={snap.counts.overdue} danger />
          <SelfKpi label="Due This Week" value={snap.counts.due_this_week} />
          <SelfKpi label="Submittals" value={snap.counts.submittals} />
          <SelfKpi label="Projects" value={snap.counts.active_projects} />
        </div>

        <Section n={1} title="Summary">
          <p className="rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{snap.executive_summary}</p>
        </Section>

        <Section n={2} title="Overdue Tasks">
          <DataTable columns={['Task', 'Project', 'Due', 'Priority']} empty="No overdue tasks." rows={taskRows(snap.overdue)} />
        </Section>

        <Section n={3} title="Due This Week">
          <DataTable columns={['Task', 'Project', 'Due', 'Priority']} empty="Nothing due this week." rows={taskRows(snap.due_this_week)} />
        </Section>

        <Section n={4} title="Upcoming & Unscheduled">
          <DataTable columns={['Task', 'Project', 'Due', 'Priority']} empty="No other open tasks." rows={taskRows(snap.upcoming)} />
        </Section>

        <Section n={5} title="Assigned Submittals">
          <DataTable
            columns={['Type', 'Project', 'Agency', 'Status', 'Follow-up']}
            empty="No assigned submittals."
            rows={snap.submittals.map((m) => [
              m.submission_type,
              m.project ?? '—',
              m.agency ?? '—',
              SUBMITTAL_STATUS[m.status]?.label ?? m.status,
              m.follow_up_date ? formatDate(m.follow_up_date) : '—',
            ])}
          />
        </Section>

        <Section n={6} title="Active Projects">
          <DataTable
            columns={['Project', 'Name', 'Status', 'Target']}
            empty="No active projects."
            rows={snap.projects.map((p) => [
              p.project_number,
              p.name,
              PROJECT_STATUS[p.status]?.label ?? p.status,
              p.target_completion_date ? formatDate(p.target_completion_date) : '—',
            ])}
          />
        </Section>

        <Section n={7} title="Completed in the Last 7 Days">
          <DataTable
            columns={['Task', 'Project', 'Completed']}
            empty="No tasks completed in the last 7 days."
            rows={snap.completed_recently.map((t) => [
              t.name,
              t.project ?? '—',
              t.completed_at ? formatDate(t.completed_at) : '—',
            ])}
          />
        </Section>

        <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
          TDK Project Tracker — personal report. Generated {formatDateTime(snap.generated_at)}.
        </footer>
      </article>
    </div>
  );
}
