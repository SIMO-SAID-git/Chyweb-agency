import Link from 'next/link';
import { Badge, Empty, Flash, PageTitle, PublishToggle, Table } from '@/components/admin/ui';
import { sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
import { setApproved } from './actions';
export const metadata = { title: 'Testimonials' };
export default async function Testimonials({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const { rows } = await sb(s, 'testimonials?select=id,client_name,client_role,rating,approved,published,is_demo&order=sort_order.asc,created_at.desc');
  return (
    <>
      <PageTitle title="Testimonials" action={<Link href="/admin/testimonials/new" className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-navy">New testimonial</Link>} />
      <p className="mb-6 text-sm text-muted">Only real, client-approved testimonials. A testimonial is public only when it is both <b>approved</b> and <b>published</b>.</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      {rows.length === 0 ? <Empty>No testimonials yet. The website shows an honest “feedback will appear here” message until you add real ones.</Empty> : <Table head={['Client', 'Rating', 'Approved', 'Public', '']}>
        {rows.map((r) => <tr key={r.id}><td className="px-4 py-3 font-medium">{r.client_name}<span className="block text-xs font-normal text-muted">{r.client_role}{r.is_demo ? ' · demo' : ''}</span></td><td className="px-4 py-3">{r.rating ?? '-'}</td><td className="px-4 py-3"><Badge on={r.approved} yes="Approved" no="Pending" /></td><td className="px-4 py-3"><Badge on={r.published} yes="Public" no="Hidden" /></td>
          <td className="flex flex-wrap gap-2 px-4 py-3"><Link href={`/admin/testimonials/${r.id}`} className="rounded-full border px-3 py-1 text-xs hover:border-cyan hover:text-cyan">Edit</Link>
            <form action={setApproved} className="inline"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="value" value={r.approved ? '0' : '1'} /><button className="rounded-full border px-3 py-1 text-xs hover:border-cyan hover:text-cyan">{r.approved ? 'Reject' : 'Approve'}</button></form>
            {r.approved && <PublishToggle table="testimonials" id={r.id} published={r.published} />}</td></tr>)}</Table>}
    </>
  );
}
