#!/usr/bin/env node
// Chyweb: admin/CMS verification against YOUR Supabase project (Stage 3). Never prints keys, tokens or passwords.
//   VERIFY_ADMIN_EMAIL=... VERIFY_ADMIN_PASSWORD=... npm run verify:admin            read-only authorization checks
//   ... npm run verify:admin -- --write      ALSO creates + deletes its OWN temporary records (slug/name prefix "zz-verify-")
// Optional: VERIFY_EDITOR_EMAIL/_PASSWORD (role editor) and VERIFY_PLAIN_EMAIL/_PASSWORD (account with NO staff profile).
// Put the passwords in your terminal session only, never in a committed file. Your real content is never modified.
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const E = process.env, URL_ = (E.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''), ANON = E.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const WRITE = process.argv.includes('--write');
const creds = { admin: [E.VERIFY_ADMIN_EMAIL, E.VERIFY_ADMIN_PASSWORD], editor: [E.VERIFY_EDITOR_EMAIL, E.VERIFY_EDITOR_PASSWORD], plain: [E.VERIFY_PLAIN_EMAIL, E.VERIFY_PLAIN_PASSWORD] };
const secrets = [...Object.values(creds).map((c) => c[1]), ANON].filter(Boolean); const tokens = [];
const redact = (s) => [...secrets, ...tokens].reduce((a, x) => a.split(x).join('[redacted]'), String(s));
let fails = 0, passes = 0; const out = (t, m) => console.log(`${t.padEnd(5)} ${redact(m)}`);
const pass = (m) => { passes++; out('PASS', m); }, fail = (m) => { fails++; out('FAIL', m); }, skip = (m) => out('SKIP', m);
const denied = (r) => [401, 403].includes(r.status) || r.json?.code === '42501';
async function req(path, { token, method = 'GET', body, extra = {}, raw, ctype } = {}) {
  const h = { apikey: ANON, ...extra }; if (token) h.Authorization = `Bearer ${token}`; if (!raw && body !== undefined) h['Content-Type'] = 'application/json'; /* no body => no JSON content-type (Storage rejects that with HTTP 400) */ if (ctype) h['Content-Type'] = ctype;
  try { const r = await fetch(URL_ + path, { method, headers: h, body: raw ?? (body ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(20000) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* not json */ } return { status: r.status, json: j, headers: r.headers }; }
  catch (e) { return { status: 0, json: null, err: e.name }; }
}
async function signIn(who) {
  const [email, password] = creds[who]; if (!email || !password) return null;
  const r = await req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  if (r.status !== 200 || !r.json?.access_token) { fail(`${who}: sign-in failed (HTTP ${r.status}): check the email/password and that the user is confirmed`); return false; }
  tokens.push(r.json.access_token); return { token: r.json.access_token, id: r.json.user.id };
}
if (!URL_ || !ANON) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'); process.exit(1); }
console.log(`Target Supabase host: ${new URL(URL_).host}  (Auth, PostgREST and Storage requests all use this host)`);
const NIL = '00000000-0000-0000-0000-000000000000';
const anonSees = async (path) => { const r = await req(path); return r.status === 200 && Array.isArray(r.json) ? r.json.length : -1; };

console.log('\n== 1. Administrator');
const admin = await signIn('admin');
if (!admin) { if (admin === null) fail('VERIFY_ADMIN_EMAIL / VERIFY_ADMIN_PASSWORD are not set (use your terminal session)'); console.log(`\nRESULT: FAIL  (${passes} passed, ${fails} failed)`); process.exit(1); }
pass('admin signs in with Supabase Auth');
{ const r = await req(`/rest/v1/profiles?select=role&id=eq.${admin.id}`, { token: admin.token }); r.json?.[0]?.role === 'admin' ? pass('admin has a staff profile with role = admin') : fail(`profile role is "${r.json?.[0]?.role}" (run supabase/first-admin.sql)`); }
for (const t of ['inquiries', 'inquiry_notes', 'activity_log', 'profiles', 'media_assets', 'services', 'projects', 'testimonials', 'faqs']) { const r = await req(`/rest/v1/${t}?select=*&limit=1`, { token: admin.token }); r.status === 200 ? pass(`admin can read ${t}`) : fail(`admin cannot read ${t}: HTTP ${r.status}`); }
{ const r = await req('/rest/v1/inquiries?select=id,read_at&limit=1', { token: admin.token }); r.status === 200 ? pass('inquiries.read_at exists (migration 0003 applied)') : fail('inquiries.read_at missing: run supabase/migrations/0003_admin_cms.sql'); }
// Probes below target the all-zero id, so even a misconfigured database cannot change a real row.
{ const r = await req(`/rest/v1/inquiries?id=eq.${NIL}`, { token: admin.token, method: 'PATCH', body: { email: 'x@example.com' } }); denied(r) ? pass('admin CANNOT edit a client\'s submitted data (column permissions)') : fail(`admin may edit inquiry data columns (HTTP ${r.status})`); }
{ const r = await req(`/rest/v1/inquiries?id=eq.${NIL}`, { token: admin.token, method: 'PATCH', body: { status: 'contacted', read_at: null } }); r.status < 300 ? pass('admin CAN change status / read state') : fail(`admin cannot change status: HTTP ${r.status} ${r.json?.message ?? ''}`); }
{ const r = await req('/rest/v1/profiles', { token: admin.token, method: 'POST', body: { id: randomUUID(), email: 'nobody@example.com', role: 'admin' } }); denied(r) ? pass('admin CANNOT create profiles/roles through the API (roles are changed only in the SQL editor)') : fail(`profile creation is possible via the API (HTTP ${r.status})`); }
{ const r = await req(`/rest/v1/profiles?id=eq.${admin.id}`, { token: admin.token, method: 'PATCH', body: { role: 'admin' } }); denied(r) ? pass('admin CANNOT modify profiles through the API') : fail(`profiles can be modified via the API (HTTP ${r.status})`); }

console.log('\n== 2. Editor (optional)');
const editor = await signIn('editor');
if (editor) {
  { const r = await req(`/rest/v1/profiles?select=role&id=eq.${editor.id}`, { token: editor.token }); r.json?.[0]?.role === 'editor' ? pass('editor has role = editor') : fail(`editor profile role is "${r.json?.[0]?.role}"`); }
  { const r = await req('/rest/v1/inquiries?select=id&limit=5', { token: editor.token }); (denied(r) || (r.status === 200 && r.json.length === 0)) ? pass('editor CANNOT see any inquiry') : fail('editor can read inquiries'); }
  { const r = await req('/rest/v1/inquiry_notes?select=id&limit=5', { token: editor.token }); (denied(r) || (r.status === 200 && r.json.length === 0)) ? pass('editor CANNOT see inquiry notes') : fail('editor can read inquiry notes'); }
  { const r = await req('/rest/v1/services?select=id&limit=1', { token: editor.token }); r.status === 200 ? pass('editor can read content tables') : fail(`editor cannot read services: HTTP ${r.status}`); }
  { const r = await req(`/rest/v1/profiles?id=eq.${editor.id}`, { token: editor.token, method: 'PATCH', body: { role: 'admin' } }); denied(r) ? pass('editor CANNOT promote themselves') : fail('editor can change their own role'); }
} else if (editor === null) skip('set VERIFY_EDITOR_EMAIL / VERIFY_EDITOR_PASSWORD to test the editor role');

console.log('\n== 3. Account WITHOUT a staff profile (optional)');
const plain = await signIn('plain');
if (plain) {
  { const r = await req('/rest/v1/projects', { token: plain.token, method: 'POST', body: { slug: 'Bad Slug' } }); denied(r) ? pass('signed-in non-staff user CANNOT write content') : fail(`non-staff user write path is open (HTTP ${r.status})`); }
  { const r = await req('/rest/v1/profiles?select=id', { token: plain.token }); r.status === 200 && r.json.length === 0 ? pass('non-staff user sees no profiles') : fail('non-staff user can see profiles'); }
  { const r = await req('/rest/v1/inquiries?select=id&limit=1', { token: plain.token }); (denied(r) || (r.status === 200 && r.json.length === 0)) ? pass('non-staff user CANNOT read inquiries') : fail('non-staff user can read inquiries'); }
  { const r = await req(`/storage/v1/object/upload/sign/media/general/2000/${randomUUID()}.png`, { token: plain.token, method: 'POST', body: {} }); r.status >= 400 ? pass('non-staff user CANNOT get an upload URL') : fail('non-staff user can request storage uploads'); }
} else if (plain === null) skip('set VERIFY_PLAIN_EMAIL / VERIFY_PLAIN_PASSWORD (an Auth user with no profile) to test this');

console.log('\n== 4. Temporary-record tests (--write)');
if (!WRITE) skip('re-run with --write to test create / publish / unpublish / approval / storage with your own temporary records');
else {
  const tag = `zz-verify-${Date.now()}`; const cleanup = [];
  const L = (s) => ({ en: s });
  try {
    const S = { token: admin.token, extra: { Prefer: 'return=representation' } };
    { // service
      const r = await req('/rest/v1/services', { ...S, method: 'POST', body: { slug: tag, title: L('Verify'), description: L('Temporary'), published: true } });
      if (r.status !== 201) fail(`create service failed: HTTP ${r.status} ${r.json?.message ?? ''}`); else {
        const id = r.json[0].id; cleanup.push(`/rest/v1/services?id=eq.${id}`); pass('admin can create a service');
        (await anonSees(`/rest/v1/services?select=id&slug=eq.${tag}`)) === 1 ? pass('PUBLISHED service is visible to visitors') : fail('published service not visible to visitors');
        const d = await req('/rest/v1/services', { ...S, method: 'POST', body: { slug: tag, title: L('Dup'), description: L('x') } }); d.json?.code === '23505' ? pass('duplicate slug is rejected by the database') : fail(`duplicate slug accepted (HTTP ${d.status})`);
        const nz = await req('/rest/v1/services', { ...S, method: 'POST', body: { slug: `${tag}-x`, title: { fr: 'sans anglais' }, description: L('x') } }); (nz.json?.code === '23514') ? pass('a title without English is rejected') : fail(`title without English accepted (HTTP ${nz.status})`);
        await req(`/rest/v1/services?id=eq.${id}`, { ...S, method: 'PATCH', body: { published: false } });
        (await anonSees(`/rest/v1/services?select=id&slug=eq.${tag}`)) === 0 ? pass('UNPUBLISHED service disappears for visitors') : fail('unpublished service still visible to visitors');
        const anonW = await req(`/rest/v1/services?id=eq.${id}`, { method: 'PATCH', body: { published: true } }); denied(anonW) ? pass('visitors CANNOT publish it') : fail(`visitors can modify services (HTTP ${anonW.status})`);
      }
    }
    { // project
      const r = await req('/rest/v1/projects', { ...S, method: 'POST', body: { slug: tag, category: 'zz', category_label: L('ZZ'), title: L('Verify'), description: L('Temporary'), published: false } });
      if (r.status !== 201) fail(`create project failed: HTTP ${r.status} ${r.json?.message ?? ''}`); else {
        const id = r.json[0].id; cleanup.push(`/rest/v1/projects?id=eq.${id}`); pass('admin can create a project');
        (await anonSees(`/rest/v1/projects?select=id&slug=eq.${tag}`)) === 0 ? pass('DRAFT project is hidden from visitors') : fail('draft project visible to visitors');
        await req(`/rest/v1/projects?id=eq.${id}`, { ...S, method: 'PATCH', body: { published: true } });
        (await anonSees(`/rest/v1/projects?select=id&slug=eq.${tag}`)) === 1 ? pass('published project is visible') : fail('published project not visible');
      }
    }
    { // testimonial
      const bad = await req('/rest/v1/testimonials', { ...S, method: 'POST', body: { client_name: tag, feedback: L('x'), approved: false, published: true } });
      bad.json?.code === '23514' ? pass('a testimonial cannot be published without approval (database rule)') : (bad.status === 201 && cleanup.push(`/rest/v1/testimonials?id=eq.${bad.json[0].id}`), fail(`unapproved+published testimonial was accepted (HTTP ${bad.status})`));
      const r = await req('/rest/v1/testimonials', { ...S, method: 'POST', body: { client_name: tag, feedback: L('Temporary verification text'), approved: false, published: false } });
      if (r.status !== 201) fail(`create testimonial failed: HTTP ${r.status}`); else {
        const id = r.json[0].id; cleanup.push(`/rest/v1/testimonials?id=eq.${id}`);
        (await anonSees(`/rest/v1/testimonials?select=id&client_name=eq.${tag}`)) === 0 ? pass('pending testimonial is hidden from visitors') : fail('pending testimonial visible');
        await req(`/rest/v1/testimonials?id=eq.${id}`, { ...S, method: 'PATCH', body: { approved: true, published: true } });
        (await anonSees(`/rest/v1/testimonials?select=id&client_name=eq.${tag}`)) === 1 ? pass('approved + published testimonial is visible') : fail('approved testimonial not visible');
        await req(`/rest/v1/testimonials?id=eq.${id}`, { ...S, method: 'PATCH', body: { approved: false, published: false } });
        (await anonSees(`/rest/v1/testimonials?select=id&client_name=eq.${tag}`)) === 0 ? pass('rejected testimonial disappears') : fail('rejected testimonial still visible');
      }
    }
    { // storage (1x1 PNG), only objects created here are deleted
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'); const path = `general/2000/${randomUUID()}.png`;
      const a = await req(`/storage/v1/object/upload/sign/media/${path}`, { method: 'POST', body: {} }); a.status >= 400 ? pass('visitors CANNOT request an upload URL') : fail('visitors can request an upload URL');
      const s = await req(`/storage/v1/object/upload/sign/media/${path}`, { token: admin.token, method: 'POST', body: {} });
      if (s.status !== 200 || !s.json?.url) fail(`admin could not get an upload URL: HTTP ${s.status} ${s.json?.message ?? ''}`); else {
        pass('admin gets a signed upload URL'); const u = /^https?:/.test(s.json.url) ? s.json.url : `${URL_}/storage/v1${s.json.url.startsWith('/') ? '' : '/'}${s.json.url}`;
        cleanup.push(`/storage/v1/object/media/${path}`);
        const bad = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: 'not an image' }); bad.status >= 400 ? pass('non-image upload is rejected by the bucket') : fail('non-image upload was accepted');
        const up = await fetch(u, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png }); up.ok ? pass('PNG upload through the signed URL works') : fail(`PNG upload failed: HTTP ${up.status}`);
        const pub = await fetch(`${URL_}/storage/v1/object/public/media/${path}`); pub.ok && (pub.headers.get('content-type') || '').startsWith('image/') ? pass('uploaded image is publicly viewable') : fail(`public image URL failed: HTTP ${pub.status}`);
        const info = await req(`/storage/v1/object/info/media/${path}`, { token: admin.token }); info.status === 200 ? pass('admin can read the object info (used to register uploads)') : fail(`object info failed: HTTP ${info.status}`);
      }
    }
  } finally {
    const OBJ = '/storage/v1/object/media/'; const removedObjects = [];
    for (const p of cleanup.reverse()) {
      const isObj = p.startsWith(OBJ); const what = isObj ? `storage object media/${p.slice(OBJ.length)}` : `database row ${p.replace('/rest/v1/', '')}`;
      const r = await req(p, { token: admin.token, method: 'DELETE', extra: isObj ? {} : { Prefer: 'return=representation' } });
      const why = r.json?.message || r.json?.error || r.err || '';
      if (r.status === 0 || r.status >= 300) { fail(`cleanup failed for ${what} (HTTP ${r.status}${why ? `: ${why}` : ''}): delete it manually`); continue; }
      if (isObj) { removedObjects.push(p.slice(OBJ.length)); continue; }
      Array.isArray(r.json) && r.json.length === 1 ? pass(`cleanup removed exactly 1 ${what.split('?')[0].replace('database row ', '')} row`) : fail(`cleanup of ${what} matched ${Array.isArray(r.json) ? r.json.length : 'an unknown number of'} rows (expected 1)`);
    }
    // A Storage DELETE returning 200 is not proof: ask Storage itself whether the object still exists.
    for (const path of removedObjects) {
      const name = path.slice(path.lastIndexOf('/') + 1), dir = path.slice(0, path.lastIndexOf('/'));
      const info = await req(`/storage/v1/object/info/media/${path}`, { token: admin.token });
      (info.status === 404 || String(info.json?.statusCode) === '404' || info.json?.error === 'not_found') ? pass('Storage object is gone (authenticated info lookup says not found)') : fail(`Storage object still resolves after cleanup (info HTTP ${info.status}): delete media/${path} manually`);
      const lst = await req('/storage/v1/object/list/media', { token: admin.token, method: 'POST', body: { prefix: dir, search: name, limit: 10 } });
      lst.status === 200 && Array.isArray(lst.json) && !lst.json.some((o) => o.name === name) ? pass('Storage object is absent from the bucket listing') : fail(`bucket listing still shows, or could not confirm, media/${path} (HTTP ${lst.status})`);
      const pub = await fetch(`${URL_}/storage/v1/object/public/media/${path}?verify=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) }).catch(() => null);
      if (pub && !pub.ok) pass('public URL no longer serves the object'); else out('NOTE', 'public URL still answers; this can be CDN caching and is not counted as a failure (the two authoritative checks above decide)');
    }
    const mediaLeft = removedObjects.length ? ((await req(`/rest/v1/media_assets?select=id&path=in.(${removedObjects.join(',')})`, { token: admin.token })).json ?? []).length : 0;
    mediaLeft === 0 ? pass('no media_assets row refers to the temporary file') : fail(`${mediaLeft} media_assets row(s) refer to the temporary file`);
    const left = (await Promise.all(['services', 'projects'].map((t) => req(`/rest/v1/${t}?select=id&slug=like.${tag}*`, { token: admin.token })))).flatMap((r) => r.json ?? []).length + ((await req(`/rest/v1/testimonials?select=id&client_name=eq.${tag}`, { token: admin.token })).json ?? []).length;
    left === 0 ? pass('all temporary records were removed') : fail(`${left} temporary record(s) left behind: delete rows named "${tag}"`);
  }
}
console.log(`\n${fails ? 'RESULT: FAIL' : 'RESULT: PASS'}  (${passes} passed, ${fails} failed)`); process.exit(fails ? 1 : 0);
