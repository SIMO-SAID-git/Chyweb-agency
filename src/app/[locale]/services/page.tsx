import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Button, { Arrow } from '@/components/Button';
import { PageHeader } from '@/components/Cards';
import { pageMeta } from '@/lib/seo';
import { getServices } from '@/lib/content';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'nav' });
  const b = await getTranslations({ locale, namespace: 'services' });
  return pageMeta(locale, '/services', a('services'), b('desc'));
}
export default async function Services({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const s = await getTranslations('services');
  const e = await getTranslations('content');
  const services = await getServices(locale);
  return (
    <>
      <PageHeader eyebrow={s('eyebrow')} title={s('title')} desc={s('desc')} />
      <div className="wrap space-y-20 pt-20">
        {services.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-muted" role="note">{e('empty')}</p>}
        {services.map((x, i) => (
          <article key={x.slug} id={x.slug} className="grid items-center gap-10 md:grid-cols-2">
            {x.image && <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border ${i % 2 ? 'md:order-2' : ''}`}>
              <Image src={x.image} alt={x.alt} fill sizes="(min-width:768px) 560px, 100vw" className="object-cover" />
            </div>}
            <div>
              <h2 className="h2">{x.title}</h2>
              <p className="mt-4 text-lg text-muted">{x.description}</p>
              <Button href={`/services/${x.slug}`} className="mt-7">{s('more')} <Arrow /></Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
