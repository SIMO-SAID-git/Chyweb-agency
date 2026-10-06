import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { projects, services } from '@/content/site';
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const paths = ['', '/services', '/portfolio', '/about', '/pricing', '/contact', '/faq', '/privacy-policy', '/terms',
  ...services.map((s) => `/services/${s.slug}`), ...projects.map((p) => `/portfolio/${p.slug}`)];
export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((p) => routing.locales.map((l) => ({
    url: `${base}/${l}${p}`,
    alternates: { languages: Object.fromEntries(routing.locales.map((x) => [x, `${base}/${x}${p}`])) },
  })));
}
