// Generator for the Version 2 Release Notes PDF (internal distribution).
// Run: node scripts/release-notes.mjs
import React from 'react';
import * as RPns from '@react-pdf/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RP = RPns.default ?? RPns;
const { Document, Page, View, Text, Image, Svg, Path, Circle, StyleSheet, renderToFile } = RP;
const h = React.createElement;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_SRC = { data: fs.readFileSync(path.resolve(__dirname, '../public/brand/tdk-logo.png')), format: 'png' };
const OUT = 'C:/Users/ConnorKnohl/Downloads/TDK_Project_Tracker_V2_Release_Notes.pdf';
const VERSION = 'Version 2.0';
const DATE = 'June 2026';

const NAVY = '#16285C';
const RED = '#A0212F';
const BLUE = '#27408B';
const GREEN = '#1E7A46';
const AMBER = '#B45309';
const SOON = '#64748B';
const INK = '#1F2937';
const MUTED = '#5B6470';
const FAINT = '#94A3B8';
const LINE = '#E2E8F0';

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 38, paddingHorizontal: 40, fontFamily: 'Helvetica', color: INK },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: NAVY, borderRadius: 9, paddingVertical: 3, paddingHorizontal: 9, textAlign: 'center' },
  pillSub: { fontSize: 7.5, color: MUTED, marginTop: 4, textAlign: 'right' },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 10 },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 3, lineHeight: 1.4 },
  rule: { borderBottomWidth: 2, borderBottomColor: NAVY, marginTop: 8 },
  contHead: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 15, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.5%', borderWidth: 1, borderColor: LINE, borderRadius: 6, marginBottom: 9, overflow: 'hidden' },
  cardHead: { paddingVertical: 5, paddingHorizontal: 9 },
  cardHeadText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  cardBody: { padding: 9, paddingTop: 6 },
  cardText: { fontSize: 8.4, color: INK, lineHeight: 1.4 },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4.5 },
  itemText: { fontSize: 8.7, color: INK, marginLeft: 7, lineHeight: 1.38, flex: 1 },
  itemBold: { fontFamily: 'Helvetica-Bold' },
  noteBox: { borderWidth: 1, borderRadius: 6, padding: 10, marginTop: 2 },
  noteText: { fontSize: 8.7, color: INK, lineHeight: 1.45 },
  impactRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 4 },
  impactRole: { width: 130, fontSize: 8.6, fontFamily: 'Helvetica-Bold', color: NAVY, paddingRight: 6 },
  impactText: { flex: 1, fontSize: 8.5, color: INK, lineHeight: 1.35 },
  dhHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 3 },
  dhCellH: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 },
  dhRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 4 },
  dhCell: { fontSize: 8.6, color: INK },
  footer: { position: 'absolute', bottom: 16, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5, fontSize: 7, color: FAINT, textAlign: 'center' },
});

const Check = (color) => h(Svg, { width: 10, height: 10, viewBox: '0 0 24 24', style: { marginTop: 1.5 } },
  h(Path, { d: 'M20 6 L9 17 L4 12', stroke: color, strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
const Dot = (color) => h(Svg, { width: 8, height: 8, viewBox: '0 0 24 24', style: { marginTop: 2.5 } }, h(Circle, { cx: 12, cy: 12, r: 7, fill: color }));

const item = (markerEl, text) =>
  h(View, { style: s.item, wrap: false }, markerEl, typeof text === 'string' ? h(Text, { style: s.itemText }, text) : text);
const lead = (label, rest) => h(Text, { style: s.itemText }, h(Text, { style: s.itemBold }, label), rest);

const card = (title, color, body) =>
  h(View, { style: s.card, wrap: false },
    h(View, { style: [s.cardHead, { backgroundColor: color }] }, h(Text, { style: s.cardHeadText }, title)),
    h(View, { style: s.cardBody }, h(Text, { style: s.cardText }, body)));

const footer = () =>
  h(Text, {
    style: s.footer,
    fixed: true,
    render: ({ pageNumber, totalPages }) =>
      `TDK Engineering Associates, PC  -  Internal & Confidential  -  ${VERSION}  -  Page ${pageNumber} of ${totalPages}`,
  });

// ── PAGE 1 — What's new + how to start ──────────────────────────────────────
const page1 = h(Page, { size: 'LETTER', style: s.page },
  h(View, { style: s.hRow },
    h(Image, { src: LOGO_SRC, style: { width: 130, height: 65 } }),
    h(View, null,
      h(Text, { style: s.pill }, 'RELEASE NOTES'),
      h(Text, { style: s.pillSub }, VERSION),
      h(Text, { style: s.pillSub }, `Release Date: ${DATE}`),
      h(Text, { style: s.pillSub }, 'Internal Distribution'))),
  h(Text, { style: s.title }, "What's New in Version 2"),
  h(Text, { style: s.subtitle }, 'Version 2 focuses on everyday usability: a home for office work that is not tied to a project, repeating tasks, faster access to details, customizable project timelines, and a more accurate dashboard.'),
  h(View, { style: s.rule }),

  h(Text, { style: s.sectionTitle }, 'New Features'),
  h(View, { style: s.grid },
    card('General Tasks', NAVY, 'A new sidebar area for office and administrative work not tied to a project — filing, standards updates, ordering supplies, internal meetings. Supports assignment, due dates, completion, and notifications.'),
    card('Recurring Tasks', BLUE, 'Set any task to repeat Daily, Weekly, Monthly, or Yearly. Completing it automatically creates the next one, so routine work never falls off the list.'),
    card('Task & Submittal Details', RED, 'Click any task or submittal to open a clean, read-only details window — name, status, assigned staff, dates, notes, and history. No need to open Edit just to read.'),
    card('Editable Project Timelines', NAVY, 'Customize each project\'s phases right on the Timeline tab: add, rename, reorder, delete, and mark the current phase. New projects still start from the standard 12-phase template.')),

  h(Text, { style: s.sectionTitle }, 'Improvements'),
  item(Dot(BLUE), lead('Clearer submittal dates — ', 'renamed to Date Submitted, Due Date, and Follow-Up Date. The Due Date is now the most prominent date on each submittal card.')),
  item(Dot(BLUE), lead('Dashboard includes submittals — ', 'Due Today, Due This Week, and Overdue now show both tasks and submittals, so nothing time-sensitive is missed.')),
  item(Dot(BLUE), lead('View without edit rights — ', 'anyone can now open full task and submittal details; previously this required edit access.')),

  h(Text, { style: s.sectionTitle }, 'Getting Started with New Features'),
  item(Dot(NAVY), lead('General Tasks ', 'are in the new Tasks tab in the left navigation.')),
  item(Dot(NAVY), lead('Recurring Tasks ', 'can be set when creating or editing a task — choose how often it repeats under "Repeats."')),
  item(Dot(NAVY), lead('Tasks and Submittals ', 'can now be clicked to view full details without entering Edit.')),
  item(Dot(NAVY), lead('Project Timelines ', 'can be edited directly from the Timeline tab on any project.')),

  footer());

// ── PAGE 2 — Fixes, data, impact, admin ─────────────────────────────────────
const page2 = h(Page, { size: 'LETTER', style: s.page },
  h(View, { style: s.hRow },
    h(Image, { src: LOGO_SRC, style: { width: 96, height: 48 } }),
    h(Text, { style: s.contHead }, 'Release Notes  -  ' + VERSION)),
  h(View, { style: s.rule }),

  h(Text, { style: s.sectionTitle }, 'Bug Fixes'),
  item(Check(GREEN), lead('Dashboard date filters corrected — ', 'Overdue shows items due before today, Due Today shows today, and Due This Week shows the next seven days. No more overlap or skipped items.')),
  item(Check(GREEN), lead('New-user permissions fixed — ', 'new accounts now default to Read Only (previously some were created with Project Manager access by mistake). Admins grant higher access as needed.')),

  h(Text, { style: s.sectionTitle }, 'Database Changes'),
  h(View, { style: [s.noteBox, { borderColor: LINE, backgroundColor: '#F8FAFC' }] },
    h(Text, { style: s.noteText }, 'Three behind-the-scenes updates support the new features: project-less tasks, a "repeat" setting on tasks, and a per-project phase list. All changes are additive — no existing project, task, submittal, report, or user information was changed, moved, or deleted.')),

  h(Text, { style: s.sectionTitle }, 'User Impact'),
  h(View, { style: { borderTopWidth: 1, borderTopColor: LINE } },
    ...[
      ['Project Managers / Mgmt', 'New General Tasks area; click-to-view details; customizable project timelines; more accurate dashboard cards.'],
      ['Staff', 'Read full task/submittal details without edit rights; assigned general and recurring tasks appear in My Work and workload.'],
      ['Read Only', 'Can now read full details (still cannot make changes).'],
      ['Everyone', 'Sign-in is unchanged. No action required to start using the new features.'],
    ].map((r, i) => h(View, { key: i, style: s.impactRow, wrap: false },
      h(Text, { style: s.impactRole }, r[0]), h(Text, { style: s.impactText }, r[1])))),

  h(Text, { style: s.sectionTitle }, 'Administrator Notes'),
  h(View, { style: [s.noteBox, { borderColor: RED, backgroundColor: '#FCF5F6' }] },
    item(Dot(RED), lead('New users default to Read Only — ', 'promote them under Settings → Users.')),
    item(Dot(RED), lead('Email notifications remain paused — ', 'pending one-time verification of the company email domain (an IT/DNS step). In-app notifications work normally.')),
    item(Dot(RED), lead('Database updates apply in order before go-live — ', 'handled during deployment.')),
    item(Dot(RED), lead('After the update — ', 'confirm a brand-new test sign-in lands as Read Only.'))),

  footer());

// ── PAGE 3 — Limitations, roadmap, history ──────────────────────────────────
const page3 = h(Page, { size: 'LETTER', style: s.page },
  h(View, { style: s.hRow },
    h(Image, { src: LOGO_SRC, style: { width: 96, height: 48 } }),
    h(Text, { style: s.contHead }, 'Release Notes  -  ' + VERSION)),
  h(View, { style: s.rule }),

  h(Text, { style: s.sectionTitle }, 'Known Limitations'),
  item(Dot(AMBER), lead('General Tasks are not yet on the Calendar — ', 'they do appear on the Dashboard and in staff workload.')),
  item(Dot(AMBER), lead('Recurring tasks need a due date — ', 'the next occurrence is calculated from the previous due date.')),
  item(Dot(AMBER), lead('Email delivery is paused — ', 'this affects emailed notifications and reports only; all in-app features are unaffected.')),

  h(Text, { style: s.sectionTitle }, "What's Coming Next"),
  item(Dot(SOON), lead('Email Notifications — ', 'delivery of assignment and report emails, pending company domain (DNS) verification.')),
  item(Dot(SOON), lead('Calendar integration for General Tasks — ', 'so office tasks appear alongside project deadlines.')),
  item(Dot(SOON), lead('Additional workflow and reporting enhancements.', '')),

  h(Text, { style: s.sectionTitle }, 'Document History'),
  h(View, null,
    h(View, { style: s.dhHead },
      h(Text, { style: [s.dhCellH, { width: 70 }] }, 'Version'),
      h(Text, { style: [s.dhCellH, { width: 90 }] }, 'Date'),
      h(Text, { style: [s.dhCellH, { flex: 1 }] }, 'Description')),
    h(View, { style: s.dhRow },
      h(Text, { style: [s.dhCell, { width: 70 }] }, '2.0'),
      h(Text, { style: [s.dhCell, { width: 90 }] }, DATE),
      h(Text, { style: [s.dhCell, { flex: 1 }] }, 'Initial Version 2 release'))),

  footer());

renderToFile(h(Document, { title: 'TDK Project Tracker - V2 Release Notes', author: 'TDK Engineering' }, page1, page2, page3), OUT).then(
  () => console.log('WROTE', OUT),
  (e) => { console.error('FAILED', e); process.exit(1); },
);
