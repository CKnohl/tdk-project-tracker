-- 0016_seed_projects.sql
-- Initial project portfolio (from the TDK / M&P intake list).
-- Idempotent-ish: guarded by ON CONFLICT on project_number / natural keys.

-- ── Projects ────────────────────────────────────────────────────────────────
insert into projects
  (project_number, name, company_id, status, phase, workflow_state,
   project_manager_id, target_completion_date, inactive_reason, description)
values
  ('2015019', 'West Herr - Clay',
     (select id from companies where key='tdk'), 'active', 'municipal_review', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Planning board submittal due 7/2/26.'),
  ('2026021', 'West Herr - Canandaigua',
     (select id from companies where key='tdk'), 'active', 'survey', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Topo pending and FOIL request pending. Planning board submittal due 8/3.'),
  ('2026039', 'West Herr - East Syracuse',
     (select id from companies where key='tdk'), 'active', 'existing_conditions', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Submit FOIL request due 6/18.'),
  ('2025065', 'General Office Park (Sroka)',
     (select id from companies where key='tdk'), 'active', 'municipal_review', 'needs_follow_up',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Town board / zoning board submittal due today (6/16).'),
  ('2025067', 'Tracey Dock',
     (select id from companies where key='tdk'), 'inactive', 'completed', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, 'completed',
     'Submitted and completed 1/27/26. Last correspondence: follow-up from Mike D on 3/30/26.'),
  ('2025023', 'Stepkovitch Retaining Wall',
     (select id from companies where key='tdk'), 'active', 'municipal_review', 'awaiting_response',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Planning board submittal completed 6/12 and awaiting response. Tom T has the check set and needs to review.'),
  ('2025042', 'Horseshoe Island',
     (select id from companies where key='tdk'), 'active', 'permitting', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Floodplain development application due 6/17.'),
  ('2025013', 'Massena Fuel Depot',
     (select id from companies where key='tdk'), 'active', 'engineering_design', 'normal',
     (select id from staff where full_name='Mike DiPaola'), '2026-11-30', null,
     'Construction drawings due 11/30/26.'),
  ('2008088', 'Nightingales Quarry',
     (select id from companies where key='tdk'), 'active', 'survey', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Check with Doug Reith (CNY Surveyors) on 7/14 to set up topo.'),
  ('2026557', 'Morgan - Lafayette Apartments',
     (select id from companies where key='mp'), 'on_hold', 'concept_design', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'On hold.'),
  ('2025528P', '6719 Pottery Road',
     (select id from companies where key='mp'), 'on_hold', 'concept_design', 'awaiting_response',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Conceptual site plan complete; awaiting client response.'),
  ('2023036', 'King & King - Palmyra',
     (select id from companies where key='tdk'), 'active', 'engineering_design', 'awaiting_response',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Upcoming site visit on the radar; waiting on contractor response.'),
  ('2022059', 'Grillo - South Street Apartments',
     (select id from companies where key='tdk'), 'active', 'engineering_design', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'BIM Revit model submittal to architects due 6/23.'),
  ('2025588G', 'Niagara Falls Market',
     (select id from companies where key='mp'), 'active', 'survey', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Won proposal/bid. Upcoming geotech and survey services; schedule geotech 7/6.'),
  ('2026024', 'Theresa Fast Lube - NYSDOT Permit',
     (select id from companies where key='tdk'), 'active', 'permitting', 'needs_follow_up',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'NYSDOT permit. Client to get insurance ready and authorize surveyor for topo; review spec sheet numbers.'),
  ('2026018', 'Van Anden - Street',
     (select id from companies where key='tdk'), 'active', 'engineering_design', 'needs_follow_up',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Check with Derek S on completion and project standing (due 6/17).'),
  ('2025047', 'Town of Theresa - Self Storage Facility',
     (select id from companies where key='tdk'), 'inactive', 'completed', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, 'completed',
     'Completed!'),
  ('2025018', 'MCSD Green Gateway Park',
     (select id from companies where key='tdk'), 'active', 'bidding', 'awaiting_response',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Waiting on the village to select a new contractor.'),
  ('2023042', 'Sposato - Watertown Property Evaluation',
     (select id from companies where key='tdk'), 'active', 'proposal', 'awaiting_response',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'As-built proposal finalized; awaiting client response.'),
  ('2026025', 'Parla - Seneca Ave Flood Analysis',
     (select id from companies where key='tdk'), 'active', 'proposal', 'awaiting_response',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Proposal sent via email on 6/15; awaiting client response.'),
  ('2025063', 'Broadwell',
     (select id from companies where key='tdk'), 'active', 'engineering_design', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Finalize design with contractor.'),
  ('2019069', 'Coe - Waterloo Property',
     (select id from companies where key='tdk'), 'active', 'proposal', 'needs_follow_up',
     (select id from staff where full_name='Joe Durand'), null, null,
     'Joe D is working with the attorney and client on a solution. (Madison)'),
  ('2026020', 'Solvay Youth Facility',
     (select id from companies where key='tdk'), 'active', 'municipal_review', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Transmittal due 6/16.'),
  ('2026003', 'H&E - Geneva Apartments',
     (select id from companies where key='tdk'), 'active', 'municipal_review', 'normal',
     (select id from staff where full_name='Mike DiPaola'), null, null,
     'Transmittal due 6/16.')
on conflict (project_number) do nothing;

-- ── Team assignments ────────────────────────────────────────────────────────
insert into project_staff (project_id, staff_id)
select p.id, s.id
from (values
  ('2015019','Mike DiPaola'),    ('2015019','Shane O''Connor'),
  ('2026021','Derek Schumaker'), ('2026021','Mike DiPaola'),
  ('2026039','Connor Knohl'),    ('2026039','John Herrmann'),    ('2026039','Mike DiPaola'),
  ('2025065','Mike DiPaola'),    ('2025065','Connor Knohl'),
  ('2025067','Mike DiPaola'),
  ('2025023','Matt Hosek'),      ('2025023','Connor Knohl'),     ('2025023','Mike DiPaola'),    ('2025023','Tom Trytek'),
  ('2025042','Eric Pugh'),       ('2025042','Mike DiPaola'),     ('2025042','Connor Knohl'),
  ('2025013','John Herrmann'),   ('2025013','Liv Poppleton'),    ('2025013','Mike DiPaola'),
  ('2008088','Mike DiPaola'),
  ('2026557','Eric Buck'),       ('2026557','Connor Knohl'),     ('2026557','Mike DiPaola'),
  ('2025528P','Connor Knohl'),   ('2025528P','Mike DiPaola'),
  ('2023036','Mike DiPaola'),
  ('2022059','Mike DiPaola'),    ('2022059','Richard Miller'),   ('2022059','Philip Russo'),
  ('2025588G','Mike DiPaola'),
  ('2026024','Mike DiPaola'),    ('2026024','Connor Knohl'),
  ('2026018','Connor Knohl'),    ('2026018','Derek Schumaker'),  ('2026018','Mike DiPaola'),
  ('2025018','Mike DiPaola'),
  ('2023042','Mike DiPaola'),
  ('2026025','Mike DiPaola'),
  ('2025063','Matt Hosek'),      ('2025063','Derek Schumaker'),  ('2025063','Joe Durand'),
  ('2019069','Joe Durand'),
  ('2026020','Connor Knohl'),    ('2026020','Mike DiPaola'),
  ('2026003','Connor Knohl'),    ('2026003','Mike DiPaola'),     ('2026003','Derek Schumaker'),
  ('2026003','John Herrmann'),   ('2026003','Joe Durand')
) as a(pn, sn)
join projects p on p.project_number = a.pn
join staff s on s.full_name = a.sn
on conflict do nothing;

-- ── Submittals ──────────────────────────────────────────────────────────────
insert into project_submittals
  (project_id, submission_type, agency, submission_date, response_due_date, assigned_staff_id, status, notes)
values
  ((select id from projects where project_number='2015019'), 'Planning Board', 'Town of Clay Planning Board',
     null, '2026-07-02', (select id from staff where full_name='Shane O''Connor'), 'ready_to_submit', null),
  ((select id from projects where project_number='2026021'), 'Planning Board', 'Canandaigua Planning Board',
     null, '2026-08-03', (select id from staff where full_name='Derek Schumaker'), 'drafting', 'Topo + FOIL pending.'),
  ((select id from projects where project_number='2025065'), 'Town Board / Zoning Board', 'Town Board / Zoning Board',
     null, '2026-06-16', (select id from staff where full_name='Mike DiPaola'), 'ready_to_submit', 'Due today.'),
  ((select id from projects where project_number='2025067'), 'Permit Submittal', null,
     '2026-01-27', null, (select id from staff where full_name='Mike DiPaola'), 'approved', 'Completed 1/27/26.'),
  ((select id from projects where project_number='2025023'), 'Planning Board', null,
     '2026-06-12', null, (select id from staff where full_name='Mike DiPaola'), 'awaiting_response', 'Submitted 6/12, awaiting response.'),
  ((select id from projects where project_number='2025042'), 'Floodplain Development Application', null,
     null, '2026-06-17', (select id from staff where full_name='Eric Pugh'), 'ready_to_submit', null),
  ((select id from projects where project_number='2022059'), 'BIM / Revit Model', 'Architect',
     null, '2026-06-23', (select id from staff where full_name='Richard Miller'), 'drafting', null),
  ((select id from projects where project_number='2026024'), 'NYSDOT Permit', 'NYSDOT',
     null, null, (select id from staff where full_name='Mike DiPaola'), 'drafting', 'Check spec sheet numbers for errors.'),
  ((select id from projects where project_number='2026020'), 'Transmittal', null,
     null, '2026-06-16', (select id from staff where full_name='Connor Knohl'), 'ready_to_submit', null),
  ((select id from projects where project_number='2026003'), 'Transmittal', null,
     null, '2026-06-16', (select id from staff where full_name='Connor Knohl'), 'ready_to_submit', null);

-- ── Tasks ───────────────────────────────────────────────────────────────────
insert into tasks (project_id, name, description, priority, status, due_date)
values
  ((select id from projects where project_number='2026021'), 'Obtain topo', 'Topo pending.', 'medium', 'not_started', null),
  ((select id from projects where project_number='2026021'), 'Submit FOIL request', 'FOIL request pending.', 'medium', 'not_started', null),
  ((select id from projects where project_number='2026039'), 'Submit FOIL request', null, 'high', 'not_started', '2026-06-18'),
  ((select id from projects where project_number='2025023'), 'Review check set of drawings', 'Tom T has the check set and needs to review.', 'high', 'in_progress', null),
  ((select id from projects where project_number='2025013'), 'Construction drawings', 'Project construction drawings.', 'medium', 'in_progress', '2026-11-30'),
  ((select id from projects where project_number='2008088'), 'Set up topo with CNY Surveyors', 'Check with Doug Reith to set up topo.', 'medium', 'not_started', '2026-07-14'),
  ((select id from projects where project_number='2025588G'), 'Schedule geotech services', 'Geotech + survey services.', 'medium', 'not_started', '2026-07-06'),
  ((select id from projects where project_number='2026024'), 'Client: get insurance ready', null, 'high', 'not_started', null),
  ((select id from projects where project_number='2026024'), 'Client: authorize surveyor for topo', null, 'high', 'not_started', null),
  ((select id from projects where project_number='2026024'), 'Review spec sheet & check numbers', 'Check spec numbers for any errors.', 'medium', 'not_started', null),
  ((select id from projects where project_number='2026018'), 'Confirm project standing with Derek S', 'Where was it left off?', 'high', 'not_started', '2026-06-17'),
  ((select id from projects where project_number='2025063'), 'Finalize design with contractor', null, 'medium', 'in_progress', null),
  ((select id from projects where project_number='2023036'), 'Schedule site visit', 'Upcoming site visit on the radar.', 'medium', 'not_started', null);

-- ── Task assignments ────────────────────────────────────────────────────────
insert into task_staff (task_id, staff_id)
select t.id, s.id
from (values
  ('2026021','Obtain topo','Derek Schumaker'),
  ('2026021','Submit FOIL request','Derek Schumaker'),
  ('2026039','Submit FOIL request','Connor Knohl'),
  ('2025023','Review check set of drawings','Tom Trytek'),
  ('2025013','Construction drawings','John Herrmann'),
  ('2008088','Set up topo with CNY Surveyors','Mike DiPaola'),
  ('2025588G','Schedule geotech services','Mike DiPaola'),
  ('2026024','Review spec sheet & check numbers','Connor Knohl'),
  ('2026018','Confirm project standing with Derek S','Derek Schumaker'),
  ('2025063','Finalize design with contractor','Derek Schumaker')
) as a(pn, tn, sn)
join projects p on p.project_number = a.pn
join tasks t on t.project_id = p.id and t.name = a.tn
join staff s on s.full_name = a.sn
on conflict do nothing;

-- ── Notes ───────────────────────────────────────────────────────────────────
insert into project_notes (project_id, body)
select p.id, a.body
from (values
  ('2025067', 'Submitted; project completed 1/27/26. Last correspondence was a follow-up from Mike D on 3/30/26.'),
  ('2025023', 'Tom T currently has the check set of drawings and needs to review them.'),
  ('2026557', 'Project is on hold.'),
  ('2025528P', 'Conceptual site plan is done; awaiting client response.'),
  ('2023036', 'Upcoming site visit on the radar; waiting on contractor response.'),
  ('2025588G', 'Just won the proposal/bid. Upcoming geotech and survey services.'),
  ('2025018', 'Waiting on the village to select a new contractor.'),
  ('2023042', 'As-built proposal is finalized; awaiting client response.'),
  ('2026025', 'Proposal sent via email on 6/15; awaiting client response.'),
  ('2019069', 'Joe D is working with the attorney and client on a solution.'),
  ('2026024', 'Tell client to get insurance ready and to authorize the surveyor for topo.')
) as a(pn, body)
join projects p on p.project_number = a.pn;

-- ── External contacts ───────────────────────────────────────────────────────
insert into project_contacts (project_id, name, company, role, notes)
select p.id, a.name, a.company, a.role::contact_role, a.notes
from (values
  ('2008088', 'Doug Reith', 'CNY Surveyors', 'surveyor', 'Coordinate topo setup (check 7/14).'),
  ('2022059', 'Architect',  null,            'architect', 'BIM/Revit model recipient.'),
  ('2023036', 'Contractor', null,            'contractor', 'Awaiting contractor response.'),
  ('2025063', 'Contractor', null,            'contractor', 'Finalizing design.'),
  ('2019069', 'Attorney',   null,            'attorney',   'Working on a solution with client.')
) as a(pn, name, company, role, notes)
join projects p on p.project_number = a.pn;
