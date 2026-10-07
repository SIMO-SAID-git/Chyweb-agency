// View models used by the public pages. Built from Supabase rows (src/lib/content.ts) already resolved to one locale.
export type Service = { key: string | null; slug: string; title: string; description: string; lead: string; features: string[]; faqs: { q: string; a: string }[]; image: string; alt: string; relatedSlugs: string[] };
export type Project = { slug: string; category: string; categoryLabel: string; title: string; description: string; image: string; alt: string; tech: string[]; isConcept: boolean };
export type PublicTestimonial = { id: string; name: string; role: string; text: string; lang: string; rating?: number; demo: boolean };
