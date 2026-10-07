import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, routing } from '@/i18n/routing';
import Button, { Arrow } from '@/components/Button';
import { ProjectCard } from '@/components/Cards';
import { pageMeta } from '@/lib/seo';
import { getProjects, getService, getServices } from '@/lib/content';

// New CMS services are served on demand (and cached); unknown or unpublished slugs return notFound().
type Props = { params: { locale: string; slug: string } };
export async function generateStaticParams() {
  const s = await getServices('en');
  return routing.locales.flatMap((locale) => s.map((x) => ({ locale, slug: x.slug })));
}
export async function generateMetadata({ params: { locale, slug } }: Props) {
  const s = await getService(slug, locale);
  if (!s) notFound();
  return pageMeta(locale, `/services/${slug}`, s.title, s.description);
}
export default async function ServicePage({ params: { locale, slug } }: Props) {
  setRequestLocale(locale);
  const s = await getService(slug, locale);
  if (!s) notFound();
  const p = await getTranslations('svcpage');
  const pr = await getTranslations('process');
  const steps = pr.raw('steps') as { t: string; d: string }[];
  const related = (await getProjects(locale)).filter((x) => s.relatedSlugs.includes(x.slug));
  const contactHref = s.key ? `/contact?service=${s.key}` : '/contact';
  const faq = s.faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: s.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;
  return (
    <>
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <section className="border-b bg-navy">
        <div className="wrap grid items-center gap-10 py-16 md:grid-cols-2 sm:py-24">
          <div>
            <Link href="/services" className="text-sm text-muted hover:text-cyan"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {p('back')}</Link>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{s.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">{s.lead}</p>
            <Button href={contactHref} className="mt-8">{p('cta')} <Arrow /></Button>
          </div>
          {s.image && <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border">
            <Image src={s.image} alt={s.alt} fill priority sizes="(min-width:768px) 560px, 100vw" className="object-cover" />
          </div>}
        </div>
      </section>
      {s.features.length > 0 && <section className="wrap pt-20">
        <h2 className="h2">{p('included')}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {s.features.map((x) => <li key={x} className="rounded-2xl border bg-navy/60 p-6"><span aria-hidden className="mb-4 block h-4 w-1.5 -skew-x-[20deg] bg-cyan" />{x}</li>)}
        </ul>
      </section>}
      <section className="wrap pt-20">
        <h2 className="h2">{p('approach')}</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((x, i) => <li key={x.t}><span className="text-sm font-semibold text-cyan" dir="ltr">0{i + 1}</span><h3 className="mt-2 font-semibold">{x.t}</h3><p className="mt-2 text-sm text-muted">{x.d}</p></li>)}
        </ol>
      </section>
      {s.faqs.length > 0 && <section className="wrap max-w-3xl pt-20">
        <h2 className="h2">{p('faq')}</h2>
        {s.faqs.map((f) => (
          <details key={f.q} className="group mt-6 border-b py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{f.q}<span aria-hidden className="text-cyan transition group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-muted">{f.a}</p>
          </details>
        ))}
      </section>}
      {related.length > 0 && (
        <section className="wrap pt-20"><h2 className="h2">{p('related')}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">{related.map((x) => <ProjectCard key={x.slug} p={x} />)}</div></section>
      )}
      <section className="wrap pt-20">
        <div className="rounded-2xl border bg-navy p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{p('cta')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{p('ctaDesc')}</p>
          <Button href={contactHref} className="mt-6">{p('cta')} <Arrow /></Button>
        </div>
      </section>
    </>
  );
}
