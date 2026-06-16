-- 0003_identity.sql
-- Company, role, staff directory, and user profile tables.

create table companies (
  id         smallint generated always as identity primary key,
  key        text not null unique,           -- 'tdk' | 'mp'
  name       text not null,
  domain     citext not null unique,          -- maps an email domain to a company
  color      text,
  created_at timestamptz not null default now()
);

create table roles (
  id          smallint generated always as identity primary key,
  key         text not null unique,           -- admin | project_manager | staff | read_only
  name        text not null,
  rank        smallint not null unique,        -- higher = more privilege (drives RLS)
  description text
);

-- Assignable people. Not every staff member is necessarily an app user,
-- and not every user is necessarily in the assignable directory.
create table staff (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  first_name  text,
  last_name   text,
  initials    text,
  email       citext unique,
  company_id  smallint references companies(id),
  user_id     uuid,                            -- FK added after users exists (cross reference)
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- App accounts; id mirrors auth.users.id so auth.uid() = users.id.
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext not null unique,
  full_name   text,
  avatar_url  text,
  role_id     smallint not null references roles(id),
  company_id  smallint references companies(id),
  staff_id    uuid references staff(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table staff
  add constraint staff_user_fk foreign key (user_id) references users(id) on delete set null;

comment on table staff is 'Assignable directory of engineers/people; may or may not be linked to a login (users.id).';
comment on table users is 'Authenticated app accounts, mirror of auth.users with role + company.';
