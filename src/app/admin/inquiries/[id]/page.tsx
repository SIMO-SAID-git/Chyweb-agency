import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmSubmit, inputCls } from '@/components/admin/forms';
import { Flash, PageTitle } from '@/components/admin/ui';
import { enc, sb } from '@/lib/admin/db';
import { STATUSES } from '@/lib/admin/inquiry';
import { requireAdmin } from '@/lib/admin/session';
import { addNote, deleteInquiry, setInquiryRead, setInquiryStatus } from '../actions';
export const metadata = { title: 'Inquiry' };
const L: Record<string, string> = { new: 'New website', redesign: 'Redesign of an existing website', ecommerce: 'Online store', other: 'Something else', small: 'Small project', medium: 'Medium project', large: 'Large project', discuss: 'Prefers to discuss', asap: 'As soon as possible', short: '1-3 months', flexible: 'Flexible', en: 'English', fr: 'Français', ar: 'العربية' };
export default async function Inquiry({ params: { id }, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const s = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = (await sb(s, `inquiries?id=eq.${enc(id)}`)).rows[0];
  if (!row) notFound();
  if (!row.read_at) { await sb(s, `inquiries?id=eq.${enc(id)}`, { method: 'PATCH', body: { read_at: new Date().toISOString() } }).catch(() => undefined); } // opening = read
  const notes = (await sb(s, `inquiry_notes?inquiry_id=eq.${enc(id)}&select=id,note,created_at,profiles(name,email)&order=created_at.desc`)).rows;
  const v = (k: string, label: string, val?: string | null, ltr = false) => val ? <div><dt className="text-xs uppercase tracking-wider text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words" dir={ltr ? 'ltr' : undefined}>{val}</dd></div> : null;
  return (
    <>
      <PageTitle title={`Inquiry ${row.reference}`} action={<Link href="/admin/inquiries" className="text-sm text-muted hover:text-cyan">← All inquiries</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6 rounded-xl border p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            {v('n', 'Name', row.name)}{v('e', 'Email', row.email, true)}{v('p', 'Phone', row.phone, true)}{v('c', 'Company', row.company)}{v('co', 'Country', row.country)}{v('l', 'Language submitted in', L[row.lang] ?? row.lang)}
            {v('pt', 'Project type', L[row.project_type] ?? row.project_type)}{v('sv', 'Requested service', row.service)}{v('b', 'Budget (scope)', L[row.budget] ?? row.budget)}{v('t', 'Timeline', L[row.timeline] ?? row.timeline)}{v('u', 'Existing website', row.existing_url, true)}{v('d', 'Received', new Date(row.created_at).toLocaleString('en-GB'))}
          </dl>
          <dl className="space-y-5 border-t pt-5">{v('ds', 'Project description', row.description)}{v('o', 'Objectives', row.objectives)}{v('x', 'Additional information', row.extra)}</dl>
          <p className="border-t pt-4 text-xs text-muted">Notification emails: admin {row.admin_email_sent ? 'sent' : 'not sent'} · client confirmation {row.client_email_sent ? 'sent' : 'not sent'} (as reported by the sending service at submission time; email delivery is configured in a later stage).</p>
        </section>
        <aside className="space-y-6">
          <form action={setInquiryStatus} className="rounded-xl border p-4"><input type="hidden" name="id" value={id} /><label htmlFor="st" className="mb-2 block text-sm font-medium">Status</label>
            <div className="flex gap-2"><select id="st" name="status" defaultValue={row.status} className={inputCls}>{STATUSES.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select><button className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-navy">Save</button></div></form>
          <form action={setInquiryRead} className="rounded-xl border p-4"><input type="hidden" name="id" value={id} /><input type="hidden" name="value" value="0" /><button className="text-sm text-cyan">Mark as unread</button></form>
          <section className="rounded-xl border p-4"><h2 className="mb-3 text-sm font-medium">Private notes <span className="text-xs font-normal text-muted">(never public)</span></h2>
            <form action={addNote} className="mb-4 space-y-2"><input type="hidden" name="id" value={id} /><textarea name="note" rows={3} required maxLength={4000} aria-label="New note" className={inputCls} /><button className="rounded-full border px-4 py-1.5 text-xs hover:border-cyan">Add note</button></form>
            {notes.length === 0 ? <p className="text-sm text-muted">No notes yet.</p> : <ul className="space-y-3">{notes.map((n) => <li key={n.id} className="rounded-lg bg-white/5 p-3 text-sm"><p className="whitespace-pre-wrap">{n.note}</p><p className="mt-1 text-xs text-muted">{n.profiles?.name ?? n.profiles?.email ?? 'admin'} · {new Date(n.created_at).toLocaleString('en-GB')}</p></li>)}</ul>}</section>
          <form action={deleteInquiry} className="rounded-xl border border-red-400/20 p-4"><input type="hidden" name="id" value={id} /><p className="mb-3 text-xs text-muted">Prefer status “Archived”. Deleting is permanent and also deletes the notes.</p><ConfirmSubmit label="Delete inquiry" message="Permanently delete this inquiry and its notes?" /></form>
        </aside>
      </div>
    </>
  );
}
