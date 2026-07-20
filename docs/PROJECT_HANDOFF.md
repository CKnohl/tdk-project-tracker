# Project Handoff — TDK Project Tracker

_A pick-up point for the next session. Read this first, then `CHANGELOG.md` and
`docs/V6_DEVELOPMENT_CHARTER.md`._

---

## 1. What this is
Engineering-operations platform for **TDK Engineering** + **M&P Engineers** (plus PJO
Surveying / Aquarii Lighting as sign-in-only firms). **Next.js 15 (App Router) · TypeScript
· Tailwind · shadcn/ui · Supabase (Postgres + Auth + Storage) · Server Actions · Vercel.**
Installable PWA. Microsoft (Azure AD) sign-in; role-based access (Admin 40 / PM 30 / Staff 20
/ Read-Only 10) enforced with Postgres RLS.

## 2. Current state (high level)
- **Core tracker** (projects, tasks + approvals, submittals, contacts, files, notes, calendar,
  notifications, reports, activity, ⌘K search) — mature, plus a **V5.1 polish** pass
  (navigation, dashboard, badges).
- **V6 "AI Operations Center"** — implemented through **Phase 1.3** in the working tree.
  Every phase **typechecks and builds clean**, but is **NOT yet deployed** and has **not been
  exercised against a live/authenticated environment** (see §5).
- All work is in the working copy; **commit + deploy are the pending gates.**

### V6 phases done (all in `components/operations/`, `lib/actions/{intake,proposals,proposal-apply}.ts`, `lib/data/{intake,proposals}.ts`, `lib/intake-interpret.ts`)
| Phase | What | 
|---|---|
| 0 | Operations Center shell + document **Intake Queue** (upload, view, file-to-project, PM/Admin-only). Later polished (status tabs, multi-file/drag-drop, keyboard, metadata). |
| 1 | **Interpret** a document → **proposals** (gated LLM, off by default). Nothing writes to the tracker. |
| 1.1 | **Apply Engine** — approving a proposal creates the real record **only via existing server actions** (`createTask`/`createNote`/`createSubmittal`/`createCalendarEvent`/`createGeneralTask`); records `applied_*`; Undo. |
| 1.2 | **Review workspace** — filter / group / multi-select / **bulk** approve-reject-archive-delete, confirmation summary, per-item results. Tabbed with the queue. |
| 1.3 | Polish/hardening — "Needs Filing" rename, document multi-select + bulk lifecycle, duplicate detection, workspace search/sort/restore, a11y. |

## 3. Governance — READ BEFORE TOUCHING V6
`docs/V6_DEVELOPMENT_CHARTER.md` is the **binding contract**. Non-negotiables:
- **The Apply Engine calls existing server actions only — never a direct tracker write.**
- **Nothing reaches the tracker without human approval.** AI only proposes.
- **One owner per concern:** `intake_documents` (docs), `intake_proposals` (suggestions),
  `task_reviews` (human task approvals — untouched), `activity_logs` (audit), `lib/notify.ts`
  (all notifications).
- **No new tables** beyond `intake_documents` / `intake_proposals` without an amendment.
- **No AI/confidence numbers in the UI** (confidence shows as a band).
- Consolidation over addition; reuse before building.

## 4. Pending migrations — MUST be applied on deploy (in order)
`supabase db push` then `npm run types:gen`:
- `0036` intake_documents + private `intake` bucket (RLS rank ≥ 30)
- `0037` intake_proposals (the proposal store)
- `0038` proposal apply columns (`applied_*`) + `approved` state
- `0039` `archived` proposal state
- `0040` **calendar-feed date fix** (see §7)

⚠️ **The connected Supabase MCP points at the wrong org and cannot reach the TDK DB
(`grpfdtomncopqslrwpem`).** Migrations are applied by a human via the Supabase CLI, **not**
by the assistant. `types/database.types.ts` is **hand-authored to match migrations**; extend
it in that file's style, then reconcile with `npm run types:gen` after applying.

## 5. Environment constraints (so you don't get surprised)
- **Windows** dev box. **No Python / OCR / poppler / Ghostscript.** (PDF *rendering* isn't
  available; PDF *generation* works via `@react-pdf/renderer`, already a dependency.)
- **Can't run the authenticated app here** (Azure AD sign-in) → end-to-end UI testing isn't
  possible in-session. **Quality gates are `npm run typecheck` + `npm run build`.** There is
  **no unit-test runner** configured.
- The AI interpretation is **gated OFF** — it makes no external call unless **both**
  `OPENAI_API_KEY` is set **and** `INTAKE_INTERPRET_ENABLED=true`. This is deliberate
  (charter SEC-2: sign off on what document data may leave the building first). Provider today
  is OpenAI (`lib/ai.ts` pattern, `gpt-4o-mini`).

## 6. Open decisions (owner: the business)
1. **Deploy V6 Phase 0–1.3** (intake + review, AI still off)?
2. **Data-governance sign-off** to enable interpretation (what document text may go to the LLM).
3. **Next priority:** OCR (Phase 2) · email/mobile intake (Phase 4) · **staff offboarding** (§8).

## 7. The date/timezone bug (fixed this session)
**Symptom:** the project "Upcoming" widget (and calendar) showed dates **one day early**
(e.g., a 7/23 due date as 7/22).
**Root cause:** date-only values (`yyyy-MM-dd`) were turned into a `Date` at **midnight UTC**
and then rendered in Eastern time → previous evening → previous day.
**Two independent code paths, two fixes:**
- ✅ **`lib/utils.ts` → `describeDue()`** now treats date-only strings as floating calendar
  dates in the office timezone (fixes the Upcoming widget, `TaskRow`, `DueItemRow`). **Done,
  builds clean.**
- ⏳ **`v_calendar_feed` view** cast date-only fields to midnight UTC → same shift on the
  **/calendar page** and the dashboard **Today's Schedule**. **`0040_calendar_feed_date_fix.sql`
  re-anchors them at noon UTC.** **Must be applied (`supabase db push`) and then VERIFIED on the
  live calendar** — timezone fixes must be confirmed in the real environment, which can't be
  done in-session.

## 8. Staff offboarding / reassignment — status
**The guided workflow was never built** (it's on the roadmap). **The primitives already exist**
(≈V4.4): `setStaffActive` (deactivate), `transferOwnership` (atomic book hand-off via the
`transfer_staff_ownership` RPC, migration 0030), `reassignTasks`. Surfaced in Settings → Staff
and the staff profile. **Missing:** deactivation is **ungated** (no check for led projects /
open tasks / pending reviews before deactivating), there's **no offboarding checklist** with
inline reassign actions, and **no leaderless-project alert.** Natural next mini-phase; reuses
the existing actions (extension, not rebuild).

## 9. Roadmap (not built)
OCR (Phase 2) → email-forward / mobile intake (Phase 4) → reconciliation, dedupe, richer
matching → on-demand minutes/reports + knowledge search (Phase 5) → guided staff offboarding.
See `CHANGELOG.md` "Deferred / roadmap" and the frozen V6 spec.

## 10. Quality gates & conventions
- Run **`npm run typecheck`** and **`npm run build`** before considering anything done.
- Match existing code idiom. Server actions return `ActionResult`; surface errors, never
  swallow. Notifications via `lib/notify.ts`; recipients resolve via `users.staff_id`
  (authoritative), never `staff.user_id`.
- New changes get a **`CHANGELOG.md`** entry (newest first).
