import { pageMeta } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/Cards';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'legal' });
  const b = await getTranslations({ locale, namespace: 'legal' });
  return pageMeta(locale, '/terms', a('terms'), b('notice'));
}
export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const l = await getTranslations('legal');
  return (
    <>
      <PageHeader title={l('terms')} />
      <div className="wrap max-w-3xl pt-12"><p className="rounded-xl border border-dashed p-6 text-muted" role="note">{l('notice')}</p></div>
    </>
  );
}
