import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm, ConfirmSubmit, LocalizedInput, inputCls } from '@/components/admin/forms';
import { Check, Field, Flash, PageTitle } from '@/components/admin/ui';
import { enc, sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
import { deleteFaq, saveFaq } from '../actions';
export const metadata = { title: 'Edit FAQ' };
export default async function EditFaq({ params: { id }, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff(); const isNew = id === 'new';
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row, services] = await Promise.all([isNew ? null : sb(s, `faqs?id=eq.${enc(id)}`).then((r) => r.rows[0]), sb(s, 'services?select=id,title&order=sort_order.asc').then((r) => r.rows)]);
  if (!isNew && !row) notFound();
  return (
    <>
      <PageTitle title={isNew ? 'New FAQ' : 'Edit FAQ'} action={<Link href="/admin/faqs" className="text-sm text-muted hover:text-cyan">← All FAQs</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="max-w-3xl">
        <AdminForm action={saveFaq} submit={isNew ? 'Create FAQ' : 'Save changes'}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="updated_at" value={row?.updated_at ?? ''} />
          <LocalizedInput name="question" label="Question" values={row?.question} required />
          <LocalizedInput name="answer" label="Answer" values={row?.answer} rows={5} required />
          <div><label htmlFor="f-service" className="mb-1 block text-sm font-medium">Belongs to</label>
            <select id="f-service" name="service" defaultValue={row?.service_id ?? ''} className={inputCls}><option value="">General (FAQ page)</option>{services.map((x) => <option key={x.id} value={x.id}>{x.title?.en}</option>)}</select></div>
          <Field label="Display order" name="sort" type="number" defaultValue={row?.sort_order ?? 0} />
          <Check name="published" label="Published" defaultChecked={row?.published} />
        </AdminForm>
        {!isNew && <form action={deleteFaq} className="mt-10 border-t pt-6"><input type="hidden" name="id" value={id} /><ConfirmSubmit label="Delete FAQ" message="Delete this FAQ permanently?" /></form>}
      </div>
    </>
  );
}
