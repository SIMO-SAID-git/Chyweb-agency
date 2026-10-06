#!/usr/bin/env node
// Chyweb: Supabase verification. READ-ONLY by default. Never prints keys, tokens or passwords.
//   node scripts/verify-supabase.mjs                run read-only checks
//   node scripts/verify-supabase.mjs --write-test   ALSO create ONE clearly-labelled test inquiry (never deleted automatically)
// Reads .env.local / .env (shell variables take priority). Optional admin check: VERIFY_ADMIN_EMAIL + VERIFY_ADMIN_PASSWORD.
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AE = process.env.VERIFY_ADMIN_EMAIL || '', AP = process.env.VERIFY_ADMIN_PASSWORD || '';
const WRITE = process.argv.includes('--write-test');
const secrets = [SVC, AP, ANON].filter(Boolean);
const redact = (s) => secrets.reduce((a, x) => a.split(x).join('[redacted]'), String(s));
let fails = 0, passes = 0;
const out = (t, m) => console.log(`${t.padEnd(5)} ${redact(m)}`);
const pass = (m) => { passes++; out('PASS', m); }, fail = (m) => { fails++; out('FAIL', m); }, skip = (m) => out('SKIP', m), info = (m) => out('INFO', m);
// Same header rule as src/lib/supabase.ts
async function req(path, { key = ANON, token, method = 'GET', body, extra = {} } = {}) {
  const h = { apikey: key, 'Content-Type': 'application/json', ...extra };
  if (token) h.Authorization = `Bearer ${token}`; else if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  try {
    const r = await fetch(URL_ + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* not json */ }
    return { status: r.status, json: j, headers: r.headers };
  } catch (e) { return { status: 0, json: null, err: e.name }; }
}
const denied = (r) => [401, 403].includes(r.status) || r.json?.code === '42501';
const kind = (k) => (k.startsWith('sb_secret_') ? 'new secret key (sb_secret_...)' : k.startsWith('sb_publishable_') ? 'new publishable key (sb_publishable_...)' : k.split('.').length === 3 ? 'legacy JWT key' : 'unrecognised format');
const TABLES = ['profiles', 'projects', 'services', 'service_projects', 'faqs', 'testimonials', 'pricing_packages', 'site_content', 'inquiries', 'inquiry_notes', 'media_assets', 'activity_log'];
const ICOLS = 'id,reference,submission_id,name,email,phone,company,country,project_type,service,description,objectives,existing_url,budget,timeline,extra,lang,status,consent_at,admin_email_sent,client_email_sent,created_at,updated_at';
const goodRow = (o = {}) => ({ submission_id: randomUUID(), name: 'Verification Test', email: 'verify@example.com', project_type: 'new', service: 'dev', description: 'Automated verification inquiry, safe to delete.', budget: 'discuss', timeline: 'flexible', lang: 'en', consent_at: new Date().toISOString(), ...o });

console.log('\n== A. Configuration');
if (!/^(https:\/\/[a-z0-9]+\.supabase\.co|http:\/\/(127\.0\.0\.1|localhost):\d+)$/.test(URL_)) { fail('NEXT_PUBLIC_SUPABASE_URL missing or not https://<ref>.supabase.co'); process.exit(1); } else pass(`project host ${new URL(URL_).host}`);
ANON ? pass(`anon/publishable key present: ${kind(ANON)}`) : fail('NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
SVC ? pass(`server key present: ${kind(SVC)}`) : fail('SUPABASE_SERVICE_ROLE_KEY missing (server-only secret)');
if (SVC && SVC.startsWith('sb_publishable_')) fail('SUPABASE_SERVICE_ROLE_KEY holds a PUBLISHABLE key; it must be the secret/service_role key');
if (!ANON || !SVC || fails) { console.log('\nFix configuration and re-run.'); process.exit(1); }

console.log('\n== B. Server key (service role): schema, tables, storage');
const reach = await req('/rest/v1/profiles?select=id&limit=0', { key: SVC });
if (reach.status === 0) { fail(`cannot reach Supabase (${reach.err})`); process.exit(1); }
if ([401, 403].includes(reach.status) && /jwt|api key/i.test(JSON.stringify(reach.json))) fail(`server key rejected (HTTP ${reach.status}): wrong key, or wrong key type for this project`);
for (const t of TABLES) { const r = await req(`/rest/v1/${t}?select=*&limit=0`, { key: SVC }); r.status === 200 ? pass(`table ${t} exists and is readable`) : fail(`table ${t}: HTTP ${r.status} ${r.json?.code ?? ''} ${r.json?.message ?? ''}`); }
{ const r = await req(`/rest/v1/inquiries?select=${ICOLS}&limit=0`, { key: SVC }); r.status === 200 ? pass('inquiries has every column the app reads/writes') : fail(`inquiries column mismatch: ${r.json?.message ?? r.status}`); }
{ const r = await req('/rest/v1/inquiries?select=id', { key: SVC, method: 'HEAD', extra: { Prefer: 'count=exact' } }); const n = r.headers?.get('content-range')?.split('/')[1]; r.status < 300 ? pass(`inquiry retrieval works (server key); ${n ?? '?'} inquiries stored`) : fail(`inquiry retrieval failed: HTTP ${r.status}`); }
{ const r = await req('/storage/v1/bucket/media', { key: SVC }); const b = r.json;
  if (r.status !== 200) fail(`storage bucket "media" not found (HTTP ${r.status})`);
  else { b.public ? pass('bucket media exists and is public (for website images)') : fail('bucket media is not public'); b.file_size_limit === 5242880 ? pass('bucket size limit is 5 MB') : fail(`bucket size limit is ${b.file_size_limit}`); (b.allowed_mime_types || []).includes('image/jpeg') && !(b.allowed_mime_types || []).some((m) => !m.startsWith('image/')) ? pass('bucket accepts images only') : fail('bucket mime types are not images-only'); } }

console.log('\n== C. Public visitor (anon key): allowed reads, blocked reads, blocked writes');
for (const t of ['projects', 'services', 'faqs', 'pricing_packages', 'testimonials', 'site_content']) { const r = await req(`/rest/v1/${t}?select=*&limit=1`); r.status === 200 && Array.isArray(r.json) ? pass(`anon can read public content: ${t}`) : fail(`anon read of ${t}: HTTP ${r.status} ${r.json?.message ?? ''}`); }
for (const [t, f] of [['projects', 'published=eq.false'], ['services', 'published=eq.false'], ['faqs', 'published=eq.false'], ['pricing_packages', 'published=eq.false'], ['testimonials', 'or=(approved.eq.false,published.eq.false)'], ['site_content', 'is_public=eq.false']]) { const r = await req(`/rest/v1/${t}?select=*&${f}`); r.status === 200 && Array.isArray(r.json) && r.json.length === 0 ? pass(`anon sees NO drafts/hidden rows in ${t}`) : fail(`anon can see non-public rows in ${t} (HTTP ${r.status}, ${Array.isArray(r.json) ? r.json.length : '?'} rows)`); }
for (const t of ['inquiries', 'inquiry_notes', 'profiles', 'activity_log', 'media_assets']) { const r = await req(`/rest/v1/${t}?select=*&limit=1`); denied(r) ? pass(`anon CANNOT read ${t}`) : fail(`PRIVATE DATA EXPOSED: anon read of ${t} returned HTTP ${r.status}`); }
// Write probes use deliberately INVALID rows: even if a permission were wrongly open, the constraint rejects the row, so nothing is stored.
{ const r = await req('/rest/v1/projects', { method: 'POST', body: { slug: 'Bad Slug' } }); denied(r) ? pass('anon CANNOT write projects') : fail(`anon write path to projects is open (HTTP ${r.status} ${r.json?.code ?? ''})`); }
{ const r = await req('/rest/v1/inquiries', { method: 'POST', body: goodRow({ email: 'invalid' }) }); denied(r) ? pass('anon CANNOT insert inquiries directly (only the server can)') : fail(`anon insert path to inquiries is open (HTTP ${r.status} ${r.json?.code ?? ''})`); }
{ const r = await req('/storage/v1/object/list/media', { method: 'POST', body: { prefix: '', limit: 1 } }); !(r.status === 200 && Array.isArray(r.json) && r.json.length) ? pass('anon cannot list files in the media bucket') : fail('anon can list the media bucket'); }

console.log('\n== D. Inquiry write path (server key)');
for (const [label, row] of [['invalid email rejected by database CHECK', goodRow({ email: 'not-an-email' })], ['unknown budget rejected by database enum', goodRow({ budget: 'huge' })]]) {
  const r = await req('/rest/v1/inquiries', { key: SVC, method: 'POST', body: row, extra: { Prefer: 'return=representation' } });
  if (r.status === 400) pass(`${label} (insert path works, nothing stored)`);
  else if (r.status === 201) fail(`${label}: the row was ACCEPTED and stored (reference ${r.json?.[0]?.reference ?? '?'}). Delete it in Supabase and re-check the migration.`);
  else fail(`${label}: unexpected HTTP ${r.status} ${r.json?.message ?? ''}`);
}
if (WRITE) {
  const row = goodRow({ email: `verify-${Date.now()}@example.com` });
  const r = await req('/rest/v1/inquiries', { key: SVC, method: 'POST', body: row, extra: { Prefer: 'return=representation' } });
  if (r.status !== 201) fail(`test inquiry creation failed: HTTP ${r.status} ${r.json?.message ?? ''}`);
  else {
    pass(`test inquiry CREATED, reference ${r.json[0].reference} (please delete it from the dashboard/Table Editor; this script never deletes)`);
    const g = await req(`/rest/v1/inquiries?submission_id=eq.${row.submission_id}&select=reference,status,lang`, { key: SVC });
    g.json?.[0]?.status === 'new' ? pass('test inquiry retrieved by server key with status "new"') : fail('could not read back the test inquiry');
    const a = await req(`/rest/v1/inquiries?submission_id=eq.${row.submission_id}&select=id`);
    denied(a) ? pass('anon cannot read the new inquiry') : fail('anon can read the new inquiry');
    const d = await req('/rest/v1/inquiries', { key: SVC, method: 'POST', body: row });
    d.status === 409 ? pass('duplicate submission is rejected with 409') : fail(`duplicate submission returned HTTP ${d.status} (expected 409)`);
  }
} else skip('real inquiry creation (re-run with --write-test; creates ONE labelled test row)');

console.log('\n== E. Admin access (optional)');
if (!AE || !AP) skip('set VERIFY_ADMIN_EMAIL and VERIFY_ADMIN_PASSWORD in your shell to test admin login/authorization');
else {
  const s = await req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: AE, password: AP } });
  if (s.status !== 200 || !s.json?.access_token) fail(`admin sign-in failed (HTTP ${s.status}): check the email/password, that the user is confirmed, and that sign-in is enabled`);
  else {
    const token = s.json.access_token; pass('admin sign-in via Supabase Auth works');
    const p = await req('/rest/v1/profiles?select=role', { token });
    const role = p.json?.[0]?.role;
    role ? pass(`signed-in user has a staff profile, role = ${role}`) : fail('signed-in user has NO profile row: run supabase/first-admin.sql');
    const i = await req('/rest/v1/inquiries?select=id&limit=1', { token });
    if (role === 'admin') i.status === 200 ? pass('admin can read inquiries (RLS)') : fail(`admin cannot read inquiries: HTTP ${i.status}`);
    else if (role === 'editor') (i.status === 200 && i.json.length === 0) || denied(i) ? pass('editor cannot read inquiries (as designed)') : fail('editor can read inquiries but should not');
    const w = await req('/rest/v1/profiles', { token, method: 'POST', body: { id: randomUUID(), email: 'x@example.com', role: 'admin' } });
    denied(w) ? pass('signed-in user cannot create profiles / promote anyone to admin') : fail(`profile creation not blocked (HTTP ${w.status})`);
    await req('/auth/v1/logout', { token, method: 'POST' });
  }
}
console.log(`\n${fails ? 'RESULT: FAIL' : 'RESULT: PASS'}  (${passes} passed, ${fails} failed)`);
process.exit(fails ? 1 : 0);
