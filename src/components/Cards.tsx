import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Arrow } from './Button';
import type { services, projects } from '@/content/site';
const sizes = '(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw';
export function ServiceCard({ s }: { s: (typeof services)[number] }) {
  const t = useTranslations('services');
  return (
    <article className="card flex flex-col">
      <div className="relative aspect-[4/3]"><Image src={s.img} alt={t(`items.${s.key}.alt`)} fill sizes={sizes} className="object-cover" /></div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold">{t(`items.${s.key}.t`)}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t(`items.${s.key}.d`)}</p>
        <Link href={`/services/${s.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan">{t('more')} <Arrow /></Link>
      </div>
    </article>
  );
}
export function ProjectCard({ p }: { p: (typeof projects)[number] }) {
  const t = useTranslations('portfolio');
  return (
    <Link href={`/portfolio/${p.slug}`} className="card group block">
      <div className="relative aspect-video">
        <Image src={p.img} alt={t(`items.${p.key}.alt`)} fill sizes="(min-width:768px) 600px, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute start-3 top-3 rounded-full bg-navy/90 px-3 py-1 text-xs font-medium text-cyan">{t('concept')}</span>
      </div>
      <div className="p-6">
        <p className="eyebrow">{t(`items.${p.key}.c`)}</p>
        <h3 className="mt-2 text-xl font-semibold">{t(`items.${p.key}.t`)}</h3>
        <p className="mt-2 text-sm text-muted">{t(`items.${p.key}.d`)}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan">{t('view')} <Arrow /></span>
      </div>
    </Link>
  );
}
export function PageHeader({ eyebrow, title, desc, bg }: { eyebrow?: string; title: string; desc?: string; bg?: string }) {
  return (
    <section className="relative isolate overflow-hidden border-b bg-navy">
      {bg && <><Image src={bg} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-50" /><div className="absolute inset-0 -z-10 bg-navy/70" /></>}
      <div className="wrap py-20 sm:py-28">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        {desc && <p className="mt-5 max-w-2xl text-lg text-muted">{desc}</p>}
      </div>
    </section>
  );
}
