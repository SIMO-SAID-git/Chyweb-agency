import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getProjects, getServices } from '@/lib/content';
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
// Rendered per request, but built only from the cached content layer (Data Cache, tag 'content'): admin saves invalidate it instantly
// and there is no extra database load. Only published content is ever listed.
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects] = await Promise.all([getServices('en'), getProjects('en')]);
  const paths = ['', '/services', '/portfolio', '/about', '/pricing', '/contact', '/faq', '/privacy-policy', '/terms',
    ...services.map((s) => `/services/${s.slug}`), ...projects.map((p) => `/portfolio/${p.slug}`)];
  return paths.flatMap((p) => routing.locales.map((l) => ({
    url: `${base}/${l}${p}`,
    alternates: { languages: Object.fromEntries(routing.locales.map((x) => [x, `${base}/${x}${p}`])) },
  })));
}
