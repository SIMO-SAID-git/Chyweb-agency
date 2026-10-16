import Link from 'next/link';
import { Badge, Empty, Flash, PageTitle, Table } from '@/components/admin/ui';
import { inputCls } from '@/components/admin/forms';
import { enc, sb } from '@/lib/admin/db';
import { STATUSES, statusLabel } from '@/lib/admin/inquiry';
import { requireAdmin } from '@/lib/admin/session';
export const metadata = { title: 'Inquiries' };
const PER = 20;
type SP = { q?: string; status?: string; service?: string; read?: string; from?: string; to?: string; page?: string; ok?: string; err?: string };
export default async function Inquiries({ searchParams: sp }: { searchParams: SP }) {
  const s = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = 'inquiries?select=id,reference,name,email,service,status,lang,read_at,created_at&order=created_at.desc';
  if (STATUSES.some((x) => x[0] === sp.status)) q += `&status=eq.${sp.status}`;
  if (/^[a-z0-9_-]{1,40}$/.test(sp.service ?? '')) q += `&service=eq.${sp.service}`;
  if (sp.read === 'unread') q += '&read_at=is.null'; else if (sp.read === 'read') q += '&read_at=not.is.null';
  if (/^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? '')) q += `&created_at=gte.${sp.from}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? '')) q += `&created_at=lt.${new Date(new Date(sp.to!).getTime() + 86400000).toISOString().slice(0, 10)}`;
  const term = (sp.q ?? '').replace(/[^\p{L}\p{N}@.\- ]/gu, '').trim().slice(0, 60);
  if (term) q += `&or=(name.ilike.*${enc(term)}*,email.ilike.*${enc(term)}*,reference.ilike.*${enc(term)}*)`;
  const { rows, total = 0 } = await sb(s, q, { count: true, range: [(page - 1) * PER, page * PER - 1] });
  const services = (await sb(s, 'services?select=key,title&key=not.is.null&order=sort_order.asc')).rows;
  const pages = Math.max(1, Math.ceil(total / PER));
  const link = (p: number) => `/admin/inquiries?${new URLSearchParams(Object.entries({ ...sp, page: String(p), ok: '', err: '' }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <PageTitle title="Inquiries" />
      <Flash ok={sp.ok} err={sp.err} />
      <form className="mb-6 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input name="q" defaultValue={term} placeholder="Name, email or reference" aria-label="Search" className={`${inputCls} lg:col-span-2`} />
        <select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className={inputCls}><option value="">All statuses</option>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select name="service" defaultValue={sp.service ?? ''} aria-label="Service" className={inputCls}><option value="">All services</option>{services.map((x) => <option key={x.key} value={x.key}>{x.title?.en}</option>)}<option value="unsure">Not sure yet</option></select>
        <select name="read" defaultValue={sp.read ?? ''} aria-label="Read state" className={inputCls}><option value="">Read + unread</option><option value="unread">Unread</option><option value="read">Read</option></select>
        <div className="flex gap-2"><input type="date" name="from" defaultValue={sp.from} aria-label="From date" className={inputCls} /><input type="date" name="to" defaultValue={sp.to} aria-label="To date" className={inputCls} /></div>
        <div className="flex gap-2 lg:col-span-6"><button className="rounded-full bg-cyan px-5 py-2 text-sm font-semibold text-navy">Filter</button><Link href="/admin/inquiries" className="rounded-full border px-5 py-2 text-sm">Reset</Link></div>
      </form>
      {rows.length === 0 ? <Empty>No inquiries match.</Empty> : <Table head={['Reference', 'Name', 'Email', 'Service', 'Status', 'Language', 'Received']}>
        {rows.map((r) => <tr key={r.id} className={r.read_at ? '' : 'bg-cyan/5'}><td className="px-4 py-3"><Link href={`/admin/inquiries/${r.id}`} className="font-medium text-cyan">{r.reference}</Link>{!r.read_at && <span className="ms-2 rounded-full bg-cyan px-2 py-0.5 text-[10px] font-bold text-navy">NEW</span>}</td><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3 text-muted" dir="ltr">{r.email}</td><td className="px-4 py-3">{r.service}</td><td className="px-4 py-3"><Badge on={r.status !== 'new'} yes={statusLabel(r.status)} no="New" /></td><td className="px-4 py-3 uppercase">{r.lang}</td><td className="px-4 py-3 text-muted">{new Date(r.created_at).toLocaleString('en-GB')}</td></tr>)}</Table>}
      <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm text-muted"><span>{total} inquiries · page {page} of {pages}</span><span className="flex gap-3">{page > 1 && <Link href={link(page - 1)}>← Previous</Link>}{page < pages && <Link href={link(page + 1)}>Next →</Link>}</span></nav>
    </>
  );
}
