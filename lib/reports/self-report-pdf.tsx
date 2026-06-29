// Server-side Self Report PDF, rendered from the SelfReportSnapshot. SERVER ONLY —
// imports @react-pdf/renderer (Node runtime). Mirrors the Ready Report PDF style.

import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { formatDate, formatDateTime } from '@/lib/utils';
import { TASK_PRIORITY } from '@/lib/constants';
import type { SelfReportSnapshot } from '@/lib/data/self-report';

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
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.ink, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 3, marginBottom: 6 },
  summary: { backgroundColor: C.bg, borderRadius: 4, padding: 10, fontSize: 9.5, lineHeight: 1.5, color: C.body },
  thead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line2, paddingBottom: 3 },
  th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 3 },
  td: { fontSize: 8.5, color: C.body, paddingRight: 4 },
  empty: { fontSize: 8.5, color: C.faint, fontStyle: 'italic' },
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

function Kpi({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, danger && value > 0 ? { color: C.red } : {}]}>{String(value)}</Text>
    </View>
  );
}

const dueCol = { header: 'Due', flex: 1.6 };
const taskCols: Col[] = [
  { header: 'Task', flex: 3.4 },
  { header: 'Project', flex: 3 },
  dueCol,
  { header: 'Priority', flex: 1.4 },
];

function taskRows(rows: SelfReportSnapshot['overdue']): string[][] {
  return rows.map((t) => [
    t.name,
    t.project ?? '—',
    t.due_date ? formatDate(t.due_date) : '—',
    TASK_PRIORITY[t.priority]?.label ?? t.priority,
  ]);
}

function SelfReportDocument({ snapshot }: { snapshot: SelfReportSnapshot }) {
  const snap = snapshot;
  return (
    <Document title={`Self Report — ${snap.subject.full_name}`}>
      <Page size="LETTER" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.h1}>Self Report</Text>
          <Text style={s.org}>TDK / M&P Engineering</Text>
        </View>
        <Text style={s.meta}>
          {snap.subject.full_name} · Generated {formatDateTime(snap.generated_at)}
        </Text>

        <View style={s.kpiRow}>
          <Kpi label="Open Tasks" value={snap.counts.open_tasks} />
          <Kpi label="Overdue" value={snap.counts.overdue} danger />
          <Kpi label="Due This Week" value={snap.counts.due_this_week} />
          <Kpi label="Submittals" value={snap.counts.submittals} />
          <Kpi label="Projects" value={snap.counts.active_projects} />
        </View>

        <Section title="Summary">
          <Text style={s.summary}>{snap.executive_summary}</Text>
        </Section>

        <Section title="Overdue Tasks">
          <Table columns={taskCols} empty="No overdue tasks." rows={taskRows(snap.overdue)} />
        </Section>

        <Section title="Due This Week">
          <Table columns={taskCols} empty="Nothing due this week." rows={taskRows(snap.due_this_week)} />
        </Section>

        <Section title="Upcoming & Unscheduled">
          <Table columns={taskCols} empty="No other open tasks." rows={taskRows(snap.upcoming)} />
        </Section>

        <Section title="Assigned Submittals">
          <Table
            columns={[{ header: 'Type', flex: 3 }, { header: 'Project', flex: 3 }, { header: 'Agency', flex: 2.5 }, { header: 'Follow-up', flex: 1.6 }]}
            empty="No assigned submittals."
            rows={snap.submittals.map((m) => [
              m.submission_type,
              m.project ?? '—',
              m.agency ?? '—',
              m.follow_up_date ? formatDate(m.follow_up_date) : '—',
            ])}
          />
        </Section>

        <Section title="Active Projects">
          <Table
            columns={[{ header: 'Project', flex: 1.6 }, { header: 'Name', flex: 4.5 }, { header: 'Target', flex: 2 }]}
            empty="No active projects."
            rows={snap.projects.map((p) => [p.project_number, p.name, p.target_completion_date ? formatDate(p.target_completion_date) : '—'])}
          />
        </Section>

        <Section title="Completed In The Last 7 Days">
          <Table
            columns={[{ header: 'Task', flex: 4 }, { header: 'Project', flex: 3 }, { header: 'Completed', flex: 2 }]}
            empty="No tasks completed in the last 7 days."
            rows={snap.completed_recently.map((t) => [t.name, t.project ?? '—', t.completed_at ? formatDate(t.completed_at) : '—'])}
          />
        </Section>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `TDK Project Tracker — personal report for ${snap.subject.full_name} · Generated ${formatDateTime(snap.generated_at)} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

/** Render a self-report snapshot to a PDF buffer. */
export async function renderSelfReportPdf(snapshot: SelfReportSnapshot): Promise<Buffer> {
  return renderToBuffer(<SelfReportDocument snapshot={snapshot} />);
}
