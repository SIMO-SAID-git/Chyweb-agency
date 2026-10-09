'use server';
// Shared admin actions. Every action starts with requireStaff()/requireAdmin(): authorization is re-checked on the server each time.
import { redirect } from 'next/navigation';
import { AdminError, enc, sb } from '@/lib/admin/db';
import { uuid } from '@/lib/admin/form';
import { revalidateContent } from '@/lib/admin/revalidate';
import { requireStaff } from '@/lib/admin/session';

const TABLES = ['services', 'projects', 'faqs', 'testimonials'] as const;
const back = (t: string, kind: 'ok' | 'err', msg: string) => redirect(`/admin/${t}?${kind}=${enc(msg)}`);

export async function setPublished(fd: FormData) {
  const s = await requireStaff();
  const table = String(fd.get('table')); const id = String(fd.get('id')); const value = fd.get('value') === '1';
  if (!(TABLES as readonly string[]).includes(table) || !uuid.safeParse(id).success) return redirect('/admin');
  let err = '';
  try {
    const { rows } = await sb(s, `${table}?id=eq.${enc(id)}`, { method: 'PATCH', body: { published: value } });
    if (!rows.length) throw new AdminError('notfound', 'That record no longer exists.');
    revalidateContent({ services: [rows[0].slug], projects: [rows[0].slug] });
  } catch (e) { err = e instanceof AdminError ? (table === 'testimonials' && e.kind === 'invalid' ? 'Approve the testimonial before publishing it.' : e.message) : 'Unexpected error.'; }
  if (err) back(table, 'err', err);
  back(table, 'ok', value ? 'Published. The public website is updated.' : 'Unpublished. It is no longer visible on the public website.');
}
