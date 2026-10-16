import { ConfirmSubmit } from '@/components/admin/forms';
import MediaUploader from '@/components/admin/MediaUploader';
import { Empty, Flash, PageTitle } from '@/components/admin/ui';
import { sb } from '@/lib/admin/db';
import { SB_URL, requireStaff } from '@/lib/admin/session';
import { deleteMedia } from './actions';
export const metadata = { title: 'Media' };
export default async function Media({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const s = await requireStaff();
  const { rows } = await sb(s, 'media_assets?select=id,path,alt,size_bytes,mime_type,created_at&order=created_at.desc&limit=100');
  return (
    <>
      <PageTitle title="Media" />
      <p className="mb-6 text-sm text-muted">Upload an image, then paste its <b>path</b> into a project or service. A file can only be deleted when nothing uses it. Replacing an image = upload the new one, point the item at it, then delete the old one.</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <MediaUploader />
      <h2 className="mb-3 mt-10 font-semibold">Uploaded files</h2>
      {rows.length === 0 ? <Empty>No uploads yet. Existing site images in /images are not listed here.</Empty> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => <li key={r.id} className="overflow-hidden rounded-xl border"><div className="aspect-video bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${SB_URL}/storage/v1/object/public/media/${r.path}`} alt={r.alt?.en ?? ''} className="h-full w-full object-cover" /></div>
          <div className="space-y-2 p-3 text-xs"><p className="break-all font-mono text-muted" dir="ltr">{r.path}</p><p className="text-muted">{Math.round(r.size_bytes / 1024)} KB · {r.mime_type}</p>
            <form action={deleteMedia}><input type="hidden" name="id" value={r.id} /><ConfirmSubmit label="Delete" message="Delete this file? This only works if nothing uses it." /></form></div></li>)}</ul>}
    </>
  );
}
