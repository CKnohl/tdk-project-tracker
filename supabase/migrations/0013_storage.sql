-- 0013_storage.sql
-- Private bucket for project files + storage RLS.

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Read: any authenticated app user
create policy "project files read"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-files');

-- Upload: staff and above
create policy "project files insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.has_min_rank(20));

-- Update (e.g. metadata/move): uploader or PM+
create policy "project files update"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-files' and (owner = auth.uid() or public.has_min_rank(30)));

-- Delete: uploader or PM+
create policy "project files delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and (owner = auth.uid() or public.has_min_rank(30)));
