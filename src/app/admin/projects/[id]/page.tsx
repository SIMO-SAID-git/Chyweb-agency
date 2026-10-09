import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminForm, ConfirmSubmit, LocalizedInput } from '@/components/admin/forms';
import { Check, Field, Flash, LinkBoxes, PageTitle } from '@/components/admin/ui';
import { enc, sb } from '@/lib/admin/db';
import { requireStaff } from '@/lib/admin/session';
import { deleteProject, saveProject } from '../actions';
export const metadata = { title: 'Edit project' };
export default async function EditProject({ params: { id }, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const isNew = id === 'new';
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row, services, links, media] = await Promise.all([
    isNew ? null : sb(s, `projects?id=eq.${enc(id)}`).then((r) => r.rows[0]),
    sb(s, 'services?select=id,title&order=sort_order.asc').then((r) => r.rows),
    isNew ? [] : sb(s, `service_projects?select=service_id&project_id=eq.${enc(id)}`).then((r) => r.rows.map((x) => x.service_id as string)),
    sb(s, 'media_assets?select=path&order=created_at.desc&limit=100').then((r) => r.rows),
  ]);
  if (!isNew && !row) notFound();
  return (
    <>
      <PageTitle title={isNew ? 'New project' : `Edit: ${row?.title?.en}`} action={<Link href="/admin/projects" className="text-sm text-muted hover:text-cyan">← All projects</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="max-w-3xl">
        <AdminForm action={saveProject} submit={isNew ? 'Create project' : 'Save changes'}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="updated_at" value={row?.updated_at ?? ''} />
          <input type="hidden" name="orig_slug" value={row?.slug ?? ''} /><input type="hidden" name="orig_published" value={row?.published ? '1' : '0'} />
          <LocalizedInput name="title" label="Title" values={row?.title} required />
          <LocalizedInput name="description" label="Description" values={row?.description} rows={4} required />
          <LocalizedInput name="category_label" label="Category name (portfolio filter)" values={row?.category_label} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug (URL)" name="slug" defaultValue={row?.slug} required hint="Lowercase letters, numbers, hyphens. Changing the slug of a published project breaks its old URL." />
            <Field label="Category key" name="category" defaultValue={row?.category} required hint="Projects with the same key are grouped under one filter button, e.g. ecom." />
            <Field label="Technologies" name="tech" defaultValue={(row?.technologies ?? []).join(', ')} hint="Comma separated, e.g. Next.js, Tailwind CSS" />
            <Field label="Display order" name="sort" type="number" defaultValue={row?.sort_order ?? 0} hint="Lower numbers appear first." />
            <Field label="Thumbnail path" name="thumbnail" defaultValue={row?.thumbnail} list="media-paths" hint="Upload in Media, then paste its path, or use an existing /images/… file." />
          </div>
          <datalist id="media-paths">{media.map((m) => <option key={m.path} value={m.path} />)}</datalist>
          <LocalizedInput name="thumbnail_alt" label="Image description (accessibility)" values={row?.thumbnail_alt ?? {}} />
          <fieldset className="rounded-xl border p-4"><legend className="px-2 text-sm font-medium">Related services</legend><LinkBoxes items={services.map((x) => ({ id: x.id, label: x.title?.en }))} selected={links} /></fieldset>
          <Check name="is_concept" label="Concept project (shows the “Concept project” label and notice)" defaultChecked={isNew ? true : row?.is_concept} hint="Untick ONLY for real, delivered client work you may show publicly." />
          {!isNew && row?.published && <Check name="confirm_slug" label="I understand that changing the slug breaks the old URL" />}
          <Check name="published" label="Published (visible on the public website)" defaultChecked={row?.published} />
        </AdminForm>
        {!isNew && <form action={deleteProject} className="mt-10 border-t pt-6"><input type="hidden" name="id" value={id} /><p className="mb-3 text-sm text-muted">A project must be unpublished before it can be deleted.</p><ConfirmSubmit label="Delete project" message="Delete this project permanently?" /></form>}
      </div>
    </>
  );
}
