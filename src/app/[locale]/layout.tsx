import type { Metadata } from 'next';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { pageMeta } from '@/lib/seo';
import { contact } from '@/content/site';
import '../globals.css';

type Props = { children: React.ReactNode; params: { locale: string } };
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }
export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return { ...pageMeta(locale, '', t('title'), t('desc')), metadataBase: new URL(base), title: { default: t('title'), template: '%s · Chyweb' } };
}
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const orgLd = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Chyweb Digital Agency', url: base, logo: `${base}/brand/icon-cyan.png`,
  ...(contact.email && { email: contact.email }), ...(contact.phone && { telephone: contact.phone }) };
export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  // Send the browser ONLY the namespaces client components use (header, form, filters). Business content comes from Supabase and
  // must not ship in a static bundle (otherwise unpublished items' old titles would still be visible in the page payload).
  const all = (await getMessages()) as Record<string, AbstractIntlMessages>;
  const { items: _projectItems, ...portfolio } = all.portfolio; void _projectItems;
  const messages: AbstractIntlMessages = { nav: all.nav, form: all.form, services: { items: Object.fromEntries(Object.entries(all.services.items as Record<string, Record<string, string>>).map(([k, v]) => [k, { t: v.t }])) }, portfolio, content: all.content };
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
          <Header />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
