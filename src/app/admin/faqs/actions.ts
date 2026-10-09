'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminError, enc, save, sb } from '@/lib/admin/db';
import { bool, fail, loc, str, uuid, zloc, zmsg, type FormState } from '@/lib/admin/form';
import { revalidateContent } from '@/lib/admin/revalidate';
import { requireStaff } from '@/lib/admin/session';

const schema = z.object({ service: z.string().uuid().or(z.literal('')), question: zloc(300, true, 'Question'), answer: zloc(2000, true, 'Answer'), sort: z.coerce.number().int().min(0).max(9999) });
export async function saveFaq(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff(); const id = str(fd, 'id');
  if (id !== 'new' && !uuid.safeParse(id).success) return { error: 'Invalid record.' };
  const p = schema.safeParse({ service: str(fd, 'service'), question: loc(fd, 'question'), answer: loc(fd, 'answer'), sort: str(fd, 'sort') || '0' });
  if (!p.success) return { error: zmsg(p.error) };
  let target = '';
  try {
    const row = await save(s, 'faqs', id, { service_id: p.data.service || null, question: p.data.question, answer: p.data.answer, sort_order: p.data.sort, published: bool(fd, 'published') }, str(fd, 'updated_at'));
    revalidateContent(); target = `/admin/faqs/${row.id}?ok=Saved`;
  } catch (e) { return fail(e); }
  redirect(target);
}
export async function deleteFaq(fd: FormData) {
  const s = await requireStaff(); const id = String(fd.get('id'));
  if (!uuid.safeParse(id).success) return redirect('/admin/faqs');
  let err = '';
  try { await sb(s, `faqs?id=eq.${enc(id)}`, { method: 'DELETE' }); revalidateContent(); } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(err ? `/admin/faqs?err=${enc(err)}` : '/admin/faqs?ok=FAQ+deleted');
}
