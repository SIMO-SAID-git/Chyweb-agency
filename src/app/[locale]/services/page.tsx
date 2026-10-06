import { pageMeta } from '@/lib/seo';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Button, { Arrow } from '@/components/Button';
import { PageHeader } from '@/components/Cards';
import { services } from '@/content/site';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'nav' });
  const b = await getTranslations({ locale, namespace: 'services' });
  return pageMeta(locale, '/services', a('services'), b('desc'));
}
export default async function Services({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const s = await getTranslations('services');
  return (
    <>
      <PageHeader eyebrow={s('eyebrow')} title={s('title')} desc={s('desc')} />
      <div className="wrap space-y-20 pt-20">
        {services.map((x, i) => (
          <article key={x.key} id={x.key} className="grid items-center gap-10 md:grid-cols-2">
            <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border ${i % 2 ? 'md:order-2' : ''}`}>
              <Image src={x.img} alt={s(`items.${x.key}.alt`)} fill sizes="(min-width:768px) 560px, 100vw" className="object-cover" />
            </div>
            <div>
              <h2 className="h2">{s(`items.${x.key}.t`)}</h2>
              <p className="mt-4 text-lg text-muted">{s(`items.${x.key}.d`)}</p>
              <Button href={`/services/${x.slug}`} className="mt-7">{s('more')} <Arrow /></Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
