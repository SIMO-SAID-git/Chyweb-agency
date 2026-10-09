'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminError, enc, save, sb } from '@/lib/admin/db';
import { bool, fail, loc, pathRe, str, uuid, zloc, zmsg, type FormState } from '@/lib/admin/form';
import { revalidateContent } from '@/lib/admin/revalidate';
import { requireStaff } from '@/lib/admin/session';

const schema = z.object({
  name: z.string().min(1, 'Client name is required').max(120, 'Client name: at most 120 characters'), role: z.string().max(120, 'Role: at most 120 characters'),
  feedback: zloc(1500, false, 'Feedback').refine((o) => Object.keys(o).length > 0, 'Feedback: write the testimonial in at least one language'),
  rating: z.string().regex(/^[1-5]?$/, 'Rating must be 1 to 5'), avatar: z.string().regex(pathRe, 'Photo: use a media path').or(z.literal('')), sort: z.coerce.number().int().min(0).max(9999),
});
export async function saveTestimonial(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff(); const id = str(fd, 'id');
  if (id !== 'new' && !uuid.safeParse(id).success) return { error: 'Invalid record.' };
  const p = schema.safeParse({ name: str(fd, 'name'), role: str(fd, 'role'), feedback: loc(fd, 'feedback'), rating: str(fd, 'rating'), avatar: str(fd, 'avatar'), sort: str(fd, 'sort') || '0' });
  if (!p.success) return { error: zmsg(p.error) };
  const approved = bool(fd, 'approved'), published = bool(fd, 'published');
  if (published && !approved) return { error: 'A testimonial must be approved before it can be published.' };
  const d = p.data; let target = '';
  try {
    const row = await save(s, 'testimonials', id, { client_name: d.name, client_role: d.role || null, feedback: d.feedback, rating: d.rating ? Number(d.rating) : null, avatar: d.avatar || null, is_demo: bool(fd, 'is_demo'), approved, published, sort_order: d.sort }, str(fd, 'updated_at'));
    revalidateContent(); target = `/admin/testimonials/${row.id}?ok=Saved`;
  } catch (e) { return fail(e); }
  redirect(target);
}
export async function setApproved(fd: FormData) {
  const s = await requireStaff(); const id = String(fd.get('id')); const value = fd.get('value') === '1';
  if (!uuid.safeParse(id).success) return redirect('/admin/testimonials');
  let err = '';
  try { await sb(s, `testimonials?id=eq.${enc(id)}`, { method: 'PATCH', body: value ? { approved: true } : { approved: false, published: false } }); revalidateContent(); } // un-approving also hides it
  catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(err ? `/admin/testimonials?err=${enc(err)}` : `/admin/testimonials?ok=${value ? 'Approved' : 'Approval+removed+and+testimonial+hidden'}`);
}
export async function deleteTestimonial(fd: FormData) {
  const s = await requireStaff(); const id = String(fd.get('id'));
  if (!uuid.safeParse(id).success) return redirect('/admin/testimonials');
  let err = '';
  try { await sb(s, `testimonials?id=eq.${enc(id)}`, { method: 'DELETE' }); revalidateContent(); } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(err ? `/admin/testimonials?err=${enc(err)}` : '/admin/testimonials?ok=Testimonial+deleted');
}
