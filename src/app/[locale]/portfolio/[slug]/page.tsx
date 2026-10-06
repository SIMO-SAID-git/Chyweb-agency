import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, Link } from '@/i18n/routing';
import Button, { Arrow } from '@/components/Button';
import { ProjectCard } from '@/components/Cards';
import { projects } from '@/content/site';

export const dynamicParams = false;
type Props = { params: { locale: string; slug: string } };
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}
export async function generateMetadata({ params: { locale, slug } }: Props) {
  const p = projects.find((x) => x.slug === slug);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: 'portfolio' });
  return { title: t(`items.${p.key}.t`), description: t(`items.${p.key}.d`) };
}
export default async function Project({ params: { locale, slug } }: Props) {
  setRequestLocale(locale);
  const p = projects.find((x) => x.slug === slug);
  if (!p) notFound();
  const t = await getTranslations('portfolio');
  const c = await getTranslations('cta');
  return (
    <article className="wrap pt-12">
      <Link href="/portfolio" className="text-sm text-muted hover:text-cyan"><span aria-hidden className="inline-block rtl:rotate-180">←</span> {t('back')}</Link>
      <p className="eyebrow mt-8">{t(`items.${p.key}.c`)}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{t(`items.${p.key}.t`)}</h1>
      <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl border">
        <Image src={p.img} alt={t(`items.${p.key}.alt`)} fill priority sizes="(min-width:1216px) 1216px, 100vw" className="object-cover" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="text-lg leading-relaxed text-muted">{t(`items.${p.key}.d`)}</p>
          <p className="mt-6 rounded-xl border border-cyan/30 bg-cyan/5 p-4 text-sm text-muted" role="note">{t('notice')}</p>
        </div>
        <div>
          <h2 className="eyebrow">{t('tech')}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">{p.tech.map((x) => <li key={x} dir="ltr" className="rounded-full border px-3 py-1 text-sm">{x}</li>)}</ul>
        </div>
      </div>
      <section className="mt-16"><h2 className="text-2xl font-bold">{t('related')}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">{projects.filter((x) => x.slug !== p.slug).slice(0, 2).map((x) => <ProjectCard key={x.slug} p={x} />)}</div></section>
      <div className="mt-16 rounded-2xl border bg-navy p-8 text-center">
        <h2 className="text-2xl font-bold">{c('title')}</h2>
        <Button href="/contact" className="mt-6">{c('btn')} <Arrow /></Button>
      </div>
    </article>
  );
}
