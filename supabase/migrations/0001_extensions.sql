-- 0001_extensions.sql
-- Required Postgres extensions.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email / domain columns
