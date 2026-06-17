// Mints a real "authenticated" session for an existing user and queries as that
// role — the exact role the dashboard uses. Reads .env.local; prints no secrets.
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

const admin = createClient(url, service, { auth: { persistSession: false } });

const { data: list, error: le } = await admin.auth.admin.listUsers();
if (le) { console.log('listUsers ERROR:', le.message); process.exit(0); }
console.log('auth.users count:', list.users.length);
console.log('emails:', list.users.map((u) => u.email).join(', '));

const target = list.users.find((u) => /@(tdkengineering|mpengineers)\.com$/i.test(u.email || '')) || list.users[0];
if (!target) { console.log('No users to impersonate.'); process.exit(0); }
console.log('Impersonating:', target.email);

const { data: link, error: ge } = await admin.auth.admin.generateLink({ type: 'magiclink', email: target.email });
if (ge) { console.log('generateLink ERROR:', ge.message); process.exit(0); }

const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const { data: sess, error: ve } = await anonClient.auth.verifyOtp({
  type: 'magiclink',
  token_hash: link.properties.hashed_token,
});
if (ve) { console.log('verifyOtp ERROR:', ve.message); process.exit(0); }
const token = sess.session?.access_token;
console.log('Got authenticated session:', !!token);

const authed = createClient(url, anon, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
});

console.log('\n===== COUNTS as AUTHENTICATED (what the dashboard sees) =====');
for (const t of ['roles', 'users', 'companies', 'staff', 'projects', 'tasks', 'project_submittals', 'activity_logs', 'v_staff_workload', 'v_awaiting_response_projects']) {
  const { count, error } = await authed.from(t).select('*', { count: 'exact', head: true });
  console.log(String(t).padEnd(30), error ? `ERROR ${error.code}: ${error.message}` : `count=${count}`);
}
