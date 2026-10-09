'use server';
// Uploads go browser -> Supabase Storage via a short-lived SIGNED URL created here with the admin's own token, so (a) no token
// reaches the browser, (b) Storage RLS (staff only) + the bucket limits (5 MB, images only) are enforced by Supabase,
// (c) Vercel's request-body limit never applies. Filenames are server-generated (random UUID), never taken from the user.
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminError, enc, sb } from '@/lib/admin/db';
import { loc, uuid, zloc, zmsg } from '@/lib/admin/form';
import { SB_URL, requireStaff, userHeaders } from '@/lib/admin/session';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const MAX = 5 * 1024 * 1024;
const FOLDERS = ['projects', 'services', 'testimonials', 'general'] as const;
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function createUploadUrl(input: { folder: string; mime: string; size: number }): Promise<R<{ path: string; url: string }>> {
  const s = await requireStaff();
  const p = z.object({ folder: z.enum(FOLDERS), mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']), size: z.number().int().min(1).max(MAX) }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Only JPEG, PNG, WebP or AVIF images up to 5 MB are allowed.' };
  const path = `${p.data.folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${EXT[p.data.mime]}`;
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/upload/sign/media/${path}`, { method: 'POST', headers: { ...userHeaders(s.token), 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, error: r.status === 403 || r.status === 401 ? 'You are not allowed to upload files.' : 'The storage service refused the upload request.' };
    const j = await r.json();
    const u = String(j.url);
    return { ok: true, path, url: u.startsWith('http') ? u : `${SB_URL}/storage/v1${u.startsWith('/') ? '' : '/'}${u}` };
  } catch { return { ok: false, error: 'Could not reach the storage service.' }; }
}
export async function registerMedia(input: { path: string; alt: Record<string, string> }): Promise<R<{ path: string }>> {
  const s = await requireStaff();
  const p = z.object({ path: z.string().regex(/^(projects|services|testimonials|general)\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/, 'Invalid file path.'), alt: zloc(200, false, 'Description') }).safeParse(input);
  if (!p.success) return { ok: false, error: zmsg(p.error) };
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/info/media/${p.data.path}`, { headers: userHeaders(s.token), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, error: 'The uploaded file was not found in storage. Try again.' };
    const o = await r.json(); const size = Number(o.size ?? o.metadata?.size); const mime = String(o.metadata?.mimetype ?? '');
    if (!EXT[mime] || !(size > 0 && size <= MAX)) return { ok: false, error: 'The stored file is not an allowed image.' };
    await sb(s, 'media_assets', { method: 'POST', body: { path: p.data.path, alt: Object.keys(p.data.alt).length ? p.data.alt : null, mime_type: mime, size_bytes: size, uploaded_by: s.id } });
    return { ok: true, path: p.data.path };
  } catch (e) { return { ok: false, error: e instanceof AdminError ? e.message : 'Could not register the file.' }; }
}
/** Orphan-safe delete: refuses while ANY project/service/testimonial still references the file. */
export async function deleteMedia(fd: FormData) {
  const s = await requireStaff(); const id = String(fd.get('id'));
  if (!uuid.safeParse(id).success) return redirect('/admin/media');
  let msg = '', ok = false;
  try {
    const row = (await sb(s, `media_assets?select=path&id=eq.${enc(id)}`)).rows[0];
    if (!row) throw new AdminError('notfound', 'That file no longer exists.');
    const path: string = row.path, g = enc(JSON.stringify([{ path }]));
    const used = (await Promise.all([`projects?select=slug&thumbnail=eq.${enc(path)}`, `projects?select=slug&gallery=cs.${g}`, `services?select=slug&image=eq.${enc(path)}`, `testimonials?select=id&avatar=eq.${enc(path)}`].map((q) => sb(s, q)))).flatMap((r) => r.rows);
    if (used.length) throw new AdminError('invalid', `Still in use by ${used.length} item(s). Remove it from them first.`);
    const d = await fetch(`${SB_URL}/storage/v1/object/media/${path}`, { method: 'DELETE', headers: userHeaders(s.token), cache: 'no-store' });
    if (!d.ok && d.status !== 404) throw new AdminError('server', 'Storage refused to delete the file. It was kept.');
    await sb(s, `media_assets?id=eq.${enc(id)}`, { method: 'DELETE' }); ok = true; msg = 'File deleted.';
  } catch (e) { msg = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(`/admin/media?${ok ? 'ok' : 'err'}=${enc(msg)}`);
}
void loc;
