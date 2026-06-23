-- 0020_reports_storage.sql
-- Private storage bucket for generated Ready Report PDFs.
--
-- The only schema change this feature round needs: report_runs.pdf_path already
-- exists (added in 0018). Uploads and signed-download URLs are produced with the
-- service-role client (which bypasses storage RLS), so the only policy required
-- is a defense-in-depth read policy for managers/admins.
--
-- IDEMPOTENT: safe to run more than once; touches no existing data.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Read: Project Managers and Admins (rank >= 30). Uploads/downloads in the app go
-- through the service role; this policy only governs any direct authenticated reads.
drop policy if exists "reports read" on storage.objects;
create policy "reports read"
  on storage.objects for select to authenticated
  using (bucket_id = 'reports' and public.has_min_rank(30));
