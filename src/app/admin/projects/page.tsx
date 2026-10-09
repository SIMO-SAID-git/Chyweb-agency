import Link from 'next/link';
import { Badge, Empty, Flash, PageTitle, PublishToggle, Table } from '@/components/admin/ui';
import { sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
export const metadata = { title: 'Projects' };
export default async function Projects({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const { rows } = await sb(s, 'projects?select=id,slug,category_label,title,published,is_concept,sort_order&order=sort_order.asc');
  return (
    <>
      <PageTitle title="Projects" action={<Link href="/admin/projects/new" className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-navy">New project</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      {rows.length === 0 ? <Empty>No projects yet.</Empty> : <Table head={['Order', 'Title (EN)', 'Category', 'Slug', 'Status', '']}>
        {rows.map((r) => <tr key={r.id}><td className="px-4 py-3">{r.sort_order}</td><td className="px-4 py-3 font-medium">{r.title?.en}{r.is_concept && <span className="ms-2 text-xs text-muted">concept</span>}</td><td className="px-4 py-3">{r.category_label?.en}</td><td className="px-4 py-3 text-muted" dir="ltr">{r.slug}</td><td className="px-4 py-3"><Badge on={r.published} /></td>
          <td className="flex gap-2 px-4 py-3"><Link href={`/admin/projects/${r.id}`} className="rounded-full border px-3 py-1 text-xs hover:border-cyan hover:text-cyan">Edit</Link><PublishToggle table="projects" id={r.id} published={r.published} /></td></tr>)}</Table>}
    </>
  );
}
