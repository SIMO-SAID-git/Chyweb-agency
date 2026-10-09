'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createUploadUrl, registerMedia } from '@/app/admin/media/actions';
import { inputCls } from './forms';
const OK = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export default function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ t: 'ok' | 'err'; s: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const file = f.get('file') as File | null;
    if (!file || !file.size) return setMsg({ t: 'err', s: 'Choose an image first.' });
    if (!OK.includes(file.type)) return setMsg({ t: 'err', s: 'Only JPEG, PNG, WebP or AVIF images are allowed.' });
    if (file.size > 5 * 1024 * 1024) return setMsg({ t: 'err', s: 'The image is larger than 5 MB.' });
    setBusy(true); setMsg(null);
    try {
      const u = await createUploadUrl({ folder: String(f.get('folder')), mime: file.type, size: file.size });
      if (!u.ok) throw new Error(u.error);
      const put = await fetch(u.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(put.status === 413 ? 'The image is too large.' : 'Upload failed. Try again.');
      const alt = Object.fromEntries((['en', 'fr', 'ar'] as const).map((l) => [l, String(f.get(`alt_${l}`) ?? '').trim()]).filter(([, v]) => v));
      const r = await registerMedia({ path: u.path, alt });
      if (!r.ok) throw new Error(r.error);
      setMsg({ t: 'ok', s: `Uploaded. Path: ${r.path}` }); (e.target as HTMLFormElement).reset(); router.refresh();
    } catch (err) { setMsg({ t: 'err', s: (err as Error).message }); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="up-file" className="mb-1 block text-sm font-medium">Image (JPEG, PNG, WebP, AVIF · max 5 MB)</label><input id="up-file" name="file" type="file" accept={OK.join(',')} className={inputCls} /></div>
        <div><label htmlFor="up-folder" className="mb-1 block text-sm font-medium">Folder</label><select id="up-folder" name="folder" className={inputCls}><option value="projects">Projects</option><option value="services">Services</option><option value="testimonials">Testimonials</option><option value="general">General</option></select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{(['en', 'fr', 'ar'] as const).map((l) => <div key={l}><label htmlFor={`alt-${l}`} className="mb-1 block text-xs text-muted">Description ({l.toUpperCase()})</label><input id={`alt-${l}`} name={`alt_${l}`} maxLength={200} dir={l === 'ar' ? 'rtl' : 'ltr'} className={inputCls} /></div>)}</div>
      {msg && <p role={msg.t === 'err' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${msg.t === 'err' ? 'border-red-400/40 bg-red-400/10 text-red-200' : 'border-cyan/40 bg-cyan/10 text-cyan'}`}>{msg.s}</p>}
      <button disabled={busy} className="rounded-full bg-cyan px-5 py-2 text-sm font-semibold text-navy disabled:opacity-60">{busy ? 'Uploading…' : 'Upload'}</button>
    </form>
  );
}
