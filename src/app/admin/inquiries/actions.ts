'use server';
// Inquiries are ADMIN-ONLY: requireAdmin() here, and Postgres RLS ("admin manage" policy + column grants) behind it.
import { redirect } from 'next/navigation';
import { AdminError, enc, sb } from '@/lib/admin/db';
import { uuid } from '@/lib/admin/form';
import { STATUSES } from '@/lib/admin/inquiry';
import { requireAdmin } from '@/lib/admin/session';

const to = (id: string, kind: 'ok' | 'err', m: string) => redirect(`/admin/inquiries/${id}?${kind}=${enc(m)}`);
export async function setInquiryStatus(fd: FormData) {
  const s = await requireAdmin(); const id = String(fd.get('id')); const status = String(fd.get('status'));
  if (!uuid.safeParse(id).success || !STATUSES.some((x) => x[0] === status)) return redirect('/admin/inquiries');
  let err = '';
  try { const { rows } = await sb(s, `inquiries?id=eq.${enc(id)}`, { method: 'PATCH', body: { status } }); if (!rows.length) throw new AdminError('notfound', 'Inquiry not found.'); }
  catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  to(id, err ? 'err' : 'ok', err || 'Status updated.');
}
export async function setInquiryRead(fd: FormData) {
  const s = await requireAdmin(); const id = String(fd.get('id')); const read = fd.get('value') === '1';
  if (!uuid.safeParse(id).success) return redirect('/admin/inquiries');
  let err = '';
  try { await sb(s, `inquiries?id=eq.${enc(id)}`, { method: 'PATCH', body: { read_at: read ? new Date().toISOString() : null } }); } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  if (!read && !err) return redirect('/admin/inquiries?ok=Marked+as+unread');
  to(id, err ? 'err' : 'ok', err || 'Marked as read.');
}
export async function addNote(fd: FormData) {
  const s = await requireAdmin(); const id = String(fd.get('id')); const note = String(fd.get('note') ?? '').trim();
  if (!uuid.safeParse(id).success) return redirect('/admin/inquiries');
  if (!note || note.length > 4000) return to(id, 'err', 'Write a note (up to 4000 characters).');
  let err = '';
  try { await sb(s, 'inquiry_notes', { method: 'POST', body: { inquiry_id: id, author_id: s.id, note } }); } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  to(id, err ? 'err' : 'ok', err || 'Private note added.');
}
export async function deleteInquiry(fd: FormData) {
  const s = await requireAdmin(); const id = String(fd.get('id'));
  if (!uuid.safeParse(id).success) return redirect('/admin/inquiries');
  let err = '';
  try { await sb(s, `inquiries?id=eq.${enc(id)}`, { method: 'DELETE' }); } catch (e) { err = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  if (err) return to(id, 'err', err);
  redirect('/admin/inquiries?ok=Inquiry+deleted');
}
