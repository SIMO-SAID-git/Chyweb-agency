import Link from 'next/link';
import { Badge, Empty, PageTitle, Table } from '@/components/admin/ui';
import { AdminError, sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
export const metadata = { title: 'Dashboard' };

export default async function Dashboard() {
  const s = await requireStaff();
  const n = async (p: string) => (await sb(s, p, { count: true, range: [0, 0] })).total ?? 0;
  try {
    const [sv, svp, pj, pjp, ts, tsp, fq] = await Promise.all([n('services?select=id'), n('services?select=id&published=eq.true'), n('projects?select=id'), n('projects?select=id&published=eq.true'), n('testimonials?select=id'), n('testimonials?select=id&published=eq.true&approved=eq.true'), n('faqs?select=id')]);
    const admin = s.role === 'admin';
    const [inq, unread, fresh, recent] = admin ? await Promise.all([n('inquiries?select=id'), n('inquiries?select=id&read_at=is.null'), n('inquiries?select=id&status=eq.new'), sb(s, 'inquiries?select=id,reference,name,service,status,read_at,created_at&order=created_at.desc&limit=5')]) : [0, 0, 0, { rows: [] }];
    const { rows: activity } = await sb(s, 'activity_log?select=id,action,table_name,label,created_at&order=created_at.desc&limit=8');
    const card = (t: string, v: number | string, sub?: string, href?: string) => (
      <Link href={href ?? '#'} className="rounded-xl border bg-navy/60 p-5 transition hover:border-cyan/50"><p className="text-xs uppercase tracking-wider text-muted">{t}</p><p className="mt-2 text-3xl font-bold">{v}</p>{sub && <p className="mt-1 text-xs text-muted">{sub}</p>}</Link>);
    return (
      <>
        <PageTitle title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {card('Services', svp, `${svp} published of ${sv}`, '/admin/services')}{card('Projects', pjp, `${pjp} published of ${pj}`, '/admin/projects')}
          {card('Testimonials', tsp, `${tsp} public of ${ts}`, '/admin/testimonials')}{card('FAQs', fq, undefined, '/admin/faqs')}
          {admin && <>{card('Inquiries', inq, `${fresh} with status "new"`, '/admin/inquiries')}{card('Unread inquiries', unread, undefined, '/admin/inquiries?read=unread')}</>}
        </div>
        {admin && <section className="mt-10"><h2 className="mb-3 font-semibold">Recent inquiries</h2>
          {recent.rows.length === 0 ? <Empty>No inquiries yet.</Empty> : <Table head={['Reference', 'Name', 'Service', 'Status', 'Received']}>
            {recent.rows.map((r) => <tr key={r.id}><td className="px-4 py-3"><Link href={`/admin/inquiries/${r.id}`} className="text-cyan">{r.reference}</Link>{!r.read_at && <span className="ms-2 rounded-full bg-cyan px-2 py-0.5 text-[10px] font-bold text-navy">NEW</span>}</td><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.service}</td><td className="px-4 py-3"><Badge on={r.status !== 'new'} yes={r.status.replace('_', ' ')} no="new" /></td><td className="px-4 py-3 text-muted">{new Date(r.created_at).toLocaleString('en-GB')}</td></tr>)}</Table>}</section>}
        <section className="mt-10"><h2 className="mb-3 font-semibold">Recent activity</h2>
          {activity.length === 0 ? <Empty>No activity recorded yet.</Empty> : <Table head={['When', 'Action', 'Item']}>{activity.map((a) => <tr key={a.id}><td className="px-4 py-3 text-muted">{new Date(a.created_at).toLocaleString('en-GB')}</td><td className="px-4 py-3">{a.action.toLowerCase()} · {a.table_name}</td><td className="px-4 py-3">{a.label ?? ''}</td></tr>)}</Table>}</section>
      </>
    );
  } catch (e) { return <><PageTitle title="Dashboard" /><p role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">{e instanceof AdminError ? e.message : 'Could not load the dashboard.'}</p></>; }
}
