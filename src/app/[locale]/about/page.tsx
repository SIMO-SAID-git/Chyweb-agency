import { pageMeta } from '@/lib/seo';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Button, { Arrow } from '@/components/Button';
import { PageHeader } from '@/components/Cards';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'nav' });
  const b = await getTranslations({ locale, namespace: 'about' });
  return pageMeta(locale, '/about', a('about'), b('desc'));
}
export default async function About({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const a = await getTranslations('about');
  const c = await getTranslations('cta');
  const blocks = a.raw('blocks') as { t: string; d: string }[];
  return (
    <>
      <PageHeader title={a('title')} desc={a('desc')} />
      <div className="wrap pt-16">
        <div className="relative aspect-video overflow-hidden rounded-2xl border">
          <Image src="/images/about.jpg" alt={a('alt')} fill priority sizes="(min-width:1216px) 1216px, 100vw" className="object-cover" />
        </div>
        <div className="mt-16 grid items-center gap-12 md:grid-cols-[1fr_2fr]">
          <Image src="/images/monogram.jpg" alt={a('mono')} width={1024} height={1024} sizes="(min-width:768px) 320px, 70vw" className="mx-auto w-full max-w-xs rounded-3xl" />
          <div className="space-y-8">
            {blocks.map((b) => <div key={b.t}><h2 className="text-xl font-semibold">{b.t}</h2><p className="mt-2 text-muted">{b.d}</p></div>)}
            <p className="text-sm text-muted/70">{a('draft')}</p>
          </div>
        </div>
        <Button href="/contact" className="mt-12">{c('btn')} <Arrow /></Button>
      </div>
    </>
  );
}
