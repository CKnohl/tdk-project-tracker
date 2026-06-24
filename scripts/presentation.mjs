// One-off generator for the 2-page TDK Project Tracker presentation PDF.
// Run: node scripts/presentation.mjs   (uses the project's @react-pdf/renderer)
import React from 'react';
import * as RPns from '@react-pdf/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RP = RPns.default ?? RPns;
const { Document, Page, View, Text, Image, Svg, Path, Circle, StyleSheet, renderToFile } = RP;
const h = React.createElement;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO = path.resolve(__dirname, '../public/brand/tdk-logo.png');
// Load as a Buffer so @react-pdf reads the local file instead of trying to fetch it.
const LOGO_SRC = { data: fs.readFileSync(LOGO), format: 'png' };
const OUT = 'C:/Users/ConnorKnohl/Downloads/TDK_Project_Tracker_Presentation.pdf';
const DATE = 'June 23, 2026';

// ── Brand palette ─────────────────────────────────────────────────────────
const NAVY = '#16285C';
const RED = '#A0212F';
const BLUE = '#27408B';
const GREEN = '#1E7A46';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#E2E8F0';
const GRAYO = '#9CA3AF';

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 34, paddingHorizontal: 38, fontFamily: 'Helvetica', color: INK },
  // header
  hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: GREEN, borderRadius: 9, paddingVertical: 3, paddingHorizontal: 9 },
  pillDate: { fontSize: 7.5, color: MUTED, marginTop: 4, textAlign: 'right' },
  title: { fontSize: 23, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 10 },
  subtitle: { fontSize: 9.5, color: MUTED, marginTop: 2 },
  rule: { borderBottomWidth: 2, borderBottomColor: NAVY, marginTop: 8 },
  // status banner
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#A6E9C2', borderRadius: 6, padding: 8, marginTop: 12 },
  bannerText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#136B3A', marginLeft: 7 },
  // section
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 16, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.6 },
  // cards
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.5%', borderWidth: 1, borderColor: LINE, borderRadius: 6, marginBottom: 10, overflow: 'hidden' },
  cardFull: { width: '100%', borderWidth: 1, borderColor: LINE, borderRadius: 6, marginBottom: 10, overflow: 'hidden' },
  cardHead: { paddingVertical: 5, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center' },
  cardHeadText: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff' },
  cardBody: { padding: 9, paddingTop: 7 },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  itemText: { fontSize: 8.6, color: INK, marginLeft: 6, lineHeight: 1.3, flex: 1 },
  // two-col compare
  twoCol: { flexDirection: 'row', justifyContent: 'space-between' },
  colCard: { width: '48.5%', borderWidth: 1, borderRadius: 6, padding: 10 },
  colTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  // flow pills
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flowPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: LINE, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 9, marginRight: 6, marginBottom: 6 },
  flowNum: { width: 14, height: 14, borderRadius: 7, backgroundColor: NAVY, color: '#fff', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 2.5, marginRight: 5 },
  flowText: { fontSize: 8.6, color: INK },
  // checklist columns
  checkCols: { flexDirection: 'row', justifyContent: 'space-between' },
  checkCol: { width: '48.5%' },
  checkColLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  // roadmap
  road: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  roadCell: { width: '23.5%', borderTopWidth: 3, borderTopColor: BLUE, backgroundColor: '#F8FAFC', borderRadius: 4, padding: 7 },
  roadTag: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5 },
  roadText: { fontSize: 8.4, color: INK, marginTop: 3, lineHeight: 1.3 },
  // tech strip
  techStrip: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  techTag: { fontSize: 7.6, color: NAVY, backgroundColor: '#EEF2FB', borderRadius: 3, paddingVertical: 2.5, paddingHorizontal: 7, marginRight: 5, marginBottom: 5, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 16, left: 38, right: 38, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5, fontSize: 7, color: GRAYO, textAlign: 'center' },
});

// ── vector icons ────────────────────────────────────────────────────────────
const Check = (color = GREEN) =>
  h(Svg, { width: 10, height: 10, viewBox: '0 0 24 24', style: { marginTop: 1.5 } },
    h(Path, { d: 'M20 6 L9 17 L4 12', stroke: color, strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
const Hollow = () =>
  h(Svg, { width: 10, height: 10, viewBox: '0 0 24 24', style: { marginTop: 1.5 } },
    h(Circle, { cx: 12, cy: 12, r: 9, stroke: GRAYO, strokeWidth: 2.5, fill: 'none' }));
const Dot = (color) =>
  h(Svg, { width: 9, height: 9, viewBox: '0 0 24 24', style: { marginTop: 2 } },
    h(Circle, { cx: 12, cy: 12, r: 7, fill: color }));

const checkItem = (txt, color = GREEN, icon = 'check') =>
  h(View, { style: s.item }, icon === 'hollow' ? Hollow() : Check(color), h(Text, { style: s.itemText }, txt));

// ── capability card ───────────────────────────────────────────────────────
const card = (title, color, items, full = false) =>
  h(View, { style: full ? s.cardFull : s.card, wrap: false },
    h(View, { style: [s.cardHead, { backgroundColor: color }] }, h(Text, { style: s.cardHeadText }, title)),
    h(View, { style: s.cardBody }, ...items.map((it) => checkItem(it))));

// ── PAGE 1 ──────────────────────────────────────────────────────────────────
const page1 = h(Page, { size: 'LETTER', style: s.page },
  h(View, { style: s.hRow },
    h(Image, { src: LOGO_SRC, style: { width: 132, height: 66 } }),
    h(View, null,
      h(Text, { style: s.pill }, 'LIVE  -  PRODUCTION'),
      h(Text, { style: s.pillDate }, DATE))),
  h(Text, { style: s.title }, 'Project Tracker'),
  h(Text, { style: s.subtitle }, 'Internal project management platform for TDK Engineering & M&P Engineers'),
  h(View, { style: s.rule }),

  h(View, { style: s.banner },
    Dot(GREEN),
    h(Text, { style: s.bannerText }, 'Deployed to production on Vercel and stable - in real use today.')),

  h(Text, { style: s.sectionTitle }, 'What the platform does today'),
  h(View, { style: s.grid },
    card('Project Directory', NAVY, [
      'Centralized database of every project',
      'Searchable records - active and archived',
      'Company-specific access (TDK & M&P)',
      'Full detail: scope, contacts, files, notes',
    ]),
    card('Project Tracking', BLUE, [
      'Status, phase, and workflow states',
      'Deadline and target-date management',
      'Dashboard: priorities, attention, waiting',
      'Live activity timeline on every project',
    ]),
    card('Staff Management', RED, [
      'Staff directory with live workload view',
      'Assign, reassign, and balance tasks',
      'Personal "My Work" page for each person',
      'Workload alerts for overload and overdue',
    ]),
    card('Reporting', NAVY, [
      'One-click "Ready Report" generation',
      'Professional PDF export',
      'Stored report history with downloads',
      'Auto-compares against the prior report',
    ]),
    card('Notifications', BLUE, [
      'Internal notification center - operational',
      'Automatic alerts on assignment, completion, and deadline changes',
      'Per-user notification preferences',
      'Email delivery already built & tested (see next phase)',
    ], true)),

  h(Text, { style: s.sectionTitle }, 'Built on a modern, secure stack'),
  h(View, { style: s.techStrip },
    ...['Microsoft Sign-In (SSO)', 'Role-based access', 'Supabase / Postgres', 'Next.js + Vercel', 'Installable app (PWA)', 'Encrypted & access-controlled'].map((t, i) =>
      h(Text, { key: i, style: s.techTag }, t))),

  h(Text, { style: s.footer }, 'TDK Engineering Associates, PC  -  Internal & Confidential  -  Prepared by Connor Knohl'));

// ── PAGE 2 ──────────────────────────────────────────────────────────────────
const flow = [
  'Sign in with Microsoft', 'Review the dashboard', 'Open or create a project',
  'Assign tasks to staff', 'Staff see "My Work"', 'Generate a report',
];

const page2 = h(Page, { size: 'LETTER', style: s.page },
  h(View, { style: s.hRow },
    h(Image, { src: LOGO_SRC, style: { width: 96, height: 48 } }),
    h(Text, { style: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY } }, 'Implementation & Roadmap')),
  h(View, { style: s.rule }),

  h(Text, { style: s.sectionTitle }, 'How your team uses it'),
  h(View, { style: s.flowRow },
    ...flow.map((f, i) =>
      h(View, { key: i, style: s.flowPill },
        h(Text, { style: s.flowNum }, String(i + 1)),
        h(Text, { style: s.flowText }, f)))),

  h(Text, { style: s.sectionTitle }, 'Rollout status'),
  h(View, { style: s.checkCols },
    h(View, { style: s.checkCol },
      h(Text, { style: [s.checkColLabel, { color: GREEN }] }, 'Done'),
      checkItem('Deployed to production (Vercel) - stable'),
      checkItem('Microsoft sign-in for TDK & M&P domains'),
      checkItem('Roles live: Admin / PM / Staff / Read-Only'),
      checkItem('Live project & staff records loaded'),
      checkItem('Internal notifications operational')),
    h(View, { style: s.checkCol },
      h(Text, { style: [s.checkColLabel, { color: MUTED }] }, 'Next steps'),
      checkItem('Onboard the team and assign their roles', MUTED, 'hollow'),
      checkItem('Verify company email domain via DNS', MUTED, 'hollow'),
      checkItem('Turn on email delivery (code already built)', MUTED, 'hollow'),
      checkItem('Roll out to all PMs for daily use', MUTED, 'hollow'))),

  h(Text, { style: s.sectionTitle }, 'Today vs. the next phase'),
  h(View, { style: s.twoCol },
    h(View, { style: [s.colCard, { borderColor: NAVY, backgroundColor: '#F5F7FC' }] },
      h(Text, { style: [s.colTitle, { color: NAVY }] }, 'Today - organizes the backend'),
      ...['Single source of truth for project status', 'Deadline & workload tracking', 'Reporting and history', 'Internal notifications keep work visible', 'Directory + deadline tracker for staying organized'].map((t) => checkItem(t, NAVY))),
    h(View, { style: [s.colCard, { borderColor: RED, backgroundColor: '#FCF5F6' }] },
      h(Text, { style: [s.colTitle, { color: RED }] }, 'Next phase - email integration'),
      ...['Email code is already built and tested', 'Remaining step: verify the TDK / M&P domain via DNS - an IT configuration, not software', 'Then assignments arrive directly in inboxes', 'Becomes a full task-management & assignment-distribution platform'].map((t) => checkItem(t, RED)))),

  h(Text, { style: s.sectionTitle }, 'Future roadmap'),
  h(View, { style: s.road },
    h(View, { style: s.roadCell }, h(Text, { style: s.roadTag }, 'Near term'), h(Text, { style: s.roadText }, 'Email notifications for assignments (code ready)')),
    h(View, { style: s.roadCell }, h(Text, { style: s.roadTag }, 'Then'), h(Text, { style: s.roadText }, 'Daily morning digest emailed to managers')),
    h(View, { style: s.roadCell }, h(Text, { style: s.roadTag }, 'Then'), h(Text, { style: s.roadText }, 'AI-written executive summaries on reports')),
    h(View, { style: s.roadCell }, h(Text, { style: s.roadTag }, 'Later'), h(Text, { style: s.roadText }, 'More executive KPIs and mobile polish'))),

  h(Text, { style: s.footer }, `TDK Engineering Associates, PC  -  Internal & Confidential  -  Prepared by Connor Knohl  -  ${DATE}`));

const doc = h(Document, { title: 'TDK Project Tracker - Overview', author: 'Connor Knohl' }, page1, page2);

renderToFile(doc, OUT).then(
  () => console.log('WROTE', OUT),
  (e) => { console.error('FAILED', e); process.exit(1); },
);
