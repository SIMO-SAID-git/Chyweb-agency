import Link from 'next/link';
import { Badge, Empty, Flash, PageTitle, PublishToggle, Table } from '@/components/admin/ui';
import { sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
export const metadata = { title: 'Services' };
export default async function Services({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const { rows } = await sb(s, 'services?select=id,key,slug,title,published,sort_order&order=sort_order.asc');
  return (
    <>
      <PageTitle title="Services" action={<Link href="/admin/services/new" className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-navy">New service</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      {rows.length === 0 ? <Empty>No services yet.</Empty> : <Table head={['Order', 'Title (EN)', 'Slug', 'Status', '']}>
        {rows.map((r) => <tr key={r.id}><td className="px-4 py-3">{r.sort_order}</td><td className="px-4 py-3 font-medium">{r.title?.en}</td><td className="px-4 py-3 text-muted" dir="ltr">{r.slug}</td><td className="px-4 py-3"><Badge on={r.published} /></td>
          <td className="flex gap-2 px-4 py-3"><Link href={`/admin/services/${r.id}`} className="rounded-full border px-3 py-1 text-xs hover:border-cyan hover:text-cyan">Edit</Link><PublishToggle table="services" id={r.id} published={r.published} /></td></tr>)}</Table>}
    </>
  );
}
