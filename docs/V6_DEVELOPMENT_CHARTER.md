# V6 Development Charter

> **Status:** BINDING CONTRACT · Applies to every V6 implementation sprint
> **Relationship to other docs:** The frozen V6 planning set — Product Vision, Architecture, UX, Engineering Specification, Implementation Roadmap, Product Acceptance Specification — is the **source of truth**. This charter is the **contract** that governs how any implementer (human or Claude) is allowed to turn those documents into code. If this charter and the frozen specs ever conflict, the frozen specs win and this charter must be amended, not ignored.
> **Amendment:** No rule here may be bypassed "temporarily." Changing a rule requires a written amendment approved by the architecture owner.

---

## Mission

Deliver the V6 AI Operations Center as an **intake-and-approval layer bolted onto systems that already exist** — not a new system. Every sprint must make the product **simpler to understand and cheaper to maintain** even as it gains capability. Success is measured by time saved in the office and by how much was **reused and removed**, not by how much was added.

## Core Product Philosophy

- The office should feel like **"I uploaded a document"**, never **"I used AI."** No model names, prompts, or confidence numbers reach the UI.
- **Approval is the product.** The value is a trustworthy propose → approve loop; the model is backstage.
- **My Work stays personal; the Operations Center stays office-only (rank ≥ 30).** An engineer must be able to complete a full day without knowing the Operations Center exists.
- **Nothing changes in the tracker without a human saying "OK."**
- **The tracker keeps itself current as the office works** — with the human always approving.

## Engineering Philosophy

- Read before writing. Understand the existing implementation, then extend it.
- The **executor calls existing server actions only.** There is no new write path to tracker tables.
- New concerns get exactly one new owner; existing concerns are reused, never duplicated.
- Prefer the smallest change that satisfies the approved scope. Ship one coherent thing.
- Match the surrounding code's idiom, naming, and comment density. Write code that reads like the code already there.
- **One new failure domain per release.** Do not co-ship the excluded phase pairs named in the roadmap.

## Consolidation Philosophy

- **Consolidation beats new functionality.** Before building anything, prove an existing screen, component, action, or workflow cannot be extended to cover it.
- If two systems can become one, make them one.
- Prefer **deleting UI to adding UI.** Reclaimed space and fewer surfaces are wins.
- Every new capability must name, in its handoff, the existing component/table/action it reuses. "Reuses nothing" is a red flag requiring justification.
- V6 must feel simpler than V5, which was simpler than V4. The trend does not reverse.

## One Source of Truth Rules

- Incoming documents: owned by `intake_documents`. Nothing else stores raw intake.
- Pending AI suggestions: owned by `intake_proposals`. No other table holds AI-proposed changes.
- Human task approvals: owned by `task_reviews` (existing). AI proposals never write here.
- "What changed": owned by `activity_logs`.
- Notifications: owned by `notifications`, dispatched only by `lib/notify.ts`.
- Calendar truth: `calendar_events` + `v_calendar_feed`. No second calendar.
- Reports: `report_runs` + `lib/reports/run.ts`. No second generator.
- Canonical records (projects/tasks/submittals/notes/contacts/files) stay owned by their existing tables; proposals reference them, never shadow their columns.

## Code Quality Standards

- TypeScript strict; no `any` introduced to silence the compiler; no unchecked casts across trust boundaries.
- No dead code, no commented-out blocks, no TODOs left as the deliverable.
- Server-only logic stays server-only; no secrets, keys, or model configuration in client code.
- Errors surface to the user; failures are never swallowed silently (follow the existing action-result pattern).
- Reuse shared utilities (`cn`, `formatBadgeCount`, date/format helpers, list primitives) rather than re-implementing them.

## Implementation Standards

- Every mutation from intake goes through an existing server action; **never write directly when an action exists.**
- Nothing intake-originated writes to the tracker without explicit human approval.
- Bulk approval is permitted only for **additive, non-regulatory, High-confidence** items. Updates, status changes, deletes, deadline changes, and project creation are always individual.
- One approval gate per change — never gate the proposal and the action separately.
- Re-processing the same document is idempotent (dedupe key); approval never double-creates.
- Applied additive actions are reversible (Undo) and the reversal is logged; non-reversible actions are clearly marked as such.
- Confidence is advisory ordering only, never a gate for regulatory changes and never displayed as a number.

## Migration Standards

- Additive and idempotent only. The app is fully working after every migration.
- New V6 tables are limited to `intake_documents` and `intake_proposals`. Introducing another table requires a written amendment.
- RLS is defined for every new table in the same migration that creates it.
- Every new table has a retention/archival policy; nothing grows unbounded.
- No migration alters or drops existing data as a side effect.
- Regenerate types after any schema change; do not hand-edit generated types.

## UI Standards

- No UI element contains the word "AI," a percentage/confidence number, a model name, or a "generate" button that implies autonomy.
- The Review Center uses three lanes (Ready · Needs your input · FYI); it reuses the existing review interaction model and is not a second review system.
- Every proposal shows source provenance and, for updates, a before → after diff; every field is editable before approval.
- Reuse existing components (list rows, badges with `formatBadgeCount`, ⌘K search, document/report viewers) before creating new ones.
- Wide content scrolls inside its own container; the page body never scrolls horizontally.
- Prefer removing a surface to adding one.

## Permission Standards

- The Operations Center is visible and usable only at rank ≥ 30 (PM/Admin). Staff and Read-Only are fully excluded and never see it.
- Approval executes the underlying action under the **approver's own permissions**; the AI can never exceed what a human in that seat could do.
- Existing role gates are inherited, not re-implemented (project completion/archive = Manager/Lead/Admin; reports = rank ≥ 30; `users.staff_id`/`company_id` = admin only).
- Recipients resolve via `users.staff_id` (authoritative), never `staff.user_id`.

## Security Standards

- Untrusted document content is quarantined against prompt injection: injected instructions can never cause a write, and can never ride a bulk approval.
- The data-governance boundary (what may leave the building to the interpretation model) is documented and enforced before any external interpretation call; content sent is minimized.
- Inbound channels (email/mobile) are authenticated/allowlisted; an unauthenticated forward can never create a write.
- Interpretation and OCR run server-side only.
- RLS on all new tables; storage buckets remain private with signed-URL access.
- Regulatory/compliance records (submittal status, stamped deliverables) are never bulk- or auto-changed.

## AI Standards

- AI **proposes**; it never writes, sends, submits, completes, archives, or deletes.
- AI output is always staged in `intake_proposals` and always human-approved.
- No AI-specific write path, table, or workflow; AI integrates into existing actions and workflows.
- The model/provider/prompt are backstage and swappable; no UI or business logic depends on a specific model.
- The AI never fabricates: unknown people, projects, or dates are surfaced as questions, never invented.

## Documentation Standards

- The `CHANGELOG.md` gets an entry for every shipped phase (newest first).
- Deployment notes (flags, migrations to run, infra provisioned) are written before merge.
- Any admin-facing setting (AI/OCR/cost controls) has a short runbook.
- Documentation is updated in the same sprint as the change, not after.

## Testing Standards

- `npm run typecheck` passes with zero errors.
- `npm run build` (production build) passes.
- The sprint's changes are exercised end-to-end against the relevant phase's Manual QA Checklist in the Acceptance Specification.
- Security-sensitive phases include the prompt-injection corpus and permission-matrix checks.
- A change with a runtime surface is driven and observed, not just typechecked.

## Regression Standards

- Before merge, complete a regression analysis: list what could break and confirm it doesn't.
- My Work, Dashboard, Projects, Calendar, Activity, Reports, ⌘K, and existing create/review flows must be verified unchanged.
- No duplicate activity rows, no duplicate notifications, no second review surface, no parallel write path introduced.
- Existing role gates and RLS behavior are re-verified.

## Deployment Standards

- Every phase is independently deployable behind a feature flag and leaves the app fully working.
- Every phase has a verified rollback that degrades gracefully with no data loss.
- Migrations are applied in order; deployment notes state exactly which run and in what order.
- Required infrastructure (OCR/render engine, interpretation access, cost ceiling, monitoring) is provisioned before the phase that needs it.
- Go/No-Go requirements from the Acceptance Specification pass before internal deployment.

## Review Standards

- Every implementation is reviewed against this charter and the frozen specs, not just for correctness.
- The reviewer confirms: reuse over duplication, one owner per concern, no bypassed approval, no parallel write path, no UI leakage of AI, permission and security integrity.
- A change that violates any charter rule is rejected regardless of how well it works. Rejection criteria are enumerated in the Engineering Specification ("What Would Cause Version 6 To Be Rejected").
- Scope is respected: the sprint does exactly the approved scope and stops.

---

## Implementation Checklist

Every future implementation must satisfy all of the following before it is considered complete:

- □ Read existing implementation first
- □ Reuse existing actions
- □ Reuse existing components
- □ No duplicate data
- □ No duplicate workflows
- □ No hidden state
- □ One owner per concern
- □ Typecheck passes
- □ Production build passes
- □ Regression analysis completed
- □ Deployment notes written
- □ Documentation updated
- □ Handoff written
- □ Stop after approved scope

---

## Definition of an Acceptable Claude Implementation

An implementation sprint is complete only when **all** of the following are true. Anything less is unfinished, regardless of how much code was written.

1. **Scope discipline.** It implements exactly the approved scope for one phase — no more, no less. It does not begin the next phase, add unrequested features, or redesign anything frozen.

2. **Grounded in what exists.** The relevant existing code was read first. Every new capability names the existing tables, actions, and components it reuses. Nothing was rebuilt that already existed.

3. **One source of truth preserved.** No data is duplicated; each concern has exactly one owner. No parallel write path, no second review system, no second notification path, no second report generator, no second calendar, no hidden client/local state that diverges from the database.

4. **Approval and permission integrity.** Nothing intake-originated writes without human approval. Bulk approval is limited to additive, non-regulatory, High-confidence items. Approvals execute under the approver's own rights. The Operations Center is rank ≥ 30 only; My Work and the engineer experience are unchanged.

5. **Security satisfied.** Prompt injection cannot cause a write. The data-governance boundary is enforced. Inbound channels are authenticated. Regulatory records are never bulk/auto-changed. RLS covers every new table.

6. **AI stays invisible and advisory.** AI only proposes; it never writes, sends, completes, archives, or deletes. No model name, prompt, or confidence number appears in the UI. The AI never fabricates.

7. **Audit and reversibility.** Every applied mutation logs exactly once to `activity_logs`; the intake and approval decisions are logged. Additive applied actions are reversible via Undo, and the reversal is logged.

8. **Quality gates green.** `npm run typecheck` passes; `npm run build` passes; the change was exercised end-to-end against the phase's Manual QA Checklist.

9. **Regression verified.** A regression analysis is done and the untouched surfaces are confirmed unchanged. No duplicate activity or notifications introduced.

10. **Deployable and reversible.** The change sits behind a feature flag, has additive/idempotent migrations with RLS and retention, a verified rollback, and written deployment notes. Required infrastructure is provisioned.

11. **Documented and handed off.** The `CHANGELOG.md` has an entry; documentation is updated in the same sprint; a handoff states what shipped, what to verify, what was intentionally left, and any follow-ups.

12. **Charter-compliant.** It violates none of the rules in this charter and none of the rejection criteria in the Engineering Specification.

**Then, and only then, is the sprint done — and it stops there, awaiting the next approved scope.**
