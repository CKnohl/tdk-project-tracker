// Full live audit. Reads .env.local directly; prints no secret values.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const RELS = [
  'companies', 'roles', 'staff', 'users', 'projects', 'project_staff',
  'project_contacts', 'tasks', 'task_staff', 'project_submittals',
  'submittal_history', 'project_notes', 'project_files', 'notifications',
  'activity_logs', 'calendar_events', 'settings',
  'v_project_stats', 'v_awaiting_response_projects', 'v_follow_up_needed',
  'v_staff_workload', 'v_calendar_feed',
];

async function rawCount(apikeyVal, bearerVal, table) {
  // apikey MUST be the anon/service key; bearer is the role token (user JWT for authenticated).
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    method: 'GET',
    headers: { apikey: apikeyVal, Authorization: `Bearer ${bearerVal}`, Prefer: 'count=exact' },
  });
  if (res.status >= 200 && res.status < 300) {
    const range = res.headers.get('content-range'); // e.g. */24
    const count = range ? Number(range.split('/')[1]) : null;
    return { count, status: res.status };
  }
  let body = {};
  try { body = JSON.parse(await res.text()); } catch {}
  return { count: null, status: res.status, code: body.code, msg: body.message };
}

async function mintAuthToken() {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: list, error } = await admin.auth.admin.listUsers();
  if (error) return { error: error.message, users: [] };
  const users = list.users;
  const target = users.find((u) => /@(tdkengineering|mpengineers)\.com$/i.test(u.email || '')) || users[0];
  if (!target) return { error: 'no users', users };
  const { data: link, error: ge } = await admin.auth.admin.generateLink({ type: 'magiclink', email: target.email });
  if (ge) return { error: 'generateLink: ' + ge.message, users, target };
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: sess, error: ve } = await anonClient.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
  if (ve) return { error: 'verifyOtp: ' + ve.message, users, target };
  return { token: sess.session?.access_token, users, target };
}

const auth = await mintAuthToken();
console.log('auth.users count :', auth.users.length);
console.log('emails           :', auth.users.map((u) => u.email).join(', '));
console.log('impersonating    :', auth.target?.email, auth.error ? `(token error: ${auth.error})` : '(token ok)');

// [apikey, bearer] per role. authenticated uses anon apikey + the user JWT.
const roleAuth = {
  anon: [anon, anon],
  service_role: [service, service],
  ...(auth.token ? { authenticated: [anon, auth.token] } : {}),
};

console.log('\nRELATION'.padEnd(32), ['anon', 'service_role', 'authenticated'].map((r) => r.padEnd(16)).join(''));
for (const t of RELS) {
  const cells = [];
  for (const role of ['anon', 'service_role', 'authenticated']) {
    const pair = roleAuth[role];
    if (!pair) { cells.push('n/a'.padEnd(16)); continue; }
    const r = await rawCount(pair[0], pair[1], t);
    cells.push((r.count !== null ? `count=${r.count}` : `${r.status} ${r.code ?? 'err'}`).padEnd(16));
  }
  console.log(String(t).padEnd(32), cells.join(''));
}

// users.staff_id linkage for the current user
console.log('\n----- user linkage -----');
const apikeyVal = auth.token ? anon : service;
const bearerVal = auth.token || service;
const bestRole = auth.token ? 'authenticated' : 'service_role';
const res = await fetch(`${url}/rest/v1/users?select=id,email,role_id,staff_id&email=eq.cknohl@tdkengineering.com`, {
  headers: { apikey: apikeyVal, Authorization: `Bearer ${bearerVal}` },
});
console.log(`(via ${bestRole})`, await res.text());

// projects status breakdown if readable
console.log('\n----- projects status breakdown -----');
const pr = await fetch(`${url}/rest/v1/projects?select=status`, { headers: { apikey: apikeyVal, Authorization: `Bearer ${bearerVal}` } });
if (pr.ok) {
  const rows = await pr.json();
  const tally = {};
  for (const r of rows) tally[r.status] = (tally[r.status] || 0) + 1;
  console.log('total:', rows.length, 'by status:', JSON.stringify(tally));
} else {
  console.log('projects not readable:', pr.status, await pr.text());
}
