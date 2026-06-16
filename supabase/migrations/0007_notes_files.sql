-- 0007_notes_files.sql
-- Project notes and file metadata (binaries live in Supabase Storage).

create table project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  body       text not null,
  author_id  uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  storage_path text not null,                       -- project-files/{project_id}/{uuid}-{filename}
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references users(id),
  created_at   timestamptz not null default now()
);
