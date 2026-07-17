-- 0036_intake_documents.sql
-- V6 Phase 0 — Operations Center intake store (no AI).
--
-- A pre-project home for documents that arrive at the office BEFORE we know which
-- project they belong to. Owned exclusively by the Operations Center (rank >= 30 =
-- PM/Admin). Filing a document to a project is done through the EXISTING note/task
-- server actions; this table only tracks the document + its lifecycle
-- (received -> in_progress -> filed -> archived; any state can be reopened to
-- received). filed_at / filed_by record who filed it and when for quick display —
-- the authoritative filing audit is still the activity_logs row the note/task trigger
-- writes. It intentionally does NOT trigger activity_logs itself, so activity logging
-- stays single-sourced.
--
-- Additive + IDEMPOTENT. No existing rows change.

-- ── 1. Table ────────────────────────────────────────────────────────────────
create table if not exists intake_documents (
  id               uuid primary key default gen_random_uuid(),
  source_type      text not null default 'upload'
                     check (source_type in ('upload', 'email', 'meeting', 'scan', 'other')),
  storage_path     text not null,                    -- intake/{uuid}-{filename}
  file_name        text not null,
  mime_type        text,
  size_bytes       bigint,
  status           text not null default 'received'
                     check (status in ('received', 'in_progress', 'filed', 'archived')),
  filed_project_id uuid references projects(id) on delete set null,
  filed_at         timestamptz,
  filed_by         uuid references users(id),
  note             text,
  uploaded_by      uuid references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists intake_documents_status_idx on intake_documents (status, created_at desc);

drop trigger if exists trg_intake_updated on intake_documents;
create trigger trg_intake_updated
  before update on intake_documents
  for each row execute function set_updated_at();

-- ── 2. RLS — Operations Center is PM/Admin only (rank >= 30) ─────────────────
alter table intake_documents enable row level security;

drop policy if exists intake_documents_select on intake_documents;
create policy intake_documents_select on intake_documents for select to authenticated
  using (has_min_rank(30));

drop policy if exists intake_documents_insert on intake_documents;
create policy intake_documents_insert on intake_documents for insert to authenticated
  with check (has_min_rank(30));

drop policy if exists intake_documents_update on intake_documents;
create policy intake_documents_update on intake_documents for update to authenticated
  using (has_min_rank(30)) with check (has_min_rank(30));

drop policy if exists intake_documents_delete on intake_documents;
create policy intake_documents_delete on intake_documents for delete to authenticated
  using (has_min_rank(30));

-- ── 3. Private storage bucket for intake documents ──────────────────────────
insert into storage.buckets (id, name, public)
values ('intake', 'intake', false)
on conflict (id) do nothing;

-- Read/upload/update/delete: PM/Admin (rank >= 30). Uploads and signed downloads
-- in the app go through the user-scoped client, so these policies are authoritative.
drop policy if exists "intake read" on storage.objects;
create policy "intake read"
  on storage.objects for select to authenticated
  using (bucket_id = 'intake' and public.has_min_rank(30));

drop policy if exists "intake insert" on storage.objects;
create policy "intake insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'intake' and public.has_min_rank(30));

drop policy if exists "intake update" on storage.objects;
create policy "intake update"
  on storage.objects for update to authenticated
  using (bucket_id = 'intake' and public.has_min_rank(30));

drop policy if exists "intake delete" on storage.objects;
create policy "intake delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'intake' and public.has_min_rank(30));

-- ── 4. Grants (self-contained regardless of who runs it) ────────────────────
grant select, insert, update, delete on intake_documents to authenticated, service_role;
