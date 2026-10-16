import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
export function pageMeta(locale: string, path: string, title: string, description: string): Metadata {
  const url = `/${locale}${path}`;
  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`]));
  languages['x-default'] = `/en${path}`;
  const images = ['/images/hero.jpg'];
  return {
    title, description,
    alternates: { canonical: url, languages },
    openGraph: { title, description, url, siteName: 'Chyweb Digital Agency', locale, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
