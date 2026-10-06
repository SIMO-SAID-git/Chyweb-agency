import { pageMeta } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/Cards';
import ProjectGrid from '@/components/ProjectGrid';
import { projects } from '@/content/site';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'nav' });
  const b = await getTranslations({ locale, namespace: 'portfolio' });
  return pageMeta(locale, '/portfolio', a('portfolio'), b('intro'));
}
export default async function Portfolio({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const p = await getTranslations('portfolio');
  return (
    <>
      <PageHeader eyebrow={p('eyebrow')} title={p('title')} desc={p('intro')} />
      <div className="wrap pt-16"><ProjectGrid items={projects} /></div>
    </>
  );
}
