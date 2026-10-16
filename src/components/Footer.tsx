import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Wordmark from './Wordmark';
import { contact } from '@/content/site';
export default function Footer() {
  const t = useTranslations('footer');
  const n = useTranslations('nav');
  return (
    <footer className="mt-24 border-t bg-navy">
      <div className="wrap grid gap-10 py-14 md:grid-cols-3">
        <div><Wordmark /><p className="mt-4 max-w-xs text-sm text-muted">{t('desc')}</p></div>
        <nav aria-label={t('explore')} className="flex flex-col gap-2 text-sm text-muted">
          <span className="eyebrow mb-2">{t('explore')}</span>
          {(['services', 'portfolio', 'about', 'pricing', 'contact'] as const).map((k) => <Link key={k} href={`/${k}`} className="hover:text-cyan">{n(k)}</Link>)}
          <Link href="/faq" className="hover:text-cyan">FAQ</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <span className="eyebrow mb-2">{n('contact')}</span>
          {contact.phone && <a href={`tel:${contact.phone}`} dir="ltr" className="hover:text-cyan">{contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`} className="hover:text-cyan">{contact.email}</a>}
          {contact.whatsapp && <a href={contact.whatsapp} className="hover:text-cyan" rel="noopener noreferrer" target="_blank">WhatsApp</a>}
          <Link href="/privacy-policy" className="hover:text-cyan">{t('privacy')}</Link>
          <Link href="/terms" className="hover:text-cyan">{t('terms')}</Link>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted">© {new Date().getFullYear()} Chyweb Digital Agency. {t('rights')}</div>
    </footer>
  );
}
