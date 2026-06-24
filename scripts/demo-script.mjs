// One-off generator for the 1-page TDK Project Tracker demo SCRIPT (talking track).
// Run: node scripts/demo-script.mjs
import React from 'react';
import * as RPns from '@react-pdf/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const RP = RPns.default ?? RPns;
const { Document, Page, View, Text, Image, Svg, Path, StyleSheet, renderToFile } = RP;
const h = React.createElement;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO = path.resolve(__dirname, '../public/brand/tdk-logo.png');
const LOGO_SRC = { data: fs.readFileSync(LOGO), format: 'png' };
const OUT = 'C:/Users/ConnorKnohl/Downloads/TDK_Project_Tracker_Demo_Script.pdf';
const DATE = 'June 23, 2026';

const NAVY = '#16285C';
const RED = '#A0212F';
const BLUE = '#27408B';
const INK = '#1F2937';
const MUTED = '#5B6470';
const LINE = '#E2E8F0';
const GRAYO = '#9CA3AF';

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 28, paddingHorizontal: 40, fontFamily: 'Helvetica', color: INK },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff', backgroundColor: NAVY, borderRadius: 9, paddingVertical: 3, paddingHorizontal: 9 },
  pillDate: { fontSize: 7, color: MUTED, marginTop: 3, textAlign: 'right' },
  title: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 8 },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: NAVY, marginTop: 6 },

  label: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 11, marginBottom: 5 },

  openBox: { backgroundColor: '#F5F7FC', borderLeftWidth: 3, borderLeftColor: NAVY, borderRadius: 4, padding: 8, marginTop: 9 },
  openQuote: { fontSize: 9.5, color: INK, lineHeight: 1.35, fontFamily: 'Helvetica-Oblique' },

  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  num: { width: 15, height: 15, borderRadius: 7.5, backgroundColor: NAVY, color: '#fff', fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingTop: 3, marginRight: 8 },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 9.3, fontFamily: 'Helvetica-Bold', color: NAVY },
  say: { fontSize: 8.6, color: INK, lineHeight: 1.32, marginTop: 1 },
  sayLabel: { fontFamily: 'Helvetica-Bold', color: RED },
  sayQuote: { fontFamily: 'Helvetica-Oblique', color: '#374151' },

  closeWrap: { marginTop: 4 },
  closeBox: { borderWidth: 1, borderRadius: 5, padding: 8, marginBottom: 6 },
  closeTag: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  closeText: { fontSize: 8.7, color: INK, lineHeight: 1.34 },
  ask: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  askText: { fontSize: 9.2, fontFamily: 'Helvetica-Bold', color: NAVY, marginLeft: 6, flex: 1, lineHeight: 1.3 },

  footer: { position: 'absolute', bottom: 16, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5, fontSize: 7, color: GRAYO, textAlign: 'center' },
});

const ArrowCheck = (color) =>
  h(Svg, { width: 11, height: 11, viewBox: '0 0 24 24', style: { marginTop: 2 } },
    h(Path, { d: 'M20 6 L9 17 L4 12', stroke: color, strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));

const say = (quote) => h(Text, { style: s.say }, h(Text, { style: s.sayLabel }, 'Say:  '), h(Text, { style: s.sayQuote }, `"${quote}"`));

const step = (n, doTitle, quote) =>
  h(View, { style: s.step, key: n, wrap: false },
    h(Text, { style: s.num }, String(n)),
    h(View, { style: s.stepBody },
      h(Text, { style: s.stepTitle }, doTitle),
      say(quote)));

const STEPS = [
  ['Sign in (Authentication)', 'Everyone signs in with their existing TDK or M&P Microsoft account - no new passwords - and access is set by role.'],
  ['Dashboard', "This is the command center: today's priorities, what needs attention, and what we're waiting on others for - across both companies."],
  ['Active Projects (Directory)', 'Every project lives here - searchable, with status, phase, deadlines, and full history. One source of truth instead of scattered files.'],
  ['Create a Project', 'Adding a project takes seconds - number, company, manager, deadline, and team are all captured up front.'],
  ['Edit / Update a Project', 'Statuses update live - active, on hold, waiting on others, needs attention - so the dashboard always reflects reality.'],
  ['Staff Directory & Workload', "Here I can see each person's workload at a glance - open tasks, what's overdue, what's due this week - and balance it."],
  ['Assign a Task', 'I assign or reassign work right from a staff profile or the project itself - no spreadsheets.'],
  ['Internal Notification', 'The moment I assign it, the system notifies that person inside the platform, so nothing falls through the cracks.'],
  ['Generate a Report (PDF)', 'One click produces a professional report - priorities, workload, deadlines, risks - exported to PDF and saved in history.'],
  ['Archive a Project', 'Completed projects archive cleanly but stay fully searchable for the record.'],
];

const doc = h(Document, { title: 'TDK Project Tracker - Demo Script', author: 'Connor Knohl' },
  h(Page, { size: 'LETTER', style: s.page },
    h(View, { style: s.hRow },
      h(Image, { src: LOGO_SRC, style: { width: 116, height: 58 } }),
      h(View, null,
        h(Text, { style: s.pill }, 'DEMO SCRIPT'),
        h(Text, { style: s.pillDate }, DATE))),
    h(Text, { style: s.title }, 'Project Tracker - Presentation Script'),
    h(Text, { style: s.subtitle }, '15-20 minute live demo - what to show and what to say, in order'),
    h(View, { style: s.rule }),

    h(Text, { style: s.label }, 'Open with (15 seconds)'),
    h(View, { style: s.openBox },
      h(Text, { style: s.openQuote }, '"I built an internal project management platform for TDK and M&P. It\'s live in production today. Let me walk you through what it does and how the team would use it."')),

    h(Text, { style: s.label }, 'Walk through - in this order'),
    ...STEPS.map((st, i) => step(i + 1, st[0], st[1])),

    h(Text, { style: s.label }, 'Close with'),
    h(View, { style: s.closeWrap },
      h(View, { style: [s.closeBox, { borderColor: NAVY, backgroundColor: '#F5F7FC' }] },
        h(Text, { style: [s.closeTag, { color: NAVY }] }, 'Where it stands today'),
        h(Text, { style: s.closeText }, 'Right now this works as a centralized project directory, deadline tracker, workload manager, reporting system, and internal notification platform - keeping the backend organized and everyone on the same page.')),
      h(View, { style: [s.closeBox, { borderColor: RED, backgroundColor: '#FCF5F6' }] },
        h(Text, { style: [s.closeTag, { color: RED }] }, 'The next phase - email integration'),
        h(Text, { style: s.closeText }, 'The one enhancement that\'s partially complete is email integration. The code is already built and tested - it just needs our company email domain verified through DNS, which is an IT configuration, not a software task. Once that\'s done, task assignments and notifications go straight to employee inboxes - turning this into a full task-management and assignment-distribution system.')),
      h(View, { style: s.ask },
        ArrowCheck(NAVY),
        h(Text, { style: s.askText }, 'Ask: "I\'d love your thoughts on rolling it out to the team - and whether enabling email is something we should prioritize next."'))),

    h(Text, { style: s.footer }, `TDK Engineering Associates, PC  -  Internal & Confidential  -  Prepared by Connor Knohl  -  ${DATE}`)));

renderToFile(doc, OUT).then(
  () => console.log('WROTE', OUT),
  (e) => { console.error('FAILED', e); process.exit(1); },
);
