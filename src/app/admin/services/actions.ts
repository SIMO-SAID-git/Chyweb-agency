'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminError, enc, save, sb, syncLinks } from '@/lib/admin/db';
import { bool, fail, loc, locLines, orNull, pathRe, slugRe, str, uuid, zlines, zloc, zmsg, type FormState } from '@/lib/admin/form';
import { revalidateContent } from '@/lib/admin/revalidate';
import { requireStaff } from '@/lib/admin/session';

const schema = z.object({
  key: z.string().regex(/^[a-z0-9_-]{1,40}$/, 'Key: lowercase letters, digits, - or _ (max 40)').or(z.literal('')),
  slug: z.string().regex(slugRe, 'Slug: lowercase letters, numbers and single hyphens only').max(80, 'Slug: at most 80 characters'),
  title: zloc(120, true, 'Title'), description: zloc(400, true, 'Short description'), lead: zloc(1200, false, 'Intro'),
  features: zlines('Included features'), image_alt: zloc(200, false, 'Image description'),
  image: z.string().regex(pathRe, 'Image: use a media path (e.g. services/…) or a /images/… file').or(z.literal('')),
  sort: z.coerce.number().int().min(0).max(9999),
});
export async function saveService(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff();
  const id = str(fd, 'id');
  if (id !== 'new' && !uuid.safeParse(id).success) return { error: 'Invalid record.' };
  const p = schema.safeParse({ key: str(fd, 'key'), slug: str(fd, 'slug'), title: loc(fd, 'title'), description: loc(fd, 'description'), lead: loc(fd, 'lead'), features: locLines(fd, 'features'), image_alt: loc(fd, 'image_alt'), image: str(fd, 'image'), sort: str(fd, 'sort') || '0' });
  if (!p.success) return { error: zmsg(p.error) };
  const d = p.data, origSlug = str(fd, 'orig_slug');
  if (id !== 'new' && origSlug && origSlug !== d.slug && str(fd, 'orig_published') === '1' && !bool(fd, 'confirm_slug'))
    return { error: 'You changed the slug of a published service, so its old URL will stop working (no redirect is created). Tick the confirmation box to continue.' };
  const payload = { slug: d.slug, title: d.title, description: d.description, lead: orNull(d.lead), features: orNull(d.features), image: d.image || null, image_alt: orNull(d.image_alt), sort_order: d.sort, published: bool(fd, 'published'), ...(id === 'new' && d.key ? { key: d.key } : {}) };
  let target = '';
  try {
    const row = await save(s, 'services', id, payload, str(fd, 'updated_at'));
    await syncLinks(s, 'service_id', row.id, 'project_id', fd.getAll('link').map(String));
    revalidateContent({ services: [d.slug, origSlug] });
    target = `/admin/services/${row.id}?ok=Saved`;
  } catch (e) { return fail(e); }
  redirect(target);
}
export async function deleteService(fd: FormData) {
  const s = await requireStaff(); const id = String(fd.get('id'));
  if (!uuid.safeParse(id).success) return redirect('/admin/services');
  let err = '';
  try {
    const { rows } = await sb(s, `services?select=slug,published&id=eq.${enc(id)}`);
    if (!rows.length) throw new AdminError('notfound', 'That service no longer exists.');
    if (rows[0].published) throw new AdminError('invalid', 'Unpublish this service before deleting it.');
    await sb(s, `services?id=eq.${enc(id)}`, { method: 'DELETE' });
    revalidateContent({ services: [rows[0].slug] });
  } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(err ? `/admin/services?err=${enc(err)}` : '/admin/services?ok=Service+deleted');
}
