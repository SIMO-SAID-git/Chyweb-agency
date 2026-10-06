import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, routing } from '@/i18n/routing';
import Button, { Arrow } from '@/components/Button';
import { ProjectCard } from '@/components/Cards';
import { pageMeta } from '@/lib/seo';
import { projects, services } from '@/content/site';

export const dynamicParams = false;
type Props = { params: { locale: string; slug: string } };
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => services.map((s) => ({ locale, slug: s.slug })));
}
export async function generateMetadata({ params: { locale, slug } }: Props) {
  const s = services.find((x) => x.slug === slug);
  if (!s) return {};
  const t = await getTranslations({ locale, namespace: 'services' });
  return pageMeta(locale, `/services/${slug}`, t(`items.${s.key}.t`), t(`items.${s.key}.d`));
}
export default async function ServicePage({ params: { locale, slug } }: Props) {
  setRequestLocale(locale);
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();
  const t = await getTranslations('services');
  const v = await getTranslations('svc');
  const p = await getTranslations('svcpage');
  const pr = await getTranslations('process');
  const steps = pr.raw('steps') as { t: string; d: string }[];
  const inc = v.raw(`${s.key}.inc`) as string[];
  const related = projects.filter((x) => (s.related as readonly string[]).includes(x.slug));
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: v(`${s.key}.q`), acceptedAnswer: { '@type': 'Answer', text: v(`${s.key}.a`) } }] };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <section className="border-b bg-navy">
        <div className="wrap grid items-center gap-10 py-16 md:grid-cols-2 sm:py-24">
          <div>
            <Link href="/services" className="text-sm text-muted hover:text-cyan"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {p('back')}</Link>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{t(`items.${s.key}.t`)}</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">{v(`${s.key}.lead`)}</p>
            <Button href={`/contact?service=${s.key}`} className="mt-8">{p('cta')} <Arrow /></Button>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border">
            <Image src={s.img} alt={t(`items.${s.key}.alt`)} fill priority sizes="(min-width:768px) 560px, 100vw" className="object-cover" />
          </div>
        </div>
      </section>
      <section className="wrap pt-20">
        <h2 className="h2">{p('included')}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {inc.map((x) => <li key={x} className="rounded-2xl border bg-navy/60 p-6"><span aria-hidden className="mb-4 block h-4 w-1.5 -skew-x-[20deg] bg-cyan" />{x}</li>)}
        </ul>
      </section>
      <section className="wrap pt-20">
        <h2 className="h2">{p('approach')}</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((x, i) => <li key={x.t}><span className="text-sm font-semibold text-cyan" dir="ltr">0{i + 1}</span><h3 className="mt-2 font-semibold">{x.t}</h3><p className="mt-2 text-sm text-muted">{x.d}</p></li>)}
        </ol>
      </section>
      <section className="wrap max-w-3xl pt-20">
        <h2 className="h2">{p('faq')}</h2>
        <details className="group mt-6 border-b py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{v(`${s.key}.q`)}<span aria-hidden className="text-cyan transition group-open:rotate-45">+</span></summary>
          <p className="mt-3 text-muted">{v(`${s.key}.a`)}</p>
        </details>
      </section>
      {related.length > 0 && (
        <section className="wrap pt-20"><h2 className="h2">{p('related')}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">{related.map((x) => <ProjectCard key={x.slug} p={x} />)}</div></section>
      )}
      <section className="wrap pt-20">
        <div className="rounded-2xl border bg-navy p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">{p('cta')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{p('ctaDesc')}</p>
          <Button href={`/contact?service=${s.key}`} className="mt-6">{p('cta')} <Arrow /></Button>
        </div>
      </section>
    </>
  );
}
