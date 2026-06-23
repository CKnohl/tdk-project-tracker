// Server-side Ready Report PDF, rendered from the same ReportSnapshot the web
// page uses. SERVER ONLY — imports @react-pdf/renderer (Node runtime). Never
// import this from a client component.

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PROJECT_STATUS, TASK_PRIORITY, WORKFLOW_STATE } from '@/lib/constants';
import type { ReportSnapshot } from '@/lib/data/reports';

const C = {
  ink: '#0f172a',
  body: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  line2: '#cbd5e1',
  red: '#dc2626',
  bg: '#f8fafc',
};

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 40, fontSize: 9, color: C.body, fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 8 },
  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.ink },
  org: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.muted },
  meta: { marginTop: 6, fontSize: 8.5, color: C.muted },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8 },
  kpiLabel: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.ink, marginTop: 3 },
  kpiDelta: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.ink, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 3, marginBottom: 6 },
  summary: { backgroundColor: C.bg, borderRadius: 4, padding: 10, fontSize: 9.5, lineHeight: 1.5, color: C.body },
  aiTag: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  thead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line2, paddingBottom: 3 },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 3 },
  td: { fontSize: 8.5, color: C.body, paddingRight: 4 },
  empty: { fontSize: 8.5, color: C.faint, fontStyle: 'italic' },
  alert: { flexDirection: 'row', marginBottom: 3 },
  badge: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, marginRight: 6 },
  riskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  riskCell: { width: '47.5%', borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8 },
  riskHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, fontSize: 7.5, color: C.faint },
});

interface Col {
  header: string;
  flex: number;
}

function Table({ columns, rows, empty }: { columns: Col[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <Text style={s.empty}>{empty}</Text>;
  return (
    <View>
      <View style={s.thead}>
        {columns.map((c, i) => (
          <Text key={i} style={[s.th, { flex: c.flex }]}>{c.header}</Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {r.map((cell, ci) => (
            <Text key={ci} style={[s.td, { flex: columns[ci]?.flex ?? 1 }]}>{cell || '—'}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Kpi({ label, value, prev }: { label: string; value: number; prev?: number | null }) {
  let delta = '';
  let color = C.faint;
  if (prev != null) {
    const d = value - prev;
    delta = d > 0 ? ` +${d}` : d === 0 ? ' ±0' : ` ${d}`;
    color = d > 0 ? '#059669' : d < 0 ? C.red : C.faint;
  }
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>
        {String(value)}
        {delta ? <Text style={[s.kpiDelta, { color }]}>{delta}</Text> : null}
      </Text>
    </View>
  );
}

function ReportDocument({ snapshot, generatorName }: { snapshot: ReportSnapshot; generatorName: string }) {
  const snap = snapshot;
  return (
    <Document title="TDK Ready Report">
      <Page size="LETTER" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.h1}>Ready Report</Text>
          <Text style={s.org}>TDK / M&P Engineering</Text>
        </View>
        <Text style={s.meta}>
          Generated {formatDateTime(snap.generated_at)} by {generatorName}
          {snap.previous_report_at
            ? ` · Compared against the report from ${formatDate(snap.previous_report_at)}`
            : ' · First report (no prior report to compare against)'}
        </Text>

        <View style={s.kpiRow}>
          <Kpi label="Active" value={snap.counts.active} prev={snap.previous_counts?.active} />
          <Kpi label="On Hold" value={snap.counts.on_hold} prev={snap.previous_counts?.on_hold} />
          <Kpi label="Waiting" value={snap.counts.awaiting} prev={snap.previous_counts?.awaiting} />
          <Kpi label="Inactive" value={snap.counts.inactive} prev={snap.previous_counts?.inactive} />
        </View>

        <Section title="1. Executive Summary">
          <Text style={s.summary}>{snap.executive_summary}</Text>
        </Section>

        <Section title="2. Immediate Priorities">
          <Table
            columns={[{ header: 'Task', flex: 3 }, { header: 'Project', flex: 3 }, { header: 'Due', flex: 1.6 }, { header: 'Priority', flex: 1.4 }, { header: 'Assigned', flex: 2.5 }]}
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

        <Section title="3. Needs Attention">
          <Table
            columns={[{ header: 'Project', flex: 1.6 }, { header: 'Name', flex: 4 }, { header: 'Manager', flex: 2.4 }, { header: 'State', flex: 2 }]}
            empty="Nothing flagged for follow-up."
            rows={snap.needs_attention.map((p) => [
              p.project_number,
              p.name,
              p.manager ?? '—',
              WORKFLOW_STATE[p.workflow_state]?.label ?? p.workflow_state,
            ])}
          />
        </Section>

        <Section title="4. Waiting on Others">
          <Table
            columns={[{ header: 'Project', flex: 1.6 }, { header: 'Name', flex: 4 }, { header: 'Manager', flex: 2.4 }, { header: 'Status', flex: 2 }]}
            empty="Not waiting on anyone."
            rows={snap.waiting.map((p) => [
              p.project_number,
              p.name,
              p.manager ?? '—',
              PROJECT_STATUS[p.status]?.label ?? p.status,
            ])}
          />
        </Section>

        <Section title="5. Upcoming Deadlines (next 14 days)">
          <Table
            columns={[{ header: 'Deadline', flex: 4 }, { header: 'Project', flex: 3 }, { header: 'Date', flex: 2 }]}
            empty="No deadlines in the next two weeks."
            rows={snap.upcoming.map((u) => [u.title, u.project ?? '—', u.start_at ? formatDate(u.start_at) : '—'])}
          />
        </Section>

        <Section title="6. Staff Workload">
          <Table
            columns={[{ header: 'Staff', flex: 3 }, { header: 'Open', flex: 1 }, { header: 'Overdue', flex: 1 }, { header: 'Due This Week', flex: 1.6 }, { header: 'Active Projects', flex: 1.6 }]}
            empty="No active workload."
            rows={snap.workload.map((w) => [w.full_name, String(w.open_tasks), String(w.overdue), String(w.due_this_week), String(w.active_projects)])}
          />
        </Section>

        <Section title="7. Workload Alerts">
          {snap.workload_alerts.length === 0 ? (
            <Text style={s.empty}>No workload alerts.</Text>
          ) : (
            <View>
              {snap.workload_alerts.map((a, i) => (
                <View key={i} style={s.alert} wrap={false}>
                  <Text style={[s.badge, { backgroundColor: a.kind === 'overdue' ? C.red : '#d97706' }]}>
                    {a.kind === 'overdue' ? 'OVERDUE' : 'HIGH LOAD'}
                  </Text>
                  <Text style={s.td}>{a.full_name} — {a.detail}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="8. Completed Since Last Report">
          <Table
            columns={[{ header: 'Task', flex: 4 }, { header: 'Project', flex: 3 }, { header: 'Completed', flex: 2 }]}
            empty="No tasks completed in this period."
            rows={snap.completed_since.map((t) => [t.name, t.project ?? '—', t.completed_at ? formatDate(t.completed_at) : '—'])}
          />
        </Section>

        <Section title="9. New Projects Since Last Report">
          <Table
            columns={[{ header: 'Project', flex: 1.6 }, { header: 'Name', flex: 4 }, { header: 'Company', flex: 2 }, { header: 'Manager', flex: 2.4 }]}
            empty="No new projects in this period."
            rows={snap.new_projects.map((p) => [p.project_number, p.name, p.company ?? '—', p.manager ?? '—'])}
          />
        </Section>

        <Section title="10. Risk Summary">
          <View style={s.riskGrid}>
            {snap.risks.map((r, i) => (
              <View key={i} style={s.riskCell} wrap={false}>
                <View style={s.riskHead}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.body }}>{r.label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: r.count > 0 ? C.red : C.faint }}>{String(r.count)}</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{r.detail}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `TDK Project Tracker — internal report · Generated ${formatDateTime(snap.generated_at)} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

/** Render the snapshot to a PDF buffer. */
export async function renderReportPdf(snapshot: ReportSnapshot, generatorName: string): Promise<Buffer> {
  return renderToBuffer(<ReportDocument snapshot={snapshot} generatorName={generatorName} />);
}
