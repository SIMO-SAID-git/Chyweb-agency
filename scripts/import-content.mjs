#!/usr/bin/env node
// Imports the ORIGINAL static content (src/content/site.ts + messages/*.json) into Supabase.
//   node scripts/import-content.mjs            DRY RUN (default): shows exactly what would be created. Writes nothing.
//   node scripts/import-content.mjs --apply    performs the import
// Safety: insert-only. Existing rows (matched by slug / import_key / link pair) are SKIPPED and NEVER overwritten, so manual
// CMS edits are safe. Nothing is ever deleted. Re-running creates nothing new. Uses the server key; never prints it.
import { readFileSync, existsSync } from 'node:fs';
for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
}
const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''), SVC = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APPLY = process.argv.includes('--apply');
if (!URL_ || !SVC) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).'); process.exit(1); }
const redact = (s) => String(s).split(SVC).join('[redacted]');
async function api(path, { method = 'GET', body, prefer } = {}) {
  const h = { apikey: SVC, 'Content-Type': 'application/json', ...(SVC.startsWith('sb_') ? {} : { Authorization: `Bearer ${SVC}` }), ...(prefer ? { Prefer: prefer } : {}) };
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* empty */ }
  if (!r.ok) throw new Error(redact(`${method} ${path.split('?')[0]} -> HTTP ${r.status} ${j?.message ?? t}`));
  return j;
}
// Source of truth during the transition: the arrays in site.ts (repo-owned code) + the translation files.
const src = readFileSync('src/content/site.ts', 'utf8');
const grab = (n) => new Function('return ' + src.match(new RegExp(`export const ${n} = (\\[[\\s\\S]*?\\n\\]) as const;`))[1])();
const SERVICES = grab('services'), PROJECTS = grab('projects');
const M = Object.fromEntries(['en', 'fr', 'ar'].map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))]));
const loc = (f) => Object.fromEntries(Object.keys(M).map((l) => [l, f(M[l])]));

const projectRows = PROJECTS.map((p, i) => ({ slug: p.slug, category: p.key, category_label: loc((m) => m.portfolio.items[p.key].c), title: loc((m) => m.portfolio.items[p.key].t),
  description: loc((m) => m.portfolio.items[p.key].d), thumbnail: p.img, thumbnail_alt: loc((m) => m.portfolio.items[p.key].alt), technologies: [...p.tech], is_concept: true, published: true, sort_order: (i + 1) * 10 }));
const serviceRows = SERVICES.map((s, i) => ({ key: s.key, slug: s.slug, title: loc((m) => m.services.items[s.key].t), description: loc((m) => m.services.items[s.key].d),
  lead: loc((m) => m.svc[s.key].lead), features: loc((m) => m.svc[s.key].inc), image: s.img, image_alt: loc((m) => m.services.items[s.key].alt), published: true, sort_order: (i + 1) * 10 }));
const faqKey = (s) => `service:${s.key}:faq-1`;

const have = async (t, col) => new Set((await api(`${t}?select=${col}`)).map((r) => r[col]));
const [pHave, sHave, fHave] = await Promise.all([have('projects', 'slug'), have('services', 'slug'), have('faqs', 'import_key')]);
console.log(`\nChyweb content import: ${APPLY ? 'APPLY' : 'DRY RUN (nothing will be written)'}   target: ${new URL(URL_).host}\n`);
const plan = (label, rows, set, key) => { let c = 0; for (const r of rows) { const exists = set.has(key(r)); if (!exists) c++; console.log(`  ${exists ? 'skip  (exists, never overwritten)' : 'CREATE'}  ${label} ${key(r)}`); } return c; };
const nP = plan('project', projectRows, pHave, (r) => r.slug), nS = plan('service', serviceRows, sHave, (r) => r.slug), nF = plan('faq    ', SERVICES, fHave, faqKey);
console.log(`\nWould create: ${nP} projects, ${nS} services, up to ${nF} service FAQs, plus service<->project links not yet present.`);
console.log('Testimonials: nothing imported (none exist; only real, approved ones may be added later).');
if (!APPLY) { console.log('\nDry run only. Re-run with --apply to import.'); process.exit(0); }

const ins = (t, rows, conflict) => api(`${t}?on_conflict=${conflict}`, { method: 'POST', body: rows, prefer: 'resolution=ignore-duplicates,return=representation' });
const cP = await ins('projects', projectRows, 'slug'), cS = await ins('services', serviceRows, 'slug');
const sid = Object.fromEntries((await api('services?select=id,slug,key')).map((r) => [r.slug, r.id])), pid = Object.fromEntries((await api('projects?select=id,slug')).map((r) => [r.slug, r.id]));
const links = SERVICES.flatMap((s) => s.related.map((slug, i) => ({ service_id: sid[s.slug], project_id: pid[slug], sort_order: (i + 1) * 10 }))).filter((l) => l.service_id && l.project_id);
const cL = links.length ? await ins('service_projects', links, 'service_id,project_id') : [];
const faqs = SERVICES.map((s, i) => ({ service_id: sid[s.slug], import_key: faqKey(s), question: loc((m) => m.svc[s.key].q), answer: loc((m) => m.svc[s.key].a), published: true, sort_order: 10 })).filter((f) => f.service_id);
const cF = await ins('faqs', faqs, 'import_key');
console.log(`\nCreated: ${cP.length} projects, ${cS.length} services, ${cL.length} links, ${cF.length} FAQs. (Everything else already existed and was left untouched.)`);
