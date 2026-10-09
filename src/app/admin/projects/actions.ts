'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminError, enc, save, sb, syncLinks } from '@/lib/admin/db';
import { bool, fail, loc, orNull, pathRe, slugRe, str, uuid, zloc, zmsg, type FormState } from '@/lib/admin/form';
import { revalidateContent } from '@/lib/admin/revalidate';
import { requireStaff } from '@/lib/admin/session';

const schema = z.object({
  slug: z.string().regex(slugRe, 'Slug: lowercase letters, numbers and single hyphens only').max(80, 'Slug: at most 80 characters'),
  category: z.string().regex(/^[a-z0-9-]{1,40}$/, 'Category key: lowercase letters, digits and hyphens'),
  category_label: zloc(60, true, 'Category name'), title: zloc(120, true, 'Title'), description: zloc(800, true, 'Description'),
  tech: z.string().max(400, 'Technologies: too long'),
  thumbnail: z.string().regex(pathRe, 'Image: use a media path (e.g. projects/…) or a /images/… file').or(z.literal('')),
  thumbnail_alt: zloc(200, false, 'Image description'), sort: z.coerce.number().int().min(0).max(9999),
});
export async function saveProject(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff();
  const id = str(fd, 'id');
  if (id !== 'new' && !uuid.safeParse(id).success) return { error: 'Invalid record.' };
  const p = schema.safeParse({ slug: str(fd, 'slug'), category: str(fd, 'category'), category_label: loc(fd, 'category_label'), title: loc(fd, 'title'), description: loc(fd, 'description'), tech: str(fd, 'tech'), thumbnail: str(fd, 'thumbnail'), thumbnail_alt: loc(fd, 'thumbnail_alt'), sort: str(fd, 'sort') || '0' });
  if (!p.success) return { error: zmsg(p.error) };
  const d = p.data, origSlug = str(fd, 'orig_slug');
  const tech = Array.from(new Set(d.tech.split(',').map((x) => x.trim()).filter(Boolean)));
  if (tech.length > 12 || tech.some((x) => x.length > 40)) return { error: 'Technologies: at most 12 items, each up to 40 characters.' };
  if (id !== 'new' && origSlug && origSlug !== d.slug && str(fd, 'orig_published') === '1' && !bool(fd, 'confirm_slug'))
    return { error: 'You changed the slug of a published project, so its old URL will stop working (no redirect is created). Tick the confirmation box to continue.' };
  const payload = { slug: d.slug, category: d.category, category_label: d.category_label, title: d.title, description: d.description, technologies: tech, thumbnail: d.thumbnail || null, thumbnail_alt: orNull(d.thumbnail_alt), is_concept: bool(fd, 'is_concept'), sort_order: d.sort, published: bool(fd, 'published') };
  let target = '';
  try {
    const row = await save(s, 'projects', id, payload, str(fd, 'updated_at'));
    await syncLinks(s, 'project_id', row.id, 'service_id', fd.getAll('link').map(String));
    revalidateContent({ projects: [d.slug, origSlug] });
    target = `/admin/projects/${row.id}?ok=Saved`;
  } catch (e) { return fail(e); }
  redirect(target);
}
export async function deleteProject(fd: FormData) {
  const s = await requireStaff(); const id = String(fd.get('id'));
  if (!uuid.safeParse(id).success) return redirect('/admin/projects');
  let err = '';
  try {
    const { rows } = await sb(s, `projects?select=slug,published&id=eq.${enc(id)}`);
    if (!rows.length) throw new AdminError('notfound', 'That project no longer exists.');
    if (rows[0].published) throw new AdminError('invalid', 'Unpublish this project before deleting it.');
    await sb(s, `projects?id=eq.${enc(id)}`, { method: 'DELETE' });
    revalidateContent({ projects: [rows[0].slug] });
  } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(err ? `/admin/projects?err=${enc(err)}` : '/admin/projects?ok=Project+deleted');
}
