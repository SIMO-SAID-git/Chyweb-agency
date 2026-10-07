import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { getTestimonials } from '@/lib/content';
export default async function Testimonials({ locale }: { locale: string }) {
  const t = await getTranslations('testimonials');
  const items = await getTestimonials(locale);
  return (
    <section className="relative isolate mt-24 overflow-hidden border-y">
      <Image src="/images/testimonials.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-40" />
      <div className="absolute inset-0 -z-10 bg-navy/75" />
      <div className="wrap py-20">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h2 className="h2 mt-3">{t('title')}</h2>
        {items.length === 0 ? (
          <p className="mt-10 max-w-2xl rounded-2xl border border-dashed bg-navy/70 p-8 text-muted" role="note">{t('empty')}</p>
        ) : (
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((x) => (
              <li key={x.id} className="rounded-2xl border bg-navy/80 p-6">
                {x.demo && <span className="mb-3 inline-block rounded-full border px-3 py-1 text-xs text-cyan">{t('demo')}</span>}
                {x.rating && <p aria-label={`${x.rating}/5`} className="text-cyan">{'★'.repeat(x.rating)}</p>}
                <blockquote lang={x.lang} dir={x.lang === 'ar' ? 'rtl' : 'ltr'} className="mt-2 text-muted">{x.text}</blockquote>
                <p className="mt-4 font-semibold">{x.name}</p>{x.role && <p className="text-sm text-muted">{x.role}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
