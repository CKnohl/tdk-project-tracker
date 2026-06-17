// Live DB diagnostic. Reads .env.local itself; never prints secret values.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function parseEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {}
  return out;
}

const env = parseEnv('.env.local');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const looksJwt = (s) => typeof s === 'string' && s.startsWith('eyJ');
console.log('URL host       :', url ? new URL(url).host : '(missing)');
console.log('anon key       :', anon ? `present (len ${anon.length}, jwt=${looksJwt(anon)})` : '(missing)');
console.log('service key    :', service ? `present (len ${service.length}, jwt=${looksJwt(service)})` : '(missing)');
console.log('');

if (!url || !anon) {
  console.log('Cannot connect: missing URL or anon key in .env.local');
  process.exit(0);
}
const hasService = !!service && service !== 'your-service-role-key' && service.length > 40;

const tables = [
  'companies', 'roles', 'staff', 'users', 'projects', 'project_staff',
  'project_contacts', 'tasks', 'task_staff', 'project_submittals',
  'submittal_history', 'project_notes', 'project_files', 'notifications',
  'activity_logs', 'calendar_events', 'settings',
];
const views = [
  'v_project_stats', 'v_awaiting_response_projects', 'v_follow_up_needed',
  'v_staff_workload', 'v_calendar_feed',
];

async function rawProbe(key, label) {
  console.log(`\n----- raw REST probe (${label}) -----`);
  try {
    const res = await fetch(`${url}/rest/v1/roles?select=key`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log('HTTP status:', res.status, res.statusText);
    const text = await res.text();
    console.log('body:', text.slice(0, 300));
  } catch (e) {
    console.log('FETCH THREW:', e?.name, e?.message, e?.cause?.code ?? '');
  }
}

async function countAll(client, label) {
  console.log(`\n===== COUNTS via ${label} =====`);
  for (const t of [...tables, ...views]) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) console.log(String(t).padEnd(30), 'ERROR:', JSON.stringify({ code: error.code, msg: error.message, details: error.details, hint: error.hint }));
    else console.log(String(t).padEnd(30), count);
  }
}

await rawProbe(anon, 'anon');
if (hasService) await rawProbe(service, 'service');

// Anon client = what the browser/unauthenticated sees (RLS as anon role).
const anonClient = createClient(url, anon, { auth: { persistSession: false } });
await countAll(anonClient, 'ANON KEY (RLS = anon role)');

// Service client = bypasses RLS = ground truth of what is actually in the tables.
if (hasService) {
  const svc = createClient(url, service, { auth: { persistSession: false } });
  await countAll(svc, 'SERVICE ROLE (bypasses RLS = TRUE counts)');
} else {
  console.log('\nSERVICE ROLE key not set/real — cannot read TRUE counts (RLS bypass unavailable).');
}
