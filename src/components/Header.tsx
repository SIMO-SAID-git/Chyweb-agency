'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import Wordmark from './Wordmark';
import Button from './Button';
const items = [['/', 'home'], ['/services', 'services'], ['/portfolio', 'portfolio'], ['/about', 'about'], ['/pricing', 'pricing'], ['/contact', 'contact']] as const;
const langs = [['en', 'EN'], ['fr', 'FR'], ['ar', 'عربي']] as const;
export default function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const nav = (cls: string) => items.map(([h, k]) => {
    const on = h === '/' ? pathname === '/' : pathname.startsWith(h);
    return <Link key={k} href={h} onClick={close} aria-current={on ? 'page' : undefined} className={`${cls} transition hover:text-cyan ${on ? 'text-cyan' : 'text-white/80'}`}>{t(k)}</Link>;
  });
  const lang = (
    <div role="group" aria-label={t('lang')} className="flex items-center gap-1 text-xs">
      {langs.map(([l, label]) => (
        <Link key={l} href={pathname} locale={l} onClick={close} hrefLang={l} aria-current={l === locale ? 'true' : undefined}
          className={`rounded-md px-2 py-1 ${l === locale ? 'bg-white/10 text-cyan' : 'text-muted hover:text-white'}`}>{label}</Link>
      ))}
    </div>
  );
  return (
    <header className="sticky top-0 z-50 border-b bg-bg/85 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="Chyweb" onClick={close}><Wordmark /></Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm lg:flex">{nav('py-2')}</nav>
        <div className="hidden items-center gap-4 lg:flex">{lang}<Button href="/contact" className="!py-2">{t('cta')}</Button></div>
        <button type="button" className="rounded-md p-2 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">{t('menu')}</span>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>{open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 7h18M3 12h18M3 17h18" />}</svg>
        </button>
      </div>
      <div id="mobile-nav" hidden={!open} className="border-t bg-navy lg:hidden">
        <nav aria-label="Mobile" className="wrap flex flex-col py-4">{nav('py-3 text-lg')}
          <div className="mt-3 flex items-center justify-between border-t pt-4">{lang}<Button href="/contact" onClick={close}>{t('cta')}</Button></div>
        </nav>
      </div>
    </header>
  );
}
