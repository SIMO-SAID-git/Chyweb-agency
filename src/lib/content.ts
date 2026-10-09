// Public content layer: reads PUBLISHED content from Supabase with the public (anon) key. Row Level Security is the
// boundary: drafts / unapproved rows are never returned to this key. Server-only (do not import from client components).
//
// Caching: every request is cached by Next.js (Data Cache) for CONTENT_REVALIDATE_SECONDS (default 60) and tagged
// 'content' (+ 'services' | 'projects' | 'testimonials'). Pages built from it are regenerated in the background after that
// window, and the admin CMS (Stage 3) will call revalidateTag('content') after each save for instant updates.
//
// Failure policy: PRODUCTION never falls back to static data. A failed read is logged and re-thrown (build fails / the last
// good cached page keeps being served). Static fallback exists in development only, with loud console warnings.
import { authHeaders } from './supabase';
import { staticProjects, staticServices } from '@/content/fallback';
import type { Project, PublicTestimonial, Service } from '@/content/types';

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const REVALIDATE = Number(process.env.CONTENT_REVALIDATE_SECONDS || 60);
const isProd = process.env.NODE_ENV === 'production';
type Row = Record<string, any>;

// Translation policy: the requested language if it has a non-empty value, otherwise English. Never another language.
const pick = (v: Row | null | undefined, loc: string): string => (v?.[loc] || v?.en || '') as string;
const list = (v: Row | null | undefined, loc: string): string[] => (v?.[loc]?.length ? v[loc] : v?.en) ?? [];
export const mediaUrl = (p?: string | null) => (!p ? '' : p.startsWith('/') || /^https?:\/\//.test(p) ? p : `${URL_}/storage/v1/object/public/media/${p}`);

async function rest(path: string, tag: string): Promise<Row[] | null> {
  if (!URL_ || !KEY) {
    if (isProd) { console.error('[content] FATAL: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set'); throw new Error('Content source is not configured'); }
    console.warn('[content] DEV FALLBACK: Supabase is not configured, using static content'); return null;
  }
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { ...authHeaders(KEY), Accept: 'application/json' }, next: { revalidate: REVALIDATE, tags: ['content', tag] }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as Row[];
  } catch (e) {
    console.error(`[content] Supabase read failed (${path.split('?')[0]}): ${(e as Error).message}`);
    if (isProd) throw e;
    console.warn('[content] DEV FALLBACK: using static content'); return null;
  }
}

const SERVICES_Q = 'services?select=key,slug,title,description,lead,features,image,image_alt,sort_order,faqs(question,answer,sort_order),service_projects(sort_order,projects(slug))&order=sort_order.asc&faqs.order=sort_order.asc&service_projects.order=sort_order.asc';
export async function getServices(loc: string): Promise<Service[]> {
  const rows = await rest(SERVICES_Q, 'services');
  if (!rows) return staticServices(loc);
  return rows.map((r) => ({
    key: r.key, slug: r.slug, title: pick(r.title, loc), description: pick(r.description, loc), lead: pick(r.lead, loc) || pick(r.description, loc),
    features: list(r.features, loc), faqs: (r.faqs ?? []).map((f: Row) => ({ q: pick(f.question, loc), a: pick(f.answer, loc) })),
    image: mediaUrl(r.image), alt: pick(r.image_alt, loc) || pick(r.title, loc),
    relatedSlugs: (r.service_projects ?? []).map((x: Row) => x.projects?.slug).filter(Boolean),
  }));
}
export const getService = async (slug: string, loc: string) => (await getServices(loc)).find((s) => s.slug === slug) ?? null;

const PROJECTS_Q = 'projects?select=slug,category,category_label,title,description,thumbnail,thumbnail_alt,technologies,is_concept,sort_order&order=sort_order.asc';
export async function getProjects(loc: string): Promise<Project[]> {
  const rows = await rest(PROJECTS_Q, 'projects');
  if (!rows) return staticProjects(loc);
  return rows.map((r) => ({
    slug: r.slug, category: r.category, categoryLabel: pick(r.category_label, loc), title: pick(r.title, loc), description: pick(r.description, loc),
    image: mediaUrl(r.thumbnail), alt: pick(r.thumbnail_alt, loc) || pick(r.title, loc), tech: r.technologies ?? [], isConcept: r.is_concept !== false,
  }));
}
export const getProject = async (slug: string, loc: string) => (await getProjects(loc)).find((p) => p.slug === slug) ?? null;

// RLS returns only approved AND published testimonials. A quote is shown in the language it was written in (never machine-translated).
export async function getTestimonials(loc: string): Promise<PublicTestimonial[]> {
  const rows = await rest('testimonials?select=id,client_name,client_role,feedback,rating,is_demo,sort_order&order=sort_order.asc', 'testimonials');
  if (!rows) return [];
  return rows.flatMap((r) => {
    const lang = r.feedback?.[loc] ? loc : r.feedback?.en ? 'en' : Object.keys(r.feedback ?? {}).find((k) => r.feedback[k]);
    return lang ? [{ id: r.id, name: r.client_name, role: r.client_role ?? '', text: r.feedback[lang], lang, rating: r.rating ?? undefined, demo: r.is_demo === true }] : [];
  });
}

// General FAQs (no service) managed in the CMS. If none are published the FAQ page shows its original default questions.
export async function getGeneralFaqs(loc: string): Promise<{ q: string; a: string }[]> {
  const rows = await rest('faqs?select=question,answer,sort_order&service_id=is.null&order=sort_order.asc', 'faqs');
  return (rows ?? []).map((r) => ({ q: pick(r.question, loc), a: pick(r.answer, loc) }));
}
