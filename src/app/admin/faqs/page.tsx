import Link from 'next/link';
import { Badge, Empty, Flash, PageTitle, PublishToggle, Table } from '@/components/admin/ui';
import { sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
export const metadata = { title: 'FAQs' };
export default async function Faqs({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const { rows } = await sb(s, 'faqs?select=id,question,published,sort_order,services(title)&order=service_id.asc.nullsfirst,sort_order.asc');
  return (
    <>
      <PageTitle title="FAQs" action={<Link href="/admin/faqs/new" className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-navy">New FAQ</Link>} />
      <p className="mb-6 text-sm text-muted">FAQs linked to a service appear on that service&apos;s page. General FAQs (no service) appear on the FAQ page once at least one is published.</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      {rows.length === 0 ? <Empty>No FAQs yet.</Empty> : <Table head={['Order', 'Question (EN)', 'Belongs to', 'Status', '']}>
        {rows.map((r) => <tr key={r.id}><td className="px-4 py-3">{r.sort_order}</td><td className="px-4 py-3 font-medium">{r.question?.en}</td><td className="px-4 py-3 text-muted">{r.services?.title?.en ?? 'General'}</td><td className="px-4 py-3"><Badge on={r.published} /></td>
          <td className="flex gap-2 px-4 py-3"><Link href={`/admin/faqs/${r.id}`} className="rounded-full border px-3 py-1 text-xs hover:border-cyan hover:text-cyan">Edit</Link><PublishToggle table="faqs" id={r.id} published={r.published} /></td></tr>)}</Table>}
    </>
  );
}
