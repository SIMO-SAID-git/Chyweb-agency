import type { InquiryInput } from './inquiry';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo && { reply_to: replyTo }) }),
    });
    if (!r.ok) console.error('resend failed', r.status);
    return r.ok;
  } catch { console.error('resend unreachable'); return false; }
}
const wrap = (dir: 'ltr' | 'rtl', body: string) => `<!doctype html><html dir="${dir}"><body style="margin:0;background:#0D1720;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#1A1D21;border-radius:12px;color:#fff" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #333;font-size:22px;font-weight:bold">Chy<span style="color:#00E0E0">web</span></td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#AEB8C0;text-align:${dir === 'rtl' ? 'right' : 'left'}">${body}</td></tr></table></body></html>`;
const copy = {
  en: { s: 'We received your inquiry', h: (n: string) => `Hello ${n},`, b: 'Thank you for contacting Chyweb. We have received your project inquiry and will review it carefully.', r: 'Reference', n: 'Next steps: we will read your details and reply by email to discuss your project. If you want to add anything, simply reply to this email.', g: 'The Chyweb team' },
  fr: { s: 'Nous avons bien reçu votre demande', h: (n: string) => `Bonjour ${n},`, b: 'Merci d’avoir contacté Chyweb. Nous avons bien reçu votre demande de projet et nous l’étudierons avec attention.', r: 'Référence', n: 'Prochaines étapes : nous lirons vos informations et vous répondrons par e-mail pour discuter de votre projet. Pour ajouter quelque chose, répondez simplement à cet e-mail.', g: 'L’équipe Chyweb' },
  ar: { s: 'استلمنا طلبك', h: (n: string) => `مرحبًا ${n}،`, b: 'شكرًا لتواصلك مع تشيويب. لقد استلمنا طلب مشروعك وسنراجعه بعناية.', r: 'الرقم المرجعي', n: 'الخطوات التالية: سنقرأ التفاصيل التي أرسلتها ونردّ عليك عبر البريد الإلكتروني لمناقشة مشروعك. إن أردت إضافة أي شيء، يكفي أن تردّ على هذه الرسالة.', g: 'فريق تشيويب' },
} as const;
export async function sendInquiryEmails(d: InquiryInput & { lang: 'en' | 'fr' | 'ar' }, ref: string) {
  const to = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
  const rows: [string, string][] = [['Reference', ref], ['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Company', d.company], ['Country', d.country],
    ['Project type', d.projectType], ['Service', d.service], ['Budget', d.budget], ['Timeline', d.timeline], ['Existing site', d.existingUrl], ['Language', d.lang],
    ['Description', d.description], ['Objectives', d.objectives], ['Additional', d.extra]];
  const table = rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#fff;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  const admin = to ? await send(to, `New inquiry ${ref} from ${d.name}`, wrap('ltr', `<p style="color:#fff;font-size:18px;margin-top:0">New project inquiry</p><table role="presentation">${table}</table>`), d.email) : false;
  const c = copy[d.lang];
  const client = await send(d.email, `${c.s} · ${ref}`, wrap(d.lang === 'ar' ? 'rtl' : 'ltr',
    `<p style="color:#fff;font-size:18px;margin-top:0">${esc(c.h(d.name))}</p><p>${c.b}</p><p>${c.r}: <strong style="color:#00E0E0">${ref}</strong></p><p>${c.n}</p><p>${c.g}</p>`), to || undefined);
  return { admin, client };
}
