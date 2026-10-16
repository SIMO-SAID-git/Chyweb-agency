import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm, ConfirmSubmit, LocalizedInput } from '@/components/admin/forms';
import { Check, Field, Flash, PageTitle } from '@/components/admin/ui';
import { enc, sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
import { deleteTestimonial, saveTestimonial } from '../actions';
export const metadata = { title: 'Edit testimonial' };
export default async function EditTestimonial({ params: { id }, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff(); const isNew = id === 'new';
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = isNew ? null : (await sb(s, `testimonials?id=eq.${enc(id)}`)).rows[0];
  if (!isNew && !row) notFound();
  return (
    <>
      <PageTitle title={isNew ? 'New testimonial' : `Edit: ${row?.client_name}`} action={<Link href="/admin/testimonials" className="text-sm text-muted hover:text-cyan">← All testimonials</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="max-w-3xl">
        <AdminForm action={saveTestimonial} submit={isNew ? 'Create testimonial' : 'Save changes'}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="updated_at" value={row?.updated_at ?? ''} />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Client name" name="name" defaultValue={row?.client_name} required /><Field label="Role / company" name="role" defaultValue={row?.client_role} /></div>
          <LocalizedInput name="feedback" label="Feedback (in the language the client wrote it)" values={row?.feedback} rows={5} hint="Write the client's own words. It is shown in the language it was written in. Never invent or edit testimonials." />
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Rating (1-5, optional)" name="rating" type="number" defaultValue={row?.rating} /><Field label="Photo path (optional)" name="avatar" defaultValue={row?.avatar} /><Field label="Display order" name="sort" type="number" defaultValue={row?.sort_order ?? 0} /></div>
          <Check name="is_demo" label="Demonstration content (shows a “Demonstration content” label)" defaultChecked={row?.is_demo} />
          <Check name="approved" label="Approved (the client confirmed it may be shown)" defaultChecked={row?.approved} />
          <Check name="published" label="Published (requires approval)" defaultChecked={row?.published} />
        </AdminForm>
        {!isNew && <form action={deleteTestimonial} className="mt-10 border-t pt-6"><input type="hidden" name="id" value={id} /><ConfirmSubmit label="Delete testimonial" message="Delete this testimonial permanently?" /></form>}
      </div>
    </>
  );
}
