import { pageMeta } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Button, { Arrow } from '@/components/Button';
import { PageHeader } from '@/components/Cards';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'nav' });
  const b = await getTranslations({ locale, namespace: 'pricing' });
  return pageMeta(locale, '/pricing', a('pricing'), b('desc'));
}
export default async function Pricing({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const p = await getTranslations('pricing');
  return (
    <>
      <PageHeader title={p('title')} desc={p('desc')} bg="/images/pricing.jpg" />
      <div className="wrap pt-16">
        {/* Phase 2: render published pricing_packages from Supabase here. No prices are hardcoded. */}
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted">{p('empty')}</div>
        <div className="mt-8 text-center"><Button href="/contact">{p('cta')} <Arrow /></Button></div>
      </div>
    </>
  );
}
