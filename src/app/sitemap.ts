import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getProjects, getServices } from '@/lib/content';
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const revalidate = 3600; // published content only; the CMS will also revalidate the 'content' tag
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects] = await Promise.all([getServices('en'), getProjects('en')]);
  const paths = ['', '/services', '/portfolio', '/about', '/pricing', '/contact', '/faq', '/privacy-policy', '/terms',
    ...services.map((s) => `/services/${s.slug}`), ...projects.map((p) => `/portfolio/${p.slug}`)];
  return paths.flatMap((p) => routing.locales.map((l) => ({
    url: `${base}/${l}${p}`,
    alternates: { languages: Object.fromEntries(routing.locales.map((x) => [x, `${base}/${x}${p}`])) },
  })));
}
