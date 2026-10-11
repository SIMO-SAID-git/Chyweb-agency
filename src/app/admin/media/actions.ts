'use server';
// Uploads go browser -> Supabase Storage via a short-lived SIGNED URL created here with the admin's own token, so (a) no token
// reaches the browser, (b) Storage RLS (staff only) + the bucket limits (5 MB, images only) are enforced by Supabase,
// (c) Vercel's request-body limit never applies. Filenames are server-generated (random UUID), never taken from the user.
// Because the browser uploads directly, the server VERIFIES the stored object afterwards (size, type AND real file signature)
// and deletes anything invalid, so a spoofed Content-Type or a failed registration cannot leave junk in the bucket.
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminError, enc, sb } from '@/lib/admin/db';
import { uuid, zloc, zmsg } from '@/lib/admin/form';
import { SB_URL, requireStaff, userHeaders } from '@/lib/admin/session';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
const MAX = 5 * 1024 * 1024;
const FOLDERS = ['projects', 'services', 'testimonials', 'general'] as const;
const PATH_RE = /^(projects|services|testimonials|general)\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// Real file signatures ("magic bytes"): a file must look like what it claims to be.
function matchesSignature(mime: string, b: Uint8Array): boolean {
  const at = (o: number, s: string) => s.split('').every((c, i) => b[o + i] === c.charCodeAt(0));
  if (mime === 'image/png') return b[0] === 0x89 && at(1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
  if (mime === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === 'image/webp') return at(0, 'RIFF') && at(8, 'WEBP');
  if (mime === 'image/avif') return at(4, 'ftyp') && (at(8, 'avif') || at(8, 'avis'));
  return false;
}
const objUrl = (p: string) => `${SB_URL}/storage/v1/object/media/${p}`;
async function removeObject(token: string, path: string): Promise<boolean> {
  try { const r = await fetch(objUrl(path), { method: 'DELETE', headers: userHeaders(token), cache: 'no-store', signal: AbortSignal.timeout(10000) }); return r.ok || r.status === 404; } catch { return false; }
}
async function objectExists(token: string, path: string): Promise<boolean | null> {
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/info/media/${path}`, { headers: userHeaders(token), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (r.ok) return true;
    const j = await r.json().catch(() => ({}));
    return r.status === 404 || String(j?.statusCode) === '404' || /not.?found/i.test(String(j?.error ?? j?.message ?? '')) ? false : null; // null = could not tell
  } catch { return null; }
}

export async function createUploadUrl(input: { folder: string; mime: string; size: number }): Promise<R<{ path: string; url: string }>> {
  const s = await requireStaff();
  const p = z.object({ folder: z.enum(FOLDERS), mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']), size: z.number().int().min(1).max(MAX) }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Only JPEG, PNG, WebP or AVIF images up to 5 MB are allowed.' };
  const path = `${p.data.folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${EXT[p.data.mime]}`;
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/upload/sign/media/${path}`, { method: 'POST', headers: { ...userHeaders(s.token), 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, error: r.status === 403 || r.status === 401 ? 'You are not allowed to upload files.' : 'The storage service refused the upload request.' };
    const j = await r.json(); const u = String(j.url);
    return { ok: true, path, url: u.startsWith('http') ? u : `${SB_URL}/storage/v1${u.startsWith('/') ? '' : '/'}${u}` };
  } catch { return { ok: false, error: 'Could not reach the storage service.' }; }
}
export async function registerMedia(input: { path: string; alt: Record<string, string> }): Promise<R<{ path: string }>> {
  const s = await requireStaff();
  const p = z.object({ path: z.string().regex(PATH_RE, 'Invalid file path.'), alt: zloc(200, false, 'Description') }).safeParse(input);
  if (!p.success) return { ok: false, error: zmsg(p.error) };
  const path = p.data.path;
  const reject = async (why: string): Promise<R<{ path: string }>> => ({ ok: false, error: `${why} ${(await removeObject(s.token, path)) ? 'The file was removed.' : 'The file could not be removed automatically: delete it in the Supabase Storage page.'}` });
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/info/media/${path}`, { headers: userHeaders(s.token), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, error: 'The uploaded file was not found in storage. Try again.' };
    const o = await r.json(); const size = Number(o.size ?? o.metadata?.size); const mime = String(o.metadata?.mimetype ?? '');
    if (!EXT[mime] || !(size > 0 && size <= MAX) || PATH_RE.exec(path)?.[2] !== EXT[mime]) return reject('The stored file is not an allowed image.');
    const head = await fetch(`${SB_URL}/storage/v1/object/public/media/${path}`, { headers: { Range: 'bytes=0-31' }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const bytes = new Uint8Array((await head.arrayBuffer()).slice(0, 32));
    if (!head.ok || !matchesSignature(mime, bytes)) return reject('The file content does not match an image of the declared type.');
    try { await sb(s, 'media_assets', { method: 'POST', body: { path, alt: Object.keys(p.data.alt).length ? p.data.alt : null, mime_type: mime, size_bytes: size, uploaded_by: s.id } }); }
    catch (e) { return reject(e instanceof AdminError ? e.message : 'Could not register the file.'); }
    return { ok: true, path };
  } catch { return { ok: false, error: 'Could not register the file.' }; }
}
/** Called by the browser when an upload fails half-way: removes the unregistered object. Never touches a registered asset. */
export async function discardUpload(input: { path: string }): Promise<R> {
  const s = await requireStaff();
  if (!PATH_RE.test(String(input?.path))) return { ok: false, error: 'Invalid file path.' };
  try {
    const reg = await sb(s, `media_assets?select=id&path=eq.${enc(input.path)}`);
    if (reg.rows.length) return { ok: false, error: 'That file is registered in the media library; delete it there.' };
    return (await removeObject(s.token, input.path)) ? { ok: true } : { ok: false, error: 'Could not remove the partial upload.' };
  } catch { return { ok: false, error: 'Could not remove the partial upload.' }; }
}
/** Orphan-safe delete: refuses while ANY project/service/testimonial still references the file, and only removes the database
 *  entry after Storage confirms the object is really gone. */
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
    if (!(await removeObject(s.token, path))) throw new AdminError('server', 'Storage refused to delete the file. It was kept.');
    if ((await objectExists(s.token, path)) !== false) throw new AdminError('server', 'Storage did not confirm that the file is gone, so the library entry was kept. Check the Supabase Storage page.');
    await sb(s, `media_assets?id=eq.${enc(id)}`, { method: 'DELETE' }); ok = true; msg = 'File deleted.';
  } catch (e) { msg = e instanceof AdminError ? e.message : 'Unexpected error.'; }
  redirect(`/admin/media?${ok ? 'ok' : 'err'}=${enc(msg)}`);
}
