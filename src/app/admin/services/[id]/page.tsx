import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm, ConfirmSubmit, LocalizedInput } from '@/components/admin/forms';
import { Check, Field, Flash, LinkBoxes, PageTitle } from '@/components/admin/ui';
import { enc, sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
import { deleteService, saveService } from '../actions';
export const metadata = { title: 'Edit service' };
export default async function EditService({ params: { id }, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const isNew = id === 'new';
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row, projects, links, media] = await Promise.all([
    isNew ? null : sb(s, `services?id=eq.${enc(id)}`).then((r) => r.rows[0]),
    sb(s, 'projects?select=id,title&order=sort_order.asc').then((r) => r.rows),
    isNew ? [] : sb(s, `service_projects?select=project_id&service_id=eq.${enc(id)}`).then((r) => r.rows.map((x) => x.project_id as string)),
    sb(s, 'media_assets?select=path&order=created_at.desc&limit=100').then((r) => r.rows),
  ]);
  if (!isNew && !row) notFound();
  const features = Object.fromEntries(Object.entries((row?.features ?? {}) as Record<string, string[]>).map(([l, v]) => [l, v.join('\n')]));
  return (
    <>
      <PageTitle title={isNew ? 'New service' : `Edit: ${row?.title?.en}`} action={<Link href="/admin/services" className="text-sm text-muted hover:text-cyan">← All services</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="max-w-3xl">
        <AdminForm action={saveService} submit={isNew ? 'Create service' : 'Save changes'}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="updated_at" value={row?.updated_at ?? ''} />
          <input type="hidden" name="orig_slug" value={row?.slug ?? ''} /><input type="hidden" name="orig_published" value={row?.published ? '1' : '0'} />
          <LocalizedInput name="title" label="Title" values={row?.title} required />
          <LocalizedInput name="description" label="Short description (service cards)" values={row?.description} rows={3} required />
          <LocalizedInput name="lead" label="Intro (service page)" values={row?.lead ?? {}} rows={4} hint="Falls back to the short description if empty." />
          <LocalizedInput name="features" label="What's included (one item per line)" values={features} rows={5} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug (URL)" name="slug" defaultValue={row?.slug} required hint="Lowercase letters, numbers, hyphens. Changing the slug of a published service breaks its old URL." />
            <Field label="Key (contact-form value)" name="key" defaultValue={row?.key} readOnly={!isNew} hint={isNew ? 'Optional. Cannot be changed after creation.' : 'Fixed after creation.'} />
            <Field label="Image path" name="image" defaultValue={row?.image} list="media-paths" hint="Upload in Media, then paste its path, or use an existing /images/… file." />
            <Field label="Display order" name="sort" type="number" defaultValue={row?.sort_order ?? 0} hint="Lower numbers appear first." />
          </div>
          <datalist id="media-paths">{media.map((m) => <option key={m.path} value={m.path} />)}</datalist>
          <LocalizedInput name="image_alt" label="Image description (accessibility)" values={row?.image_alt ?? {}} />
          <fieldset className="rounded-xl border p-4"><legend className="px-2 text-sm font-medium">Related projects</legend><LinkBoxes items={projects.map((p) => ({ id: p.id, label: p.title?.en }))} selected={links} /></fieldset>
          {!isNew && row?.published && <Check name="confirm_slug" label="I understand that changing the slug breaks the old URL" />}
          <Check name="published" label="Published (visible on the public website)" defaultChecked={row?.published} />
        </AdminForm>
        {!isNew && <form action={deleteService} className="mt-10 border-t pt-6"><input type="hidden" name="id" value={id} /><p className="mb-3 text-sm text-muted">Deleting also removes this service&apos;s FAQs and project links. A service must be unpublished first.</p><ConfirmSubmit label="Delete service" message="Delete this service permanently?" /></form>}
      </div>
    </>
  );
}
