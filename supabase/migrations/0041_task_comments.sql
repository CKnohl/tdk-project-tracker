-- 0041_task_comments.sql
-- Task timeline updates ("commented"). task_reviews generalizes from review-only
-- events to the append-only HUMAN TASK TIMELINE — review events (submitted /
-- approved / rejected) plus written updates (commented). Still one owner for
-- per-task narrative: nothing else stores task comments, and the review workflow
-- semantics are unchanged (the app decides who may submit vs approve/reject).
--
-- Used by: optional completion notes ("went to the appointment on time but the
-- office stopped accepting oil-based paints — didn't return everything") and
-- assignee-written updates on tasks/general tasks.
--
-- Additive + IDEMPOTENT. No existing rows change. RLS and grants from 0026
-- already cover it (read: everyone authenticated; append: rank >= 20; no
-- update/delete — append-only).

alter table task_reviews drop constraint if exists task_reviews_action_check;
alter table task_reviews add constraint task_reviews_action_check
  check (action in ('submitted', 'approved', 'rejected', 'commented'));
