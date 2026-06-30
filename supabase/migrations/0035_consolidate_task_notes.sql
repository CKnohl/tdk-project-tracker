-- 0035_consolidate_task_notes.sql
-- V5 Phase D — one task text field (Rule 0: one owner per fact).
--
-- The task form already edits ONLY `description`; `tasks.notes` is a legacy second
-- field that quietly diverged. Fold any remaining notes into description so no
-- content is lost, after which the UI shows a single field. The `notes` COLUMN is
-- intentionally KEPT here and dropped in V5.1 (deprecate-then-remove) — so this
-- step is non-destructive and reversible.
--
-- Guarded so a re-run can't double-append (idempotent in practice).

update tasks
set description = btrim(coalesce(description, '') || E'\n\n' || notes)
where notes is not null
  and btrim(notes) <> ''
  and (description is null or position(notes in description) = 0);
