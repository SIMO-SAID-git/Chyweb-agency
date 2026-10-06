import { pageMeta } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/Cards';
import InquiryForm from '@/components/InquiryForm';
import { contact } from '@/content/site';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const a = await getTranslations({ locale, namespace: 'nav' });
  const b = await getTranslations({ locale, namespace: 'contact' });
  return pageMeta(locale, '/contact', a('contact'), b('desc'));
}
export default async function Contact({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const c = await getTranslations('contact');
  const btn = 'inline-flex rounded-full px-6 py-3 text-sm font-semibold transition';
  return (
    <>
      <PageHeader title={c('title')} desc={c('desc')} />
      <div className="wrap pt-16">
        <div className="max-w-2xl"><InquiryForm /></div>
        <div className="mt-14 flex flex-wrap gap-3">
          {contact.phone && <a href={`tel:${contact.phone}`} className={`${btn} border border-white/25 hover:border-cyan hover:text-cyan`}>{c('phone')} · <span dir="ltr">{contact.phone}</span></a>}
          {contact.email && <a href={`mailto:${contact.email}`} className={`${btn} bg-cyan text-navy hover:bg-cyan-bright`}>{c('email')}</a>}
          {contact.whatsapp && <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn} border border-white/25 hover:border-cyan hover:text-cyan`}>{c('wa')}</a>}
        </div>
        {!contact.email && !contact.whatsapp && !contact.phone && <p className="max-w-xl rounded-xl border border-dashed p-6 text-muted" role="note">{c('none')}</p>}
      </div>
    </>
  );
}
