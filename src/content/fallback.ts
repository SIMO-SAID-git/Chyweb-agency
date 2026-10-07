// DEVELOPMENT-ONLY fallback built from the original static content. src/lib/content.ts never uses it in production.
import { projects as P, services as S } from './site';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import ar from '../../messages/ar.json';
import type { Project, Service } from './types';
const M: Record<string, any> = { en, fr, ar };
export const staticServices = (loc: string): Service[] => S.map((s) => {
  const m = M[loc] ?? en; const i = m.services.items[s.key]; const v = m.svc[s.key];
  return { key: s.key, slug: s.slug, title: i.t, description: i.d, lead: v.lead, features: v.inc, faqs: [{ q: v.q, a: v.a }], image: s.img, alt: i.alt, relatedSlugs: [...s.related] };
});
export const staticProjects = (loc: string): Project[] => P.map((p) => {
  const m = M[loc] ?? en; const i = m.portfolio.items[p.key];
  return { slug: p.slug, category: p.key, categoryLabel: i.c, title: i.t, description: i.d, image: p.img, alt: i.alt, tech: [...p.tech], isConcept: true };
});
