export const services = [
  { key: 'design', slug: 'website-design', img: '/images/svc-design.jpg', related: ['concept-consulting-site'] },
  { key: 'dev', slug: 'web-development', img: '/images/svc-dev.jpg', related: ['concept-real-estate'] },
  { key: 'ecom', slug: 'ecommerce-development', img: '/images/svc-ecom.jpg', related: ['concept-skincare-store'] },
  { key: 'uiux', slug: 'ui-ux-design', img: '/images/svc-uiux.jpg', related: ['concept-fitness-club'] },
  { key: 'redesign', slug: 'website-redesign', img: '/images/svc-redesign.jpg', related: ['concept-consulting-site'] },
  { key: 'maint', slug: 'website-maintenance', img: '/images/svc-maint.jpg', related: [] },
] as const;
// Fictional concept projects (not client work). Phase 4 moves these to the database.
export const projects = [
  { slug: 'concept-skincare-store', key: 'ecom', img: '/images/pf-ecom.jpg', tech: ['Next.js', 'TypeScript', 'Tailwind CSS'] },
  { slug: 'concept-consulting-site', key: 'corporate', img: '/images/pf-corporate.jpg', tech: ['Next.js', 'TypeScript', 'CMS'] },
  { slug: 'concept-fitness-club', key: 'fitness', img: '/images/pf-fitness.jpg', tech: ['Next.js', 'Tailwind CSS'] },
  { slug: 'concept-real-estate', key: 'realestate', img: '/images/pf-realestate.jpg', tech: ['Next.js', 'Supabase'] },
] as const;
export type Testimonial = { id: string; name: string; project: string; text: Record<string, string>; rating?: number; demo?: boolean };
// Intentionally empty: only real, approved testimonials may be added (Phase 4: from Supabase).
export const testimonials: Testimonial[] = [];
export const contact = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || '',
};
