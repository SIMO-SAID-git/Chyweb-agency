import { pageMeta } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/Cards';
import { getGeneralFaqs } from '@/lib/content';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'faq' });
  const b = await getTranslations({ locale, namespace: 'faq' });
  return pageMeta(locale, '/faq', a('title'), b('title'));
}
export default async function Faq({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const f = await getTranslations('faq');
  const managed = await getGeneralFaqs(locale);
  const items = managed.length ? managed : (f.raw('items') as { q: string; a: string }[]);
  return (
    <>
      <PageHeader title={f('title')} />
      <div className="wrap max-w-3xl pt-12">
        {items.map((x) => (
          <details key={x.q} className="group border-b py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{x.q}<span aria-hidden className="text-cyan transition group-open:rotate-45">+</span></summary>
            <p className="mt-3 text-muted">{x.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
