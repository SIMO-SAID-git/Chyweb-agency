import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, PageTitle } from '@/components/admin/ui';
import { enc, sb } from '@/lib/admin/db';
import { SB_URL, requireStaff } from '@/lib/admin/session';
export const metadata = { title: 'Preview' };
type Loc = Record<string, string> | null | undefined;
const LANGS = [['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']] as const;
const show = (v: Loc, l: string) => v?.[l]?.trim() || v?.en?.trim() || '';        // exactly the website's rule: language, else English
const gap = (v: Loc, l: string) => l !== 'en' && !v?.[l]?.trim();                    // true => the website would show English here
const img = (p?: string | null) => (!p ? '' : p.startsWith('/') || p.startsWith('http') ? p : `${SB_URL}/storage/v1/object/public/media/${p}`);

/** Content preview of a service/project INCLUDING drafts, in any language (RTL for Arabic). It shows the content as the website
 *  would resolve it; it is not the public page layout itself. Staff only (drafts are never readable without a staff session). */
export default async function Preview({ params: { kind, id }, searchParams }: { params: { kind: string; id: string }; searchParams: { lang?: string } }) {
  const s = await requireStaff();
  if (!['services', 'projects'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lang = LANGS.some((l) => l[0] === searchParams.lang) ? (searchParams.lang as string) : 'en';
  const row = (await sb(s, `${kind}?id=eq.${enc(id)}`)).rows[0];
  if (!row) notFound();
  const isSvc = kind === 'services';
  const faqs = isSvc ? (await sb(s, `faqs?select=question,answer,published&service_id=eq.${enc(id)}&order=sort_order.asc`)).rows : [];
  const links = (await sb(s, isSvc ? `service_projects?select=projects(title)&service_id=eq.${enc(id)}` : `service_projects?select=services(title)&project_id=eq.${enc(id)}`)).rows.map((r) => (isSvc ? r.projects : r.services)?.title as Loc);
  const fields: [string, Loc][] = isSvc ? [['Title', row.title], ['Short description', row.description], ['Intro', row.lead]] : [['Title', row.title], ['Description', row.description], ['Category', row.category_label]];
  const missing = fields.filter(([, v]) => v && gap(v, lang)).map(([n]) => n);
  const seoT = show(row.seo_title, lang) || show(row.title, lang), seoD = show(row.seo_description, lang) || show(row.description, lang);
  const feats: string[] = isSvc ? ((row.features?.[lang]?.length ? row.features[lang] : row.features?.en) ?? []) : [];
  const imgSrc = img(isSvc ? row.image : row.thumbnail);
  const site = `/${lang}/${isSvc ? 'services' : 'portfolio'}/${row.slug}`;
  return (
    <>
      <PageTitle title={`Preview: ${row.title?.en}`} action={<Link href={`/admin/${kind}/${id}`} className="text-sm text-muted hover:text-cyan">← Back to editor</Link>} />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Badge on={row.published} yes="Published" no="Draft (not public)" />
        <nav aria-label="Language" className="flex gap-2">{LANGS.map(([l, n]) => <Link key={l} href={`/admin/preview/${kind}/${id}?lang=${l}`} aria-current={l === lang ? 'page' : undefined} className={`rounded-full border px-3 py-1 text-xs ${l === lang ? 'border-cyan bg-cyan/10 text-cyan' : 'text-muted'}`}>{n}</Link>)}</nav>
        {row.published ? <a href={site} className="text-cyan" target="_blank" rel="noopener noreferrer">Open on the website ↗</a> : <span className="text-muted">Not on the website until published</span>}
      </div>
      {missing.length > 0 && <p role="note" className="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">No {lang.toUpperCase()} text for: {missing.join(', ')}. The website shows the English text there.</p>}
      <article dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="rounded-2xl border bg-navy/60 p-6 sm:p-10">
        {!isSvc && <p className="eyebrow">{show(row.category_label, lang)}</p>}
        <h2 className="mt-2 text-3xl font-bold">{show(row.title, lang)}</h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">{isSvc ? show(row.lead, lang) || show(row.description, lang) : show(row.description, lang)}</p>
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={show(isSvc ? row.image_alt : row.thumbnail_alt, lang)} className="mt-6 aspect-video w-full max-w-xl rounded-xl border object-cover" />
        )}
        {feats.length > 0 && <ul className="mt-6 grid gap-3 sm:grid-cols-3">{feats.map((f) => <li key={f} className="rounded-xl border p-4 text-sm">{f}</li>)}</ul>}
        {!isSvc && (row.technologies ?? []).length > 0 && <ul className="mt-6 flex flex-wrap gap-2" dir="ltr">{row.technologies.map((t: string) => <li key={t} className="rounded-full border px-3 py-1 text-sm">{t}</li>)}</ul>}
        {!isSvc && row.is_concept && <p role="note" className="mt-6 rounded-lg border border-cyan/30 bg-cyan/5 p-3 text-sm text-muted">Shown with the “concept project” label and notice.</p>}
        {faqs.map((f, i) => <div key={i} className="mt-6 border-t pt-4"><p className="font-semibold">{show(f.question, lang)}{!f.published && <span className="ms-2 text-xs text-amber-300">(FAQ is a draft)</span>}</p><p className="mt-1 text-muted">{show(f.answer, lang)}</p></div>)}
        {links.length > 0 && <p className="mt-6 text-sm text-muted">Related {isSvc ? 'projects' : 'services'}: {links.map((t) => show(t, lang)).join(', ')}</p>}
      </article>
      <section className="mt-6 max-w-xl rounded-xl border p-4" aria-label="Search result preview"><p className="text-xs uppercase tracking-wider text-muted">Search result preview ({lang.toUpperCase()})</p>
        <p className="mt-2 text-lg text-cyan">{seoT}</p><p className="text-sm text-muted">{seoD}</p><p className="mt-2 text-xs text-muted">{seoT.length}/70 title characters · {seoD.length}/200 description characters</p></section>
    </>
  );
}
