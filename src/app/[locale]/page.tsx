import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Button, { Arrow } from '@/components/Button';
import { ProjectCard, ServiceCard } from '@/components/Cards';
import Testimonials from '@/components/Testimonials';
import { pageMeta } from '@/lib/seo';
import { getProjects, getServices } from '@/lib/content';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { ...pageMeta(locale, '', t('title'), t('desc')), title: { absolute: t('title') } };
}
const whyKeys = ['custom', 'responsive', 'clear', 'support'] as const;

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('hero');
  const trust = (await getTranslations('trust')).raw('items') as string[];
  const s = await getTranslations('services');
  const p = await getTranslations('portfolio');
  const pr = await getTranslations('process');
  const c = await getTranslations('cta');
  const w = await getTranslations('why');
  const e = await getTranslations('content');
  const [services, projects] = await Promise.all([getServices(locale), getProjects(locale)]);
  const steps = pr.raw('steps') as { t: string; d: string }[];
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Image src="/images/hero.jpg" alt="" fill priority quality={80} sizes="100vw" className="-z-20 object-cover object-right rtl:-scale-x-100" />
        <div className="absolute inset-0 -z-10 bg-bg/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-bg sm:from-30% sm:via-bg/70 sm:via-45% sm:to-transparent sm:rtl:bg-gradient-to-l" />
        <div className="wrap flex min-h-[calc(100svh-4rem)] items-center py-20">
          <div className="max-w-xl">
            <p className="eyebrow">{t('badge')}</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{t('title')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">{t('desc')}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/contact">{t('cta')} <Arrow /></Button>
              <Button href="/portfolio" variant="ghost">{t('cta2')}</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-navy">
        <ul className="wrap grid gap-4 py-6 text-sm text-muted sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((x) => <li key={x} className="flex items-center gap-3"><span aria-hidden className="h-3 w-1 -skew-x-[20deg] bg-cyan" />{x}</li>)}
        </ul>
      </section>

      <section className="wrap pt-24">
        <p className="eyebrow">{s('eyebrow')}</p>
        <h2 className="h2 mt-3 max-w-2xl">{s('title')}</h2>
        <p className="mt-4 max-w-xl text-muted">{s('desc')}</p>
        {services.length === 0 && <p className="mt-12 rounded-2xl border border-dashed p-8 text-muted" role="note">{e('empty')}</p>}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{services.map((x) => <ServiceCard key={x.slug} s={x} />)}</div>
      </section>

      <section className="wrap pt-24">
        <p className="eyebrow">{w('eyebrow')}</p>
        <h2 className="h2 mt-3 max-w-2xl">{w('title')}</h2>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-white/10 sm:grid-cols-2">
          {whyKeys.map((k, i) => (
            <li key={k} className="bg-bg p-8">
              <span className="flex items-center gap-3 text-sm font-semibold text-cyan" dir="ltr"><span aria-hidden className="h-4 w-1.5 -skew-x-[20deg] bg-cyan" />0{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold">{w(`items.${k}.t`)}</h3>
              <p className="mt-2 text-muted">{w(`items.${k}.d`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap pt-24">
        <p className="eyebrow">{p('eyebrow')}</p>
        <h2 className="h2 mt-3">{p('title')}</h2>
        <p className="mt-4 max-w-2xl text-muted">{p('intro')}</p>
        {projects.length === 0 && <p className="mt-12 rounded-2xl border border-dashed p-8 text-muted" role="note">{e('empty')}</p>}
        <div className="mt-12 grid gap-6 md:grid-cols-2">{projects.map((x) => <ProjectCard key={x.slug} p={x} />)}</div>
      </section>

      <section className="wrap pt-24">
        <p className="eyebrow">{pr('eyebrow')}</p>
        <h2 className="h2 mt-3">{pr('title')}</h2>
        <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl border">
          <Image src="/images/process.jpg" alt={pr('alt')} fill sizes="(min-width:1216px) 1216px, 100vw" className="object-cover" />
        </div>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((x, i) => (
            <li key={x.t}>
              <span className="text-sm font-semibold text-cyan" dir="ltr">0{i + 1}</span>
              <h3 className="mt-2 font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm text-muted">{x.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <Testimonials locale={locale} />

      <section className="relative isolate mt-24 overflow-hidden">
        <Image src="/images/cta.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover object-right rtl:-scale-x-100" />
        <div className="absolute inset-0 -z-10 bg-bg/65 sm:bg-transparent sm:bg-gradient-to-r sm:from-bg/90 sm:to-transparent sm:rtl:bg-gradient-to-l" />
        <div className="wrap py-24 sm:py-32">
          <div className="max-w-xl">
            <h2 className="h2">{c('title')}</h2>
            <p className="mt-5 text-muted">{c('desc')}</p>
            <Button href="/contact" className="mt-8">{c('btn')} <Arrow /></Button>
          </div>
        </div>
      </section>
    </>
  );
}
