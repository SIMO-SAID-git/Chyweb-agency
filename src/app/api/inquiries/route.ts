import { NextResponse } from 'next/server';
import { submitSchema } from '@/lib/inquiry';
import { db, dbConfigured } from '@/lib/supabase';
import { sendInquiryEmails } from '@/lib/email';
export const runtime = 'nodejs';
// In-memory limiter: protects a single instance. For multi-instance deployments use a shared store (see README).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(); const w = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (w.length >= 5) { hits.set(ip, w); return true; }
  w.push(now); hits.set(ip, w); return false;
}
const fail = (error: string, status: number, extra?: object) => NextResponse.json({ error, ...extra }, { status });
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (limited(ip)) return fail('rate', 429);
  if (Number(req.headers.get('content-length') ?? 0) > 20_000) return fail('validation', 413);
  let body: unknown;
  try { body = await req.json(); } catch { return fail('validation', 400); }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return fail('validation', 400, { fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) });
  const { lang, submissionId, website: _h, startedAt, consent: _c, ...d } = parsed.data; void _h; void _c;
  if (Date.now() - startedAt < 3000) return fail('validation', 400); // submitted faster than a human could
  if (!dbConfigured()) return fail('config', 503);
  const row = {
    submission_id: submissionId, name: d.name, email: d.email, phone: d.phone || null, company: d.company || null, country: d.country || null,
    project_type: d.projectType, service: d.service, description: d.description, objectives: d.objectives || null, existing_url: d.existingUrl || null,
    budget: d.budget, timeline: d.timeline, extra: d.extra || null, lang, consent_at: new Date().toISOString(),
  };
  try {
    const ins = await db('inquiries', { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=representation' } });
    if (ins.status === 409) { // same submissionId already stored -> duplicate click / retry
      const r = await db(`inquiries?submission_id=eq.${submissionId}&select=reference`);
      const [ex] = r.ok ? await r.json() : [];
      return ex ? NextResponse.json({ ok: true, reference: ex.reference, emails: { client: false }, duplicate: true }) : fail('server', 500);
    }
    if (!ins.ok) { console.error('inquiry insert failed', ins.status); return fail('server', 500); }
    const [rec] = await ins.json();
    const emails = await sendInquiryEmails({ ...d, consent: true, lang }, rec.reference);
    await db(`inquiries?id=eq.${rec.id}`, { method: 'PATCH', body: JSON.stringify({ admin_email_sent: emails.admin, client_email_sent: emails.client }) }).catch(() => undefined);
    return NextResponse.json({ ok: true, reference: rec.reference, emails });
  } catch { console.error('inquiry handler error'); return fail('server', 500); }
}
