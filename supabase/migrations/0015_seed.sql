-- 0015_seed.sql
-- Reference data: companies, roles, staff directory.

insert into companies (key, name, domain, color) values
  ('tdk', 'TDK Engineering', 'tdkengineering.com', '#1d4ed8'),
  ('mp',  'M&P Engineers',   'mpengineers.com',    '#0f766e')
on conflict (key) do nothing;

insert into roles (key, name, rank, description) values
  ('admin',           'Admin',           40, 'Full access; manage users, roles, companies, and global settings'),
  ('project_manager', 'Project Manager', 30, 'Full CRUD on all projects, tasks, and submittals; archive/restore'),
  ('staff',           'Staff',           20, 'Create projects/tasks; edit projects they are assigned to'),
  ('read_only',       'Read Only',       10, 'View-only access')
on conflict (key) do nothing;

-- Staff directory (shared across both companies). Initials chosen to be unique.
insert into staff (full_name, first_name, last_name, initials) values
  ('Connor Knohl',     'Connor',   'Knohl',      'CK'),
  ('Mike DiPaola',     'Mike',     'DiPaola',    'MD'),
  ('Matt Hosek',       'Matt',     'Hosek',      'MH'),
  ('John Herrmann',    'John',     'Herrmann',   'JH'),
  ('Liam Tierney',     'Liam',     'Tierney',    'LT'),
  ('Liv Poppleton',    'Liv',      'Poppleton',  'LP'),
  ('Shane O''Connor',  'Shane',    'O''Connor',  'SO'),
  ('Derek Schumaker',  'Derek',    'Schumaker',  'DS'),
  ('Samantha Rubeo',   'Samantha', 'Rubeo',      'SR'),
  ('Dan Coe',          'Dan',      'Coe',        'DC'),
  ('Eric Pugh',        'Eric',     'Pugh',       'EP'),
  ('Eric Buck',        'Eric',     'Buck',       'EB'),
  ('Joe Durand',       'Joe',      'Durand',     'JD'),
  ('Tom Trytek',       'Tom',      'Trytek',     'TT'),
  ('Philip Russo',     'Philip',   'Russo',      'PR'),
  ('Richard Miller',   'Richard',  'Miller',     'RM')
on conflict do nothing;

-- ── Admin bootstrap ─────────────────────────────────────────────────────────
-- Everyone is provisioned as Project Manager on first login. After the
-- designated owner signs in once with Microsoft, promote them to Admin by
-- uncommenting and setting the correct @tdkengineering.com address:
--
-- update users set role_id = (select id from roles where key = 'admin')
-- where email = 'connor.knohl@tdkengineering.com';
